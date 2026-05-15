import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feedback (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.aiFeedback.deleteMany();
    await prisma.sessionRound.deleteMany();
    await prisma.sessionSet.deleteMany();
    await prisma.session.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.templateExercise.deleteMany();
    await prisma.templateRound.deleteMany();
    await prisma.templateDay.deleteMany();
    await prisma.workoutTemplate.deleteMany();
    await prisma.user.deleteMany();

    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test' });
    accessToken = res.body.accessToken;
  });

  afterAll(() => app.close());

  it('GET /feedback — returns empty array when no feedback yet', async () => {
    const res = await request(app.getHttpServer())
      .get('/feedback')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('POST /feedback/generate — returns 429 when called twice in same day', async () => {
    const user = await prisma.user.findFirst();
    await prisma.aiFeedback.create({
      data: {
        userId: user.id,
        content: 'Good work',
        periodStart: new Date(),
        periodEnd: new Date(),
        contextSnapshot: {},
      },
    });

    await request(app.getHttpServer())
      .post('/feedback/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(429);
  });
});
