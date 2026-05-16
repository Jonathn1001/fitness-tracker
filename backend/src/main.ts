import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableShutdownHooks();

  const origins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  });

  // Render health check — must respond before global guards/pipes run
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: { json: (v: unknown) => void }) => res.json({ status: 'ok' }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  app.get(Logger).log(`HTTP server listening on :${port}`, 'Bootstrap');
}
bootstrap();
