import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Templates (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let templateDayId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.templateExercise.deleteMany();
    await prisma.templateRound.deleteMany();
    await prisma.templateDay.deleteMany();
    await prisma.workoutTemplate.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    const res = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'Password1!',
      name: 'Test',
    });
    accessToken = res.body.accessToken;

    const plan = await request(app.getHttpServer())
      .get('/templates')
      .set('Authorization', `Bearer ${accessToken}`);
    templateDayId = plan.body.days[0].id; // Monday
  });

  afterAll(() => app.close());

  it('GET /templates — returns 7-day weekly plan for authenticated user', async () => {
    const res = await request(app.getHttpServer())
      .get('/templates')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.days).toHaveLength(7);
    expect(res.body.days[0].dayOfWeek).toBe('mon');
    expect(res.body.days[0].workoutType).toBe('gym');
    expect(res.body.days[5].workoutType).toBe('kickboxing'); // Saturday
  });

  it('GET /templates — returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/templates').expect(401);
  });

  it('PATCH /templates/days/:dayId — replaces exercises for a gym day', async () => {
    const exercises = await prisma.exerciseLibrary.findMany({ take: 2 });

    const res = await request(app.getHttpServer())
      .patch(`/templates/days/${templateDayId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exercises: [
          {
            exerciseId: exercises[0].id,
            defaultSets: 4,
            defaultReps: 8,
            defaultWeightKg: 80,
            order: 1,
          },
          {
            exerciseId: exercises[1].id,
            defaultSets: 3,
            defaultReps: 12,
            defaultWeightKg: 60,
            order: 2,
          },
        ],
      })
      .expect(200);

    expect(res.body.exercises).toHaveLength(2);
  });
});
