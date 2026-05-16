import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRoundDto } from './dto/upsert-round.dto';

@Injectable()
export class RoundsService {
  constructor(private prisma: PrismaService) {}

  async upsertRounds(
    userId: string,
    sessionId: string,
    dtos: UpsertRoundDto[],
  ) {
    await this.assertOwnership(userId, sessionId);
    if (!dtos.length) return [];

    const keys = dtos.map((d) => d.idempotencyKey);

    return this.prisma.$transaction(async (tx) => {
      await tx.sessionRound.createMany({
        data: dtos.map((dto) => ({
          sessionId,
          roundTypeId: dto.roundTypeId,
          roundNumber: dto.roundNumber,
          completed: dto.completed,
          qualityRating: dto.qualityRating ?? null,
          notes: dto.notes ?? null,
          idempotencyKey: dto.idempotencyKey,
        })),
        skipDuplicates: true,
      });
      return tx.sessionRound.findMany({
        where: { idempotencyKey: { in: keys } },
      });
    });
  }

  async updateRound(
    userId: string,
    sessionId: string,
    roundId: string,
    data: Partial<{ completed: boolean; qualityRating: number; notes: string }>,
  ) {
    await this.assertOwnership(userId, sessionId);
    const result = await this.prisma.sessionRound.updateMany({
      where: { id: roundId, sessionId },
      data,
    });
    if (result.count === 0) throw new NotFoundException();
    return this.prisma.sessionRound.findUnique({ where: { id: roundId } });
  }

  private async assertOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) throw new NotFoundException();
  }
}
