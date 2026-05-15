import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTemplateDayDto } from './dto/update-template-day.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async getWeeklyPlan(userId: string) {
    const template = await this.prisma.workoutTemplate.findFirst({
      where: { userId, isActive: true },
      include: {
        templateDays: {
          orderBy: { dayOfWeek: 'asc' },
          include: {
            templateExercises: {
              orderBy: { order: 'asc' },
              include: { exercise: true },
            },
            templateRounds: {
              orderBy: { roundNumber: 'asc' },
              include: { roundType: true },
            },
          },
        },
      },
    });

    if (!template) throw new NotFoundException('No active template found');
    return { id: template.id, name: template.name, days: template.templateDays };
  }

  async updateDay(userId: string, dayId: string, dto: UpdateTemplateDayDto) {
    const day = await this.prisma.templateDay.findFirst({
      where: { id: dayId, template: { userId } },
    });
    if (!day) throw new NotFoundException('Template day not found');

    if (dto.exercises) {
      await this.prisma.templateExercise.deleteMany({ where: { templateDayId: dayId } });
      await this.prisma.templateExercise.createMany({
        data: dto.exercises.map((e) => ({ templateDayId: dayId, ...e })),
      });
    }

    if (dto.rounds) {
      await this.prisma.templateRound.deleteMany({ where: { templateDayId: dayId } });
      await this.prisma.templateRound.createMany({
        data: dto.rounds.map((r) => ({ templateDayId: dayId, roundTypeId: r.roundTypeId, roundNumber: r.roundNumber })),
      });
    }

    const result = await this.prisma.templateDay.findUnique({
      where: { id: dayId },
      include: {
        templateExercises: { include: { exercise: true } },
        templateRounds: { include: { roundType: true } },
      },
    });
    if (!result) return result;
    const { templateExercises, templateRounds, ...rest } = result;
    return { ...rest, exercises: templateExercises, rounds: templateRounds };
  }
}
