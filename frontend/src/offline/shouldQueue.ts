const QUEUEABLE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

interface QueueableConfig {
  method?: string
  url?: string
  __isReplay?: boolean
}

/**
 * A request belongs in the offline queue only when the network never answered
 * *and* the request would change server state.
 *
 * A 4xx/5xx means the server did answer — that is a real error the caller has
 * to see, not a connectivity problem to paper over. A failed replay is skipped
 * too: re-queueing it would append a fresh copy on every drain and the queue
 * would grow without bound.
 */
export function shouldQueue(error: {
  response?: unknown
  config?: QueueableConfig
}): boolean {
  const config = error.config
  if (!config) return false
  if (error.response) return false
  if (config.__isReplay) return false

  const method = config.method?.toLowerCase()
  return !!method && QUEUEABLE_METHODS.has(method)
}
