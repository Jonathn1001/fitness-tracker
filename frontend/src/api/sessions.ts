import { apiClient } from './client'
import type {
  Paginated,
  SessionDetail,
  SessionLite,
  SessionRound,
  SessionSet,
  SessionStatus,
  WarmupType,
} from './types'

export const createSession = (body: {
  templateDayId?: string
  date: string
  warmupType?: WarmupType
  warmupDurationMin?: number
  notes?: string
  idempotencyKey: string
}) => apiClient.post<SessionDetail>('/sessions', body).then((r) => r.data)

export const listSessions = (params?: {
  from?: string
  to?: string
  status?: SessionStatus
  page?: number
  limit?: number
}) =>
  apiClient
    .get<Paginated<SessionLite>>('/sessions', { params })
    .then((r) => r.data)

export const getSession = (id: string) =>
  apiClient.get<SessionDetail>(`/sessions/${id}`).then((r) => r.data)

export const updateSession = (
  id: string,
  body: {
    warmupType?: WarmupType
    warmupDurationMin?: number
    notes?: string
  },
) => apiClient.patch<SessionDetail>(`/sessions/${id}`, body).then((r) => r.data)

export const completeSession = (id: string) =>
  apiClient.post<SessionDetail>(`/sessions/${id}/complete`).then((r) => r.data)

export const deleteSession = (id: string) =>
  apiClient.delete(`/sessions/${id}`).then((r) => r.data)

export const upsertSets = (
  sessionId: string,
  sets: Array<{
    exerciseId: string
    setNumber: number
    reps: number
    weightKg: number
    completed: boolean
    idempotencyKey: string
  }>,
) =>
  apiClient
    .put<SessionSet[]>(`/sessions/${sessionId}/sets`, sets)
    .then((r) => r.data)

export const upsertRounds = (
  sessionId: string,
  rounds: Array<{
    roundTypeId: string
    roundNumber: number
    completed: boolean
    qualityRating?: number
    notes?: string
    idempotencyKey: string
  }>,
) =>
  apiClient
    .put<SessionRound[]>(`/sessions/${sessionId}/rounds`, rounds)
    .then((r) => r.data)
