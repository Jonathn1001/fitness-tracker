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
      update: jest.Mock;
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
        update: jest.fn(),
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

  describe('update — warmup rule', () => {
    const sessionId = 's1';

    const ownedSession = (templateDayId: string | null) => ({
      id: sessionId,
      userId,
      templateDayId,
    });

    it('rejects warmup fields when the session sits on a kickboxing day', async () => {
      prisma.session.findUnique.mockResolvedValue(ownedSession('day-1'));
      prisma.templateDay.findUnique.mockResolvedValue({
        workoutType: 'kickboxing',
      });

      await expect(
        service.update(userId, sessionId, { warmupDurationMin: 8 }),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.session.update).not.toHaveBeenCalled();
    });

    it('allows warmup fields on a gym day', async () => {
      prisma.session.findUnique.mockResolvedValue(ownedSession('day-1'));
      prisma.templateDay.findUnique.mockResolvedValue({ workoutType: 'gym' });
      const updated = { id: sessionId, warmupDurationMin: 8 };
      prisma.session.update.mockResolvedValue(updated);

      await expect(
        service.update(userId, sessionId, { warmupDurationMin: 8 }),
      ).resolves.toBe(updated);
    });

    it('allows non-warmup fields on a kickboxing day without loading the day', async () => {
      prisma.session.findUnique.mockResolvedValue(ownedSession('day-1'));
      const updated = { id: sessionId, notes: 'felt strong' };
      prisma.session.update.mockResolvedValue(updated);

      await expect(
        service.update(userId, sessionId, { notes: 'felt strong' }),
      ).resolves.toBe(updated);
      expect(prisma.templateDay.findUnique).not.toHaveBeenCalled();
    });

    it('allows warmup fields on an ad-hoc session with no template day', async () => {
      prisma.session.findUnique.mockResolvedValue(ownedSession(null));
      const updated = { id: sessionId, warmupType: 'walk' };
      prisma.session.update.mockResolvedValue(updated);

      await expect(
        service.update(userId, sessionId, { warmupType: 'walk' }),
      ).resolves.toBe(updated);
      expect(prisma.templateDay.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the session belongs to another user', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: sessionId,
        userId: otherUserId,
        templateDayId: null,
      });

      await expect(
        service.update(userId, sessionId, { notes: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.session.update).not.toHaveBeenCalled();
    });
  });
});
