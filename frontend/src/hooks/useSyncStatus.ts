import { useState, useEffect } from 'react'
import { getQueueLength, QUEUE_CHANGED } from '../offline/queue'

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const n = await getQueueLength()
      if (!cancelled) setPendingCount(n)
    }
    check()

    window.addEventListener(QUEUE_CHANGED, check)
    window.addEventListener('online', check)
    return () => {
      cancelled = true
      window.removeEventListener(QUEUE_CHANGED, check)
      window.removeEventListener('online', check)
    }
  }, [])

  return pendingCount
}
