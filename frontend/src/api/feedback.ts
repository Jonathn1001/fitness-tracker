import { apiClient } from './client'
import type { FeedbackItem, Paginated } from './types'

export const generateFeedback = () =>
  apiClient.post<FeedbackItem>('/feedback/generate').then((r) => r.data)

export const listFeedback = (params?: { page?: number; limit?: number }) =>
  apiClient
    .get<Paginated<FeedbackItem>>('/feedback', { params })
    .then((r) => r.data)
