import { useQuery } from '@tanstack/react-query'
import { listFeedback } from '../api/feedback'

export function useFeedback() {
  return useQuery({
    queryKey: ['feedback'],
    queryFn: () => listFeedback(),
  })
}
