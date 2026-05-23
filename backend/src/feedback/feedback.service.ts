import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';

@Injectable()
export class FeedbackService {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
  ) {}

  async generate(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 14);

    const sessions = await this.prisma.session.findMany({
      where: { userId, status: 'completed', date: { gte: periodStart, lte: periodEnd } },
      include: {
        sessionSets: { include: { exercise: true } },
        sessionRounds: { include: { roundType: true } },
        templateDay: true,
      },
      orderBy: { date: 'asc' },
    });

    const contextSnapshot = {
      user_id: userId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date.toISOString().split('T')[0],
        workout_type: s.templateDay?.workoutType ?? 'unknown',
        template_day: s.templateDay?.dayOfWeek ?? null,
        sets: s.sessionSets.map((ss) => ({
          exercise: ss.exercise.name,
          set_number: ss.setNumber,
          reps: ss.reps,
          weight_kg: ss.weightKg,
        })),
        rounds: s.sessionRounds.map((sr) => ({
          round_type: sr.roundType.name,
          round_number: sr.roundNumber,
          completed: sr.completed,
          quality_rating: sr.qualityRating,
        })),
      })),
    };

    const content = await this.gemini.generateFeedback(contextSnapshot);

    try {
      return await this.prisma.aiFeedback.create({
        data: { userId, content, periodStart, periodEnd, contextSnapshot },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new HttpException(
          { message: 'Rate limit: 1 feedback per day', retry_after: todayEnd.toISOString() },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw err;
    }
  }

  async findAll(userId: string, page = 1, limit = 10) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiFeedback.findMany({
        where: { userId },
        select: { id: true, content: true, periodStart: true, periodEnd: true, generatedAt: true },
        orderBy: { generatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aiFeedback.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  }
}
