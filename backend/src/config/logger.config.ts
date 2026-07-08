import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';

const REDACT_PATHS = [
  'password',
  '*.password',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'apiKey',
  '*.apiKey',
  'api_secret',
  '*.api_secret',
  'api_key',
  '*.api_key',
  'secret',
  '*.secret',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
];

export function buildLoggerOptions(): Params {
  const isProd = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');

  return {
    pinoHttp: {
      level,
      base: {
        service: 'fitness-tracker-backend',
        env: process.env.NODE_ENV ?? 'development',
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]', remove: false },
      genReqId: (req, res) => {
        const incoming =
          (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
        res.setHeader('x-request-id', incoming);
        return incoming;
      },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({
          statusCode: res.statusCode,
        }),
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} → ${res.statusCode}`,
      customErrorMessage: (req, res, err) =>
        `${req.method} ${req.url} → ${res.statusCode} ${err.message}`,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/favicon.ico',
      },
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss.l',
              singleLine: true,
              ignore: 'pid,hostname,service,env,req.id',
              messageFormat: '[{service}] {msg}',
            },
          },
    },
  };
}
