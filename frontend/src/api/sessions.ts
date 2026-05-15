import { apiClient } from './client'

export const createSession = (body: {
  templateDayId?: string
  date: string
  warmupType?: 'walk' | 'run'
  warmupDurationMin?: number
  notes?: string
  idempotencyKey: string
}) => apiClient.post('/sessions', body).then((r) => r.data)

export const listSessions = (params?: {
  from?: string; to?: string; status?: string; page?: number; limit?: number
}) => apiClient.get('/sessions', { params }).then((r) => r.data)

export const getSession = (id: string) =>
  apiClient.get(`/sessions/${id}`).then((r) => r.data)

export const updateSession = (id: string, body: {
  warmupType?: string; warmupDurationMin?: number; notes?: string
}) => apiClient.patch(`/sessions/${id}`, body).then((r) => r.data)

export const completeSession = (id: string) =>
  apiClient.post(`/sessions/${id}/complete`).then((r) => r.data)

export const deleteSession = (id: string) =>
  apiClient.delete(`/sessions/${id}`).then((r) => r.data)

export const upsertSets = (sessionId: string, sets: Array<{
  exerciseId: string; setNumber: number; reps: number; weightKg: number; completed: boolean; idempotencyKey: string
}>) => apiClient.put(`/sessions/${sessionId}/sets`, sets).then((r) => r.data)

export const updateSet = (sessionId: string, setId: string, body: {
  reps?: number; weightKg?: number; completed?: boolean
}) => apiClient.patch(`/sessions/${sessionId}/sets/${setId}`, body).then((r) => r.data)

export const upsertRounds = (sessionId: string, rounds: Array<{
  roundTypeId: string; roundNumber: number; completed: boolean; qualityRating?: number; notes?: string; idempotencyKey: string
}>) => apiClient.put(`/sessions/${sessionId}/rounds`, rounds).then((r) => r.data)

export const updateRound = (sessionId: string, roundId: string, body: {
  completed?: boolean; qualityRating?: number; notes?: string
}) => apiClient.patch(`/sessions/${sessionId}/rounds/${roundId}`, body).then((r) => r.data)
