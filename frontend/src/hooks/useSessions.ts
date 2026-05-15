import { useQuery } from '@tanstack/react-query'
import { listSessions } from '../api/sessions'

export function useSessions(params?: { from?: string; to?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => listSessions(params),
  })
}
