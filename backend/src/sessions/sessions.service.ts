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

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSessionDto) {
    const existing = await this.prisma.session.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return existing;

    if (dto.templateDayId && (dto.warmupType || dto.warmupDurationMin)) {
      const day = await this.prisma.templateDay.findUnique({
        where: { id: dto.templateDayId },
      });
      if (day?.workoutType === 'kickboxing') {
        throw new BadRequestException(
          'Warmup fields are not valid for kickboxing sessions',
        );
      }
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
    await this.assertOwnership(userId, id);
    return this.prisma.session.update({ where: { id }, data: dto });
  }

  async complete(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    return this.prisma.session.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  async remove(userId: string, id: string) {
    const session = await this.assertOwnership(userId, id);
    if (session.status === 'completed') {
      throw new ConflictException('Cannot delete a completed session');
    }
    await this.prisma.session.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session || session.userId !== userId) throw new NotFoundException();
    return session;
  }
}
