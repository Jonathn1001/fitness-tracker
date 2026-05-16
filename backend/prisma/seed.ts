import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const exercises = [
  // Upper body
  { name: 'Bench Press', muscleGroup: 'Chest', category: 'upper' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', category: 'upper' },
  { name: 'Pull-Up', muscleGroup: 'Back', category: 'upper' },
  { name: 'Barbell Row', muscleGroup: 'Back', category: 'upper' },
  { name: 'Overhead Press', muscleGroup: 'Shoulders', category: 'upper' },
  // Lower body
  { name: 'Squat', muscleGroup: 'Quads', category: 'lower' },
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', category: 'lower' },
  { name: 'Leg Press', muscleGroup: 'Quads', category: 'lower' },
  { name: 'Calf Raise', muscleGroup: 'Calves', category: 'lower' },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings', category: 'lower' },
  // Arms
  { name: 'Barbell Curl', muscleGroup: 'Biceps', category: 'arms' },
  { name: 'Hammer Curl', muscleGroup: 'Biceps', category: 'arms' },
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps', category: 'arms' },
  { name: 'Skull Crusher', muscleGroup: 'Triceps', category: 'arms' },
  // Chest
  { name: 'Cable Fly', muscleGroup: 'Chest', category: 'chest' },
  { name: 'Dips', muscleGroup: 'Chest/Triceps', category: 'chest' },
  { name: 'Pec Deck', muscleGroup: 'Chest', category: 'chest' },
  // Shoulder-Back
  {
    name: 'Lateral Raise',
    muscleGroup: 'Shoulders',
    category: 'shoulder-back',
  },
  { name: 'Face Pull', muscleGroup: 'Rear Delts', category: 'shoulder-back' },
  { name: 'Deadlift', muscleGroup: 'Back', category: 'shoulder-back' },
  { name: 'Shrug', muscleGroup: 'Traps', category: 'shoulder-back' },
  // Abs
  { name: 'Plank', muscleGroup: 'Core', category: 'abs' },
  { name: 'Crunch', muscleGroup: 'Core', category: 'abs' },
  { name: 'Leg Raise', muscleGroup: 'Core', category: 'abs' },
];

const roundTypes = [
  { name: 'boxing', description: '3 rounds of boxing combinations' },
  { name: 'elbow', description: '1 round of elbow strikes' },
  { name: 'knee', description: '1 round of knee strikes' },
  { name: 'kicks', description: '4 rounds of kick combinations' },
  { name: 'combo', description: '1 round of full combinations' },
];

async function main() {
  console.log('Seeding exercise library...');
  for (const ex of exercises) {
    await prisma.exerciseLibrary.upsert({
      where: { name: ex.name },
      update: {},
      create: ex,
    });
  }

  console.log('Seeding round type library...');
  for (const rt of roundTypes) {
    await prisma.roundTypeLibrary.upsert({
      where: { name: rt.name },
      update: {},
      create: rt,
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
