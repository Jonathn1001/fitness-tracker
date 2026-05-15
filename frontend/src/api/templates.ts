import { apiClient } from './client'

export const getWeeklyPlan = () => apiClient.get('/templates').then((r) => r.data)

export const updateTemplateDay = (dayId: string, body: {
  exercises?: Array<{ exerciseId: string; defaultSets: number; defaultReps: number; defaultWeightKg: number; order: number }>
  rounds?: Array<{ roundTypeId: string; roundNumber: number }>
}) => apiClient.patch(`/templates/days/${dayId}`, body).then((r) => r.data)
