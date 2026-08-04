import type { TemplateDay } from '../api/types'

export const TYPE_COLOR: Record<string, string> = {
  gym: 'var(--accent)',
  kickboxing: 'var(--accent-2)',
}

export const TYPE_LABEL: Record<string, string> = {
  gym: 'Strength',
  kickboxing: 'Kickbox',
}

export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const DAY_LABEL: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

/**
 * Local calendar day as YYYY-MM-DD.
 *
 * Deliberately not toISOString(): that yields the UTC day, so east of UTC an
 * evening session was filed under tomorrow and the streak counter — which
 * walks backwards using local dates — could skip a day it had just recorded.
 */
export function ymd(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** Today's day-of-week key, with Monday first. */
export function todayDow() {
  return DAY_ORDER[(new Date().getDay() + 6) % 7]
}

type LabelSource = Pick<TemplateDay, 'workoutType' | 'templateExercises'>

/**
 * How a workout is named across the app: dashboard hero, week rail, history
 * rows, profile plan and session header. Four copies of this rule existed and
 * had already drifted in their fallback text.
 */
export function workoutLabel(
  day: LabelSource | null | undefined,
  fallback = 'Session',
) {
  if (!day) return fallback
  if (day.workoutType === 'kickboxing') return 'Heavy Bag'
  return muscleGroupLabel(
    (day.templateExercises ?? []).map((te) => te.exercise.muscleGroup),
  )
}

/** The first two distinct muscle groups, e.g. "Chest · Back". */
export function muscleGroupLabel(groups: Array<string | undefined>) {
  const distinct = Array.from(new Set(groups.filter(Boolean) as string[]))
  if (!distinct.length) return 'Workout'
  return distinct.slice(0, 2).join(' · ')
}
