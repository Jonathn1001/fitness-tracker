import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// The generated Prisma client uses import.meta, which ts-jest (CJS) cannot
// compile. Unit tests inject their own mock, so stub the module out.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../templates/template-seeder.service', () => ({
  TemplateSeederService: class TemplateSeederService {},
}));

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TemplateSeederService } from '../templates/template-seeder.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwt: { sign: jest.Mock; verify: jest.Mock };
  let config: { get: jest.Mock };
  let seeder: { seedForUser: jest.Mock };

  const userId = 'user-1';
  const email = 'a@b.c';
  const rawToken = 'raw-refresh-token';

  const futureDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'new-jti' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    jwt = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) =>
        key === 'JWT_SECRET' ? 'secret-a' : 'secret-b',
      ),
    };
    seeder = { seedForUser: jest.fn() };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      seeder as unknown as TemplateSeederService,
    );
  });

  const storedToken = async (overrides: Record<string, unknown> = {}) => ({
    id: 'jti-1',
    userId,
    token: await bcrypt.hash(rawToken, 4),
    revoked: false,
    expiresAt: futureDate(),
    ...overrides,
  });

  describe('refresh', () => {
    it('rotates: revokes the used token and issues a new pair', async () => {
      jwt.verify.mockReturnValue({ sub: userId, email, jti: 'jti-1' });
      prisma.refreshToken.findUnique.mockResolvedValue(await storedToken());

      const result = await service.refresh(rawToken);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'jti-1' },
        data: { revoked: true },
      });
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });

    it('revokes the whole token family when a revoked token is reused', async () => {
      jwt.verify.mockReturnValue({ sub: userId, email, jti: 'jti-1' });
      prisma.refreshToken.findUnique.mockResolvedValue(
        await storedToken({ revoked: true }),
      );

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    });

    it('rejects an expired stored token', async () => {
      jwt.verify.mockReturnValue({ sub: userId, email, jti: 'jti-1' });
      prisma.refreshToken.findUnique.mockResolvedValue(
        await storedToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a token whose signature verification fails', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('bad signature');
      });

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a payload without jti', async () => {
      jwt.verify.mockReturnValue({ sub: userId, email });

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects when the stored token belongs to a different user', async () => {
      jwt.verify.mockReturnValue({ sub: userId, email, jti: 'jti-1' });
      prisma.refreshToken.findUnique.mockResolvedValue(
        await storedToken({ userId: 'someone-else' }),
      );

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects when the raw token does not match the stored hash', async () => {
      jwt.verify.mockReturnValue({ sub: userId, email, jti: 'jti-1' });
      prisma.refreshToken.findUnique.mockResolvedValue(
        await storedToken({ token: await bcrypt.hash('other-token', 4) }),
      );

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('rejects a missing token', async () => {
      await expect(service.refresh('')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('rejects an unknown email with the same error as a bad password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email, password: 'x' }),
      ).rejects.toMatchObject({ message: 'Invalid credentials' });
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        password: await bcrypt.hash('correct-password', 4),
      });

      await expect(
        service.login({ email, password: 'wrong-password' }),
      ).rejects.toMatchObject({ message: 'Invalid credentials' });
    });

    it('returns a token pair for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        password: await bcrypt.hash('correct-password', 4),
      });

      const result = await service.login({
        email,
        password: 'correct-password',
      });

      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });
  });
});
