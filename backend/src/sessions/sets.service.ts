import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSetDto } from './dto/upsert-set.dto';

@Injectable()
export class SetsService {
  constructor(private prisma: PrismaService) {}

  async upsertSets(userId: string, sessionId: string, dtos: UpsertSetDto[]) {
    await this.assertOwnership(userId, sessionId);
    if (!dtos.length) return [];

    const keys = dtos.map((d) => d.idempotencyKey);

    return this.prisma.$transaction(async (tx) => {
      await tx.sessionSet.createMany({
        data: dtos.map((dto) => ({
          sessionId,
          exerciseId: dto.exerciseId,
          setNumber: dto.setNumber,
          reps: dto.reps,
          weightKg: dto.weightKg,
          completed: dto.completed,
          idempotencyKey: dto.idempotencyKey,
        })),
        skipDuplicates: true,
      });
      return tx.sessionSet.findMany({
        where: { idempotencyKey: { in: keys } },
      });
    });
  }

  async updateSet(
    userId: string,
    sessionId: string,
    setId: string,
    data: Partial<{ reps: number; weightKg: number; completed: boolean }>,
  ) {
    await this.assertOwnership(userId, sessionId);
    const result = await this.prisma.sessionSet.updateMany({
      where: { id: setId, sessionId },
      data,
    });
    if (result.count === 0) throw new NotFoundException();
    return this.prisma.sessionSet.findUnique({ where: { id: setId } });
  }

  private async assertOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) throw new NotFoundException();
  }
}
