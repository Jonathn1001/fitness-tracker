import { ConflictException, NotFoundException } from '@nestjs/common';

// The generated Prisma client uses import.meta, which ts-jest (CJS) cannot
// compile. Unit tests inject their own mock, so stub the module out.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: {
    session: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    templateDay: {
      findUnique: jest.Mock;
    };
  };

  const userId = 'user-a';
  const otherUserId = 'user-b';

  beforeEach(() => {
    prisma = {
      session: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      templateDay: {
        findUnique: jest.fn(),
      },
    };
    service = new SessionsService(prisma as unknown as PrismaService);
  });

  describe('create — idempotency', () => {
    const dto: CreateSessionDto = {
      date: '2026-07-08',
      idempotencyKey: 'key-1',
    };

    it('returns the existing session when the same user retries with the same key', async () => {
      const existing = { id: 's1', userId, idempotencyKey: 'key-1' };
      prisma.session.findUnique.mockResolvedValue(existing);

      await expect(service.create(userId, dto)).resolves.toBe(existing);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the key belongs to another user (no cross-user leak)', async () => {
      const foreign = {
        id: 's2',
        userId: otherUserId,
        idempotencyKey: 'key-1',
      };
      prisma.session.findUnique.mockResolvedValue(foreign);

      await expect(service.create(userId, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.session.create).not.toHaveBeenCalled();
    });
  });

  describe('create — template day ownership', () => {
    const dto: CreateSessionDto = {
      date: '2026-07-08',
      idempotencyKey: 'key-2',
      templateDayId: 'day-1',
    };

    beforeEach(() => {
      prisma.session.findUnique.mockResolvedValue(null);
    });

    it('throws NotFoundException when the template day belongs to another user', async () => {
      prisma.templateDay.findUnique.mockResolvedValue({
        id: 'day-1',
        workoutType: 'strength',
        template: { userId: otherUserId },
      });

      await expect(service.create(userId, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the template day does not exist', async () => {
      prisma.templateDay.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('rejects warmup fields on a kickboxing day', async () => {
      prisma.templateDay.findUnique.mockResolvedValue({
        id: 'day-1',
        workoutType: 'kickboxing',
        template: { userId },
      });

      await expect(
        service.create(userId, {
          ...dto,
          warmupType: 'treadmill',
        } as CreateSessionDto),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('creates the session when the template day belongs to the user', async () => {
      prisma.templateDay.findUnique.mockResolvedValue({
        id: 'day-1',
        workoutType: 'strength',
        template: { userId },
      });
      const created = { id: 's3', userId };
      prisma.session.create.mockResolvedValue(created);

      await expect(service.create(userId, dto)).resolves.toBe(created);
    });
  });
});
