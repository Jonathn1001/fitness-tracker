import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let templateDayId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.sessionRound.deleteMany();
    await prisma.sessionSet.deleteMany();
    await prisma.session.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.aiFeedback.deleteMany();
    await prisma.templateExercise.deleteMany();
    await prisma.templateRound.deleteMany();
    await prisma.templateDay.deleteMany();
    await prisma.workoutTemplate.deleteMany();
    await prisma.user.deleteMany();

    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test' });
    accessToken = res.body.accessToken;

    const plan = await request(app.getHttpServer())
      .get('/templates')
      .set('Authorization', `Bearer ${accessToken}`);
    templateDayId = plan.body.days[0].id;
  });

  afterAll(() => app.close());

  it('POST /sessions — creates in_progress session with idempotency key', async () => {
    const key = uuidv4();
    const res = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', warmupType: 'run', warmupDurationMin: 10, idempotencyKey: key })
      .expect(201);

    expect(res.body.status).toBe('in_progress');
    expect(res.body.id).toBeDefined();

    // Duplicate key returns same session
    const dup = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', warmupType: 'run', warmupDurationMin: 10, idempotencyKey: key })
      .expect(201);

    expect(dup.body.id).toBe(res.body.id);
  });

  it('POST /sessions/:id/complete — marks session completed', async () => {
    const { body: session } = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', idempotencyKey: uuidv4() });

    await request(app.getHttpServer())
      .post(`/sessions/${session.id}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/sessions/${session.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(detail.body.status).toBe('completed');
    expect(detail.body.completedAt).toBeDefined();
  });

  it('DELETE /sessions/:id — deletes in_progress session, rejects completed', async () => {
    const { body: session } = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', idempotencyKey: uuidv4() });

    await request(app.getHttpServer())
      .post(`/sessions/${session.id}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);

    await request(app.getHttpServer())
      .delete(`/sessions/${session.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('PUT /sessions/:id/sets — upserts sets, skips duplicate idempotency keys', async () => {
    const { body: session } = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', idempotencyKey: uuidv4() });

    const exercise = await prisma.exerciseLibrary.findFirst();
    const key1 = uuidv4();

    const res = await request(app.getHttpServer())
      .put(`/sessions/${session.id}/sets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        { exerciseId: exercise.id, setNumber: 1, reps: 10, weightKg: 80, completed: true, idempotencyKey: key1 },
        { exerciseId: exercise.id, setNumber: 2, reps: 8, weightKg: 82.5, completed: false, idempotencyKey: uuidv4() },
      ])
      .expect(200);

    expect(res.body).toHaveLength(2);

    // Replay with same key1 — should not duplicate
    await request(app.getHttpServer())
      .put(`/sessions/${session.id}/sets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        { exerciseId: exercise.id, setNumber: 1, reps: 10, weightKg: 80, completed: true, idempotencyKey: key1 },
      ])
      .expect(200);

    const sets = await prisma.sessionSet.findMany({ where: { sessionId: session.id } });
    expect(sets).toHaveLength(2); // not 3
  });
});
