import { apiClient } from './client'

export const signup = (data: { email: string; password: string; name: string }) =>
  apiClient.post<{ accessToken: string }>('/auth/signup', data)

export const login = (data: { email: string; password: string }) =>
  apiClient.post<{ accessToken: string }>('/auth/login', data)

export const logout = () => apiClient.post('/auth/logout')

export const refresh = () => apiClient.post<{ accessToken: string }>('/auth/refresh')
