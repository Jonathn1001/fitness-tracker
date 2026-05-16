export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type WorkoutType = 'gym' | 'kickboxing'
export type WarmupType = 'walk' | 'run'
export type SessionStatus = 'in_progress' | 'completed'

export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  category: string
  description?: string | null
}

export interface RoundType {
  id: string
  name: string
  description?: string | null
}

export interface TemplateExercise {
  id: string
  templateDayId: string
  exerciseId: string
  defaultSets: number
  defaultReps: number
  defaultWeightKg: number
  order: number
  exercise: Exercise
}

export interface TemplateRound {
  id: string
  templateDayId: string
  roundTypeId: string
  roundNumber: number
  roundType: RoundType
}

export interface TemplateDay {
  id: string
  templateId: string
  dayOfWeek: DayOfWeek
  workoutType: WorkoutType
  version: number
  templateExercises: TemplateExercise[]
  templateRounds: TemplateRound[]
}

export interface WeeklyPlan {
  id: string
  name: string
  days: TemplateDay[]
}

export interface SessionLite {
  id: string
  date: string
  status: SessionStatus
  completedAt: string | null
  templateDayId: string | null
}

export interface SessionSet {
  id: string
  sessionId: string
  exerciseId: string
  setNumber: number
  reps: number
  weightKg: number
  completed: boolean
  idempotencyKey: string
  exercise: Exercise
}

export interface SessionRound {
  id: string
  sessionId: string
  roundTypeId: string
  roundNumber: number
  completed: boolean
  qualityRating: number | null
  notes: string | null
  idempotencyKey: string
  roundType: RoundType
}

export interface SessionDetail {
  id: string
  userId: string
  templateDayId: string | null
  date: string
  warmupType: WarmupType | null
  warmupDurationMin: number | null
  notes: string | null
  status: SessionStatus
  completedAt: string | null
  idempotencyKey: string
  templateDay: TemplateDay | null
  sessionSets: SessionSet[]
  sessionRounds: SessionRound[]
}

export interface FeedbackItem {
  id: string
  content: string
  periodStart: string
  periodEnd: string
  generatedAt: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
