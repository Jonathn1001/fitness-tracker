import { useState, useEffect } from 'react'
import { getQueueLength } from '../offline/queue'

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const check = async () => setPendingCount(await getQueueLength())
    check()

    const interval = setInterval(check, 5000)
    window.addEventListener('online', check)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', check)
    }
  }, [])

  return pendingCount
}
