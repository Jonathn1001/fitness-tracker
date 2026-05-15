import { apiClient } from './client'

export const generateFeedback = () =>
  apiClient.post('/feedback/generate').then((r) => r.data)

export const listFeedback = (params?: { page?: number; limit?: number }) =>
  apiClient.get('/feedback', { params }).then((r) => r.data)
