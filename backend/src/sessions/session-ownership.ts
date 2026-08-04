import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Single definition of the per-user session scoping check.
 *
 * Sessions, sets and rounds all need it, and each previously carried its own
 * copy. Tenant isolation is not something to keep three versions of: patching
 * one and missing the others is how cross-user reads ship.
 *
 * Throws NotFoundException (not Forbidden) so a caller cannot probe which
 * session ids exist for other users.
 */
export async function assertSessionOwned(
  prisma: PrismaService,
  userId: string,
  sessionId: string,
) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) throw new NotFoundException();
  return session;
}
