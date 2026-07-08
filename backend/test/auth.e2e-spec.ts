import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/signup — creates user and returns access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'Password1!',
        name: 'Test User',
      })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /auth/signup — rejects duplicate email', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'Password1!',
      name: 'Test User',
    });

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'Password1!',
        name: 'Another',
      })
      .expect(409);
  });

  it('POST /auth/login — returns access token for valid credentials', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'Password1!',
      name: 'Test User',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Password1!' })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /auth/login — rejects wrong password', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'Password1!',
      name: 'Test User',
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
      .expect(401);
  });
});
