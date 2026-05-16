import { useQuery } from '@tanstack/react-query'
import { listSessions } from '../api/sessions'
import type { SessionStatus } from '../api/types'

export function useSessions(params?: {
  from?: string
  to?: string
  status?: SessionStatus
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => listSessions(params),
  })
}
