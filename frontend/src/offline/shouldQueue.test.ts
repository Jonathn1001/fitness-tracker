import { describe, it, expect } from 'vitest'
import { shouldQueue } from './shouldQueue'

const networkError = (method: string, extra: Record<string, unknown> = {}) => ({
  config: { method, url: '/sessions', ...extra },
})

describe('shouldQueue', () => {
  it('queues state-changing requests when the network never answered', () => {
    for (const method of ['post', 'put', 'patch', 'delete']) {
      expect(shouldQueue(networkError(method))).toBe(true)
    }
  })

  it('is case-insensitive about the method', () => {
    expect(shouldQueue(networkError('POST'))).toBe(true)
  })

  it('never queues GET — reads have nothing to replay', () => {
    expect(shouldQueue(networkError('get'))).toBe(false)
  })

  it('never queues when the server actually responded', () => {
    // 4xx/5xx are real errors the caller must see, not connectivity problems.
    expect(
      shouldQueue({
        response: { status: 500 },
        config: { method: 'post', url: '/sessions' },
      }),
    ).toBe(false)
    expect(
      shouldQueue({
        response: { status: 400 },
        config: { method: 'post', url: '/sessions' },
      }),
    ).toBe(false)
  })

  it('never re-queues a failed replay', () => {
    // Otherwise a replay that fails offline would append a fresh copy of
    // itself on every drain and the queue would grow without bound.
    expect(shouldQueue(networkError('post', { __isReplay: true }))).toBe(false)
  })

  it('returns false when there is no config to replay from', () => {
    expect(shouldQueue({})).toBe(false)
  })
})
