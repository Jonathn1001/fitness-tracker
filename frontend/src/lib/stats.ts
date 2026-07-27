import type { SessionLite } from '../api/types'
import { ymd } from './workoutMeta'

/**
 * How many recent sessions the dashboard and profile both request. One shared
 * number means one shared React Query cache entry — and no chance of the two
 * screens computing the same streak from different amounts of history.
 */
export const SESSION_WINDOW = 100

type Completable = Pick<SessionLite, 'status' | 'date' | 'completedAt'>

/** The day a session counts towards — when it was finished, else its date. */
function effectiveDay(s: Completable) {
  return new Date(s.completedAt ?? s.date)
}

export function completedSessions<T extends Completable>(sessions: T[]) {
  return sessions.filter((s) => s.status === 'completed')
}

/**
 * Consecutive days up to today with at least one completed session.
 *
 * The dashboard and the profile each had their own copy reading a different
 * number of sessions, so the same account could be shown two different
 * streaks on two screens.
 */
export function currentStreak(sessions: Completable[], today = new Date()) {
  const days = new Set(
    completedSessions(sessions).map((s) => ymd(effectiveDay(s))),
  )
  let streak = 0
  const cursor = new Date(today)
  while (days.has(ymd(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Completed sessions on or after midnight local time, `days` ago. */
export function completedInLastDays(
  sessions: Completable[],
  days: number,
  today = new Date(),
) {
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)
  return completedSessions(sessions).filter((s) => effectiveDay(s) >= cutoff)
}

/** Completed sessions since Monday of the current week. */
export function completedThisWeek(sessions: Completable[], today = new Date()) {
  const monday = new Date(today)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return completedSessions(sessions).filter((s) => effectiveDay(s) >= monday)
}
