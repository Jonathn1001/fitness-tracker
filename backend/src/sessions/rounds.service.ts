import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRoundDto } from './dto/upsert-round.dto';

@Injectable()
export class RoundsService {
  constructor(private prisma: PrismaService) {}

  async upsertRounds(userId: string, sessionId: string, dtos: UpsertRoundDto[]) {
    await this.assertOwnership(userId, sessionId);
    const results: Record<string, any>[] = [];
    for (const dto of dtos) {
      const existing = await this.prisma.sessionRound.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) { results.push(existing); continue; }

      const created = await this.prisma.sessionRound.create({
        data: {
          sessionId,
          roundTypeId: dto.roundTypeId,
          roundNumber: dto.roundNumber,
          completed: dto.completed,
          qualityRating: dto.qualityRating ?? null,
          notes: dto.notes ?? null,
          idempotencyKey: dto.idempotencyKey,
        },
      });
      results.push(created);
    }
    return results;
  }

  async updateRound(
    userId: string,
    sessionId: string,
    roundId: string,
    data: Partial<{ completed: boolean; qualityRating: number; notes: string }>,
  ) {
    await this.assertOwnership(userId, sessionId);
    return this.prisma.sessionRound.update({ where: { id: roundId }, data });
  }

  private async assertOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException();
    if (session.userId !== userId) throw new ForbiddenException();
  }
}
