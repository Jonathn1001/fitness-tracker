import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSetDto } from './dto/upsert-set.dto';

@Injectable()
export class SetsService {
  constructor(private prisma: PrismaService) {}

  async upsertSets(userId: string, sessionId: string, dtos: UpsertSetDto[]) {
    await this.assertOwnership(userId, sessionId);
    const results: Record<string, any>[] = [];
    for (const dto of dtos) {
      const existing = await this.prisma.sessionSet.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) { results.push(existing); continue; }

      const created = await this.prisma.sessionSet.create({
        data: {
          sessionId,
          exerciseId: dto.exerciseId,
          setNumber: dto.setNumber,
          reps: dto.reps,
          weightKg: dto.weightKg,
          completed: dto.completed,
          idempotencyKey: dto.idempotencyKey,
        },
      });
      results.push(created);
    }
    return results;
  }

  async updateSet(
    userId: string,
    sessionId: string,
    setId: string,
    data: Partial<{ reps: number; weightKg: number; completed: boolean }>,
  ) {
    await this.assertOwnership(userId, sessionId);
    return this.prisma.sessionSet.update({ where: { id: setId }, data });
  }

  private async assertOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException();
    if (session.userId !== userId) throw new ForbiddenException();
  }
}
