import { describe, it, expect } from 'vitest'
import {
  currentStreak,
  completedInLastDays,
  completedThisWeek,
  completedSessions,
} from './stats'
import type { SessionLite } from '../api/types'

// Wednesday, local noon — far enough from midnight that the local/UTC
// distinction cannot silently rescue a bug.
const TODAY = new Date(2026, 6, 22, 12, 0, 0)

const daysBefore = (n: number) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const session = (
  overrides: Partial<SessionLite> & { completedAt?: string | null },
): SessionLite => ({
  id: Math.random().toString(36).slice(2),
  date: daysBefore(0),
  status: 'completed',
  completedAt: null,
  templateDayId: null,
  ...overrides,
})

describe('completedSessions', () => {
  it('keeps only completed ones', () => {
    const list = [
      session({ status: 'completed' }),
      session({ status: 'in_progress' }),
    ]
    expect(completedSessions(list)).toHaveLength(1)
  })
})

describe('currentStreak', () => {
  it('is zero with no sessions', () => {
    expect(currentStreak([], TODAY)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const list = [
      session({ completedAt: daysBefore(0) }),
      session({ completedAt: daysBefore(1) }),
      session({ completedAt: daysBefore(2) }),
    ]
    expect(currentStreak(list, TODAY)).toBe(3)
  })

  it('stops at the first missed day', () => {
    const list = [
      session({ completedAt: daysBefore(0) }),
      session({ completedAt: daysBefore(1) }),
      // nothing on day 2
      session({ completedAt: daysBefore(3) }),
    ]
    expect(currentStreak(list, TODAY)).toBe(2)
  })

  it('is zero when the most recent session was not today', () => {
    expect(
      currentStreak([session({ completedAt: daysBefore(1) })], TODAY),
    ).toBe(0)
  })

  it('counts a day once even with several sessions on it', () => {
    const list = [
      session({ completedAt: daysBefore(0) }),
      session({ completedAt: daysBefore(0) }),
    ]
    expect(currentStreak(list, TODAY)).toBe(1)
  })

  it('ignores sessions that were never completed', () => {
    const list = [
      session({ status: 'in_progress', date: daysBefore(0) }),
      session({ completedAt: daysBefore(1) }),
    ]
    expect(currentStreak(list, TODAY)).toBe(0)
  })

  it('falls back to the session date when completedAt is absent', () => {
    const list = [session({ status: 'completed', date: daysBefore(0) })]
    expect(currentStreak(list, TODAY)).toBe(1)
  })
})

describe('completedInLastDays', () => {
  it('includes the boundary day and excludes older ones', () => {
    const list = [
      session({ completedAt: daysBefore(0) }),
      session({ completedAt: daysBefore(13) }),
      session({ completedAt: daysBefore(20) }),
    ]
    expect(completedInLastDays(list, 14, TODAY)).toHaveLength(2)
  })
})

describe('completedThisWeek', () => {
  it('counts from Monday, not from seven days ago', () => {
    // TODAY is a Wednesday, so Monday is 2 days back and Sunday 3 days back
    // belongs to the previous week.
    const list = [
      session({ completedAt: daysBefore(0) }),
      session({ completedAt: daysBefore(2) }),
      session({ completedAt: daysBefore(3) }),
    ]
    expect(completedThisWeek(list, TODAY)).toHaveLength(2)
  })
})
