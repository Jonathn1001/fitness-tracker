import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';

// The generated Prisma client uses import.meta, which ts-jest (CJS) cannot
// compile. Unit tests inject their own mock, so stub the module out.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../templates/template-seeder.service', () => ({
  TemplateSeederService: class TemplateSeederService {},
}));

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    signup: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  const originalEnv = { ...process.env };

  beforeEach(() => {
    authService = {
      signup: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };
    controller = new AuthController(authService as unknown as AuthService);
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const makeReq = (origin?: string): Request =>
    ({
      headers: origin ? { origin } : {},
      cookies: { refresh_token: 'raw-token' },
    }) as unknown as Request;

  describe('refresh — origin allowlist (CSRF protection)', () => {
    beforeEach(() => {
      process.env.FRONTEND_URL = 'https://app.example.com';
      authService.refresh.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
    });

    it('rejects a cross-site request from a disallowed origin', async () => {
      await expect(
        controller.refresh(
          makeReq('https://evil.example'),
          res as unknown as Response,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(authService.refresh).not.toHaveBeenCalled();
    });

    it('accepts a request from an allowed origin', async () => {
      await expect(
        controller.refresh(
          makeReq('https://app.example.com'),
          res as unknown as Response,
        ),
      ).resolves.toEqual({ accessToken: 'a' });
    });

    it('accepts a request without an Origin header (same-origin/native)', async () => {
      await expect(
        controller.refresh(makeReq(), res as unknown as Response),
      ).resolves.toEqual({ accessToken: 'a' });
    });
  });

  describe('refresh cookie flags', () => {
    beforeEach(() => {
      authService.login.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
    });

    it('uses sameSite=none + secure in production (cross-site Vercel↔Render)', async () => {
      process.env.NODE_ENV = 'production';
      await controller.login(
        { email: 'a@b.c', password: 'x' },
        res as unknown as Response,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'r',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/auth',
        }),
      );
    });

    it('uses sameSite=strict outside production', async () => {
      process.env.NODE_ENV = 'test';
      await controller.login(
        { email: 'a@b.c', password: 'x' },
        res as unknown as Response,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'r',
        expect.objectContaining({ secure: false, sameSite: 'strict' }),
      );
    });
  });
});
