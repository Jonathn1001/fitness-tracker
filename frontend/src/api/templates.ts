import { apiClient } from './client'
import type { TemplateDay, WeeklyPlan } from './types'

export const getWeeklyPlan = () =>
  apiClient.get<WeeklyPlan>('/templates').then((r) => r.data)

export const updateTemplateDay = (
  dayId: string,
  body: {
    exercises?: Array<{
      exerciseId: string
      defaultSets: number
      defaultReps: number
      defaultWeightKg: number
      order: number
    }>
    rounds?: Array<{ roundTypeId: string; roundNumber: number }>
    version?: number
  },
) =>
  apiClient
    .patch<TemplateDay>(`/templates/days/${dayId}`, body)
    .then((r) => r.data)
