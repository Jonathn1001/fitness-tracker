import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GYM_DAYS: Array<{ day: string; category: string }> = [
  { day: 'mon', category: 'upper' },
  { day: 'tue', category: 'lower' },
  { day: 'wed', category: 'arms' },
  { day: 'thu', category: 'chest' },
  { day: 'fri', category: 'shoulder-back' },
];

const KICKBOXING_ROUNDS = [
  { name: 'boxing', count: 3 },
  { name: 'elbow', count: 1 },
  { name: 'knee', count: 1 },
  { name: 'kicks', count: 4 },
  { name: 'combo', count: 1 },
];

@Injectable()
export class TemplateSeederService {
  constructor(private prisma: PrismaService) {}

  async seedForUser(userId: string) {
    const template = await this.prisma.workoutTemplate.create({
      data: { userId, name: 'My Weekly Plan' },
    });

    for (const { day, category } of GYM_DAYS) {
      const exercises = await this.prisma.exerciseLibrary.findMany({ where: { category } });

      const templateDay = await this.prisma.templateDay.create({
        data: { templateId: template.id, dayOfWeek: day as any, workoutType: 'gym' },
      });

      await this.prisma.templateExercise.createMany({
        data: exercises.map((ex, i) => ({
          templateDayId: templateDay.id,
          exerciseId: ex.id,
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 0,
          order: i + 1,
        })),
      });
    }

    const roundTypes = await this.prisma.roundTypeLibrary.findMany();
    const roundTypeMap = Object.fromEntries(roundTypes.map((r) => [r.name, r.id]));

    for (const kbDay of ['sat', 'sun']) {
      const templateDay = await this.prisma.templateDay.create({
        data: { templateId: template.id, dayOfWeek: kbDay as any, workoutType: 'kickboxing' },
      });

      let roundNumber = 1;
      const roundData: Array<{ templateDayId: string; roundTypeId: string; roundNumber: number }> = [];
      for (const { name, count } of KICKBOXING_ROUNDS) {
        for (let i = 0; i < count; i++) {
          roundData.push({
            templateDayId: templateDay.id,
            roundTypeId: roundTypeMap[name],
            roundNumber: roundNumber++,
          });
        }
      }
      await this.prisma.templateRound.createMany({ data: roundData });
    }
  }
}
