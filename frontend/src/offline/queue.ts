import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'

const DB_NAME = 'fitness-offline'
const STORE = 'request-queue'

export interface QueueEntry {
  id: string
  method: string
  url: string
  body: unknown
  queuedAt: number
}

// One shared connection. Opening a fresh one per operation leaked handles and
// left the database permanently blocked against upgrades and deletes.
let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('queuedAt', 'queuedAt')
      }
    },
  })
  return dbPromise
}

export const QUEUE_CHANGED = 'queue-changed'

function emitChange() {
  window.dispatchEvent(new Event(QUEUE_CHANGED))
}

export async function enqueue(entry: Omit<QueueEntry, 'queuedAt'>) {
  const db = await getDB()
  await db.put(STORE, { ...entry, queuedAt: Date.now() })
  emitChange()
}

export async function getQueueLength(): Promise<number> {
  const db = await getDB()
  return db.count(STORE)
}

/**
 * Drop every queued mutation. Called on logout: a queued write carries no
 * identity of its own, so replaying it after a different account signs in
 * would file one user's sets against another's session.
 */
export async function clearQueue() {
  const db = await getDB()
  await db.clear(STORE)
  emitChange()
}

export async function replayQueue(
  sendRequest: (entry: QueueEntry) => Promise<void>,
  onComplete?: () => void,
) {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORE, 'queuedAt')

  for (const entry of all) {
    let attempts = 0
    let success = false

    while (attempts < 5 && !success) {
      try {
        await sendRequest(entry)
        await db.delete(STORE, entry.id)
        success = true
        emitChange()
      } catch {
        attempts++
        if (attempts < 5) {
          await delay(Math.pow(2, attempts) * 1000)
        }
      }
    }

    if (!success) {
      console.warn(`Failed to sync queue entry ${entry.id} after 5 attempts`)
      window.dispatchEvent(
        new CustomEvent('sync-failed', { detail: { id: entry.id } }),
      )
    }
  }

  onComplete?.()
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
