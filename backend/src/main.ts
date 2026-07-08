import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { allowedOrigins } from './config/origins';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  // Behind Render's load balancer req.ip is the LB address without this,
  // which would put every client in one shared throttler bucket.
  app.set('trust proxy', 1);
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

  const origins = allowedOrigins();
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  });

  // Render health check — must respond before global guards/pipes run
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get(
    '/health',
    (_req: unknown, res: { json: (v: unknown) => void }) =>
      res.json({ status: 'ok' }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  app.get(Logger).log(`HTTP server listening on :${port}`, 'Bootstrap');
}
void bootstrap();
