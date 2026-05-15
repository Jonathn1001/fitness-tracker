import { useQuery } from '@tanstack/react-query'
import { getSession } from '../api/sessions'

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id),
    enabled: !!id,
  })
}
