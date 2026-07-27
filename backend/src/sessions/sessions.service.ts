import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { FindSessionsDto } from './dto/find-sessions.dto';
import { assertSessionOwned } from './session-ownership';

type WarmupFields = Pick<UpdateSessionDto, 'warmupType' | 'warmupDurationMin'>;

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSessionDto) {
    const existing = await this.prisma.session.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (existing.userId !== userId) {
        throw new ConflictException('Idempotency key already in use');
      }
      return existing;
    }

    if (dto.templateDayId) {
      const day = await this.prisma.templateDay.findUnique({
        where: { id: dto.templateDayId },
        include: { template: { select: { userId: true } } },
      });
      if (!day || day.template.userId !== userId) {
        throw new NotFoundException('Template day not found');
      }
      this.assertWarmupAllowed(day.workoutType, dto);
    }

    return this.prisma.session.create({
      data: {
        userId,
        templateDayId: dto.templateDayId ?? null,
        date: new Date(dto.date),
        warmupType: dto.warmupType ?? null,
        warmupDurationMin: dto.warmupDurationMin ?? null,
        notes: dto.notes ?? null,
        idempotencyKey: dto.idempotencyKey,
      },
    });
  }

  async findAll(userId: string, query: FindSessionsDto) {
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      userId,
      date: { gte: from, lte: to },
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where,
        select: {
          id: true,
          date: true,
          status: true,
          completedAt: true,
          templateDayId: true,
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.session.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(userId: string, id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        sessionSets: { include: { exercise: true } },
        sessionRounds: { include: { roundType: true } },
      },
    });
    if (!session || session.userId !== userId) throw new NotFoundException();
    return session;
  }

  async update(userId: string, id: string, dto: UpdateSessionDto) {
    const session = await assertSessionOwned(this.prisma, userId, id);

    // The same rule create() enforces. Without it, PATCH is a way around the
    // invariant: attach warmup minutes to a kickboxing session after the fact.
    if (session.templateDayId && this.hasWarmupFields(dto)) {
      const day = await this.prisma.templateDay.findUnique({
        where: { id: session.templateDayId },
        select: { workoutType: true },
      });
      this.assertWarmupAllowed(day?.workoutType, dto);
    }

    return this.prisma.session.update({ where: { id }, data: dto });
  }

  async complete(userId: string, id: string) {
    await assertSessionOwned(this.prisma, userId, id);
    return this.prisma.session.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  async remove(userId: string, id: string) {
    const session = await assertSessionOwned(this.prisma, userId, id);
    if (session.status === 'completed') {
      throw new ConflictException('Cannot delete a completed session');
    }
    await this.prisma.session.delete({ where: { id } });
  }

  private hasWarmupFields(dto: WarmupFields) {
    return dto.warmupType !== undefined || dto.warmupDurationMin !== undefined;
  }

  private assertWarmupAllowed(
    workoutType: string | undefined,
    dto: WarmupFields,
  ) {
    if (workoutType === 'kickboxing' && this.hasWarmupFields(dto)) {
      throw new BadRequestException(
        'Warmup fields are not valid for kickboxing sessions',
      );
    }
  }
}
