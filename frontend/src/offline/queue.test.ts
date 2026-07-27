import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  clearQueue,
  enqueue,
  getQueueLength,
  replayQueue,
  QUEUE_CHANGED,
} from './queue'

describe('offline queue', () => {
  beforeEach(async () => {
    await clearQueue()
  })

  it('starts empty', async () => {
    await expect(getQueueLength()).resolves.toBe(0)
  })

  it('stores a queued mutation and reports it as pending', async () => {
    await enqueue({
      id: 'a',
      method: 'put',
      url: '/sessions/s1/sets',
      body: [{ reps: 8 }],
    })

    await expect(getQueueLength()).resolves.toBe(1)
  })

  it('notifies listeners so the sync badge updates', async () => {
    const listener = vi.fn()
    window.addEventListener(QUEUE_CHANGED, listener)

    await enqueue({ id: 'a', method: 'post', url: '/sessions', body: {} })

    expect(listener).toHaveBeenCalled()
    window.removeEventListener(QUEUE_CHANGED, listener)
  })

  it('replays each entry with its original method, url and body', async () => {
    const body = [{ reps: 8, weightKg: 60 }]
    await enqueue({ id: 'a', method: 'put', url: '/sessions/s1/sets', body })

    const send = vi.fn().mockResolvedValue(undefined)
    await replayQueue(send)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toMatchObject({
      method: 'put',
      url: '/sessions/s1/sets',
      body,
    })
  })

  it('drains the queue once entries replay successfully', async () => {
    await enqueue({ id: 'a', method: 'post', url: '/sessions', body: {} })
    await enqueue({ id: 'b', method: 'post', url: '/sessions', body: {} })

    await replayQueue(vi.fn().mockResolvedValue(undefined))

    await expect(getQueueLength()).resolves.toBe(0)
  })

  it('replays in the order the mutations were queued', async () => {
    await enqueue({ id: 'first', method: 'post', url: '/a', body: {} })
    await enqueue({ id: 'second', method: 'post', url: '/b', body: {} })

    const seen: string[] = []
    await replayQueue(async (entry) => {
      seen.push(entry.url)
    })

    expect(seen).toEqual(['/a', '/b'])
  })

  it('runs the completion callback after a drain', async () => {
    const onComplete = vi.fn()
    await replayQueue(vi.fn().mockResolvedValue(undefined), onComplete)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
