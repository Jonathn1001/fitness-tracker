import { useQuery } from '@tanstack/react-query'
import { getWeeklyPlan } from '../api/templates'

export function useWeeklyPlan() {
  return useQuery({
    queryKey: ['weeklyPlan'],
    queryFn: getWeeklyPlan,
    staleTime: 1000 * 60 * 10,
  })
}
