# Fitness Tracker Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React PWA frontend for the Fitness Tracker — auth, session logging (gym + kickboxing), history, progress charts, and AI feedback — installable on mobile and desktop.

**Architecture:** React + Vite + TypeScript SPA configured as a PWA via `vite-plugin-pwa`. Axios handles API calls with a JWT interceptor that auto-refreshes on 401. React Query manages server state. Offline writes queue in IndexedDB (FIFO) and replay with idempotency keys + exponential backoff when back online.

**Tech Stack:** React 18, Vite, TypeScript, TailwindCSS, React Query v5 (TanStack), React Router v6, Axios, vite-plugin-pwa (Workbox), Recharts, idb (IndexedDB wrapper), pnpm

**Prerequisite:** The backend API must be running (locally or on Render) before testing any page beyond login/signup.

---

## File Map

```
fitness-tracker/frontend/
├── public/
│   ├── pwa-192x192.png          # App icon (192×192)
│   └── pwa-512x512.png          # App icon (512×512)
├── src/
│   ├── main.tsx                 # React root — QueryClientProvider, RouterProvider
│   ├── vite-env.d.ts
│   ├── api/
│   │   ├── client.ts            # Axios instance with baseURL, JWT interceptor, 401 refresh
│   │   ├── auth.ts              # signup, login, logout, refresh API calls
│   │   ├── templates.ts         # getWeeklyPlan, updateTemplateDay
│   │   ├── sessions.ts          # createSession, listSessions, getSession, complete, delete,
│   │   │                        # upsertSets, updateSet, upsertRounds, updateRound
│   │   └── feedback.ts          # generateFeedback, listFeedback
│   ├── store/
│   │   └── auth.ts              # Zustand store: accessToken, setToken, clearToken
│   ├── offline/
│   │   └── queue.ts             # IndexedDB queue: enqueue, dequeue, replay with backoff
│   ├── hooks/
│   │   ├── useWeeklyPlan.ts     # useQuery wrapper for GET /templates
│   │   ├── useSessions.ts       # useQuery for GET /sessions (list)
│   │   ├── useSession.ts        # useQuery for GET /sessions/:id
│   │   ├── useFeedback.ts       # useQuery for GET /feedback
│   │   └── useSyncStatus.ts     # reads offline queue length, exposes pending count
│   ├── components/
│   │   ├── Layout.tsx           # Bottom nav + inline sync status banner (shows "N sessions pending sync")
│   │   ├── ProtectedRoute.tsx   # Redirects to /login if no token
│   │   ├── SessionCard.tsx      # Compact session summary for dashboard + history
│   │   ├── GymLogger.tsx        # Set-by-set input for gym sessions
│   │   ├── KickboxingLogger.tsx # Round-by-round input for kickboxing sessions
│   │   └── charts/
│   │       ├── WeightProgressChart.tsx   # LineChart: weight_kg over time per exercise
│   │       └── RoundQualityChart.tsx     # LineChart: avg quality_rating per round type
│   └── pages/
│       ├── LoginPage.tsx
│       ├── SignupPage.tsx
│       ├── DashboardPage.tsx    # Today's session card + weekly overview
│       ├── SessionPage.tsx      # Active session logger (gym or kickboxing)
│       ├── HistoryPage.tsx      # Past sessions list with date filter
│       ├── ProgressPage.tsx     # Weight + round quality charts
│       ├── FeedbackPage.tsx     # AI feedback cards + generate button
│       └── ProfilePage.tsx      # User settings (name display, logout)
├── index.html
├── vite.config.ts               # VitePWA, React, TailwindCSS
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `fitness-tracker/frontend/` (via `pnpm create vite`)
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
pnpm create vite frontend --template react-ts
cd frontend
pnpm install
```

- [ ] **Step 2: Install all dependencies**

```bash
pnpm add @tanstack/react-query react-router-dom axios recharts zustand idb uuid
pnpm add -D vite-plugin-pwa tailwindcss @tailwindcss/vite @types/uuid
```

- [ ] **Step 3: Configure TailwindCSS**

In `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Fitness Tracker',
        short_name: 'FitTrack',
        description: 'Track your weekly training and get AI coaching feedback',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api') || url.origin === (import.meta.env?.VITE_API_URL ?? ''),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

- [ ] **Step 4: Add Tailwind import to `src/index.css`**

Replace the contents of `src/index.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 5: Update `src/main.tsx`**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './index.css'
import { routes } from './routes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

const router = createBrowserRouter(routes)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

Create a placeholder `src/routes.tsx`:
```tsx
// src/routes.tsx
export const routes = [
  { path: '/', element: <div>Home</div> },
]
```

- [ ] **Step 6: Add placeholder icons**

Create two valid 1×1 PNG files as placeholders (real icons needed before production):

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker/frontend/public

# Creates a minimal valid 1x1 black PNG (base64 decoded)
node -e "
const fs = require('fs');
const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('pwa-192x192.png', png1x1);
fs.writeFileSync('pwa-512x512.png', png1x1);
console.log('Placeholder icons created');
"
```

> These are valid PNG files so the service worker manifest won't error. Replace with real 192×192 and 512×512 icons (e.g., from [realfavicongenerator.net](https://realfavicongenerator.net)) before deploying.

- [ ] **Step 7: Verify dev server starts**

```bash
pnpm run dev
```

Expected: `Local: http://localhost:5173/` with the Vite default page.

- [ ] **Step 8: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
VITE_API_URL=http://localhost:3000
EOF
cp .env.example .env
```

- [ ] **Step 9: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: scaffold React PWA frontend with Vite, Tailwind, React Query"
```

---

## Task 2: API Client + Auth Store

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/api/templates.ts`
- Create: `frontend/src/api/sessions.ts`
- Create: `frontend/src/api/feedback.ts`
- Create: `frontend/src/store/auth.ts`

- [ ] **Step 1: Create Zustand auth store**

```typescript
// src/store/auth.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  accessToken: string | null
  setToken: (token: string) => void
  clearToken: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      setToken: (token) => set({ accessToken: token }),
      clearToken: () => set({ accessToken: null }),
    }),
    { name: 'auth-storage' },
  ),
)
```

- [ ] **Step 2: Create Axios client with JWT interceptor**

```typescript
// src/api/client.ts
import axios from 'axios'
import { useAuthStore } from '../store/auth'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true, // sends httpOnly refresh cookie on all requests
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401: try refresh once, then redirect to login
let isRefreshing = false
let queue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(apiClient(original))
        })
      })
    }

    isRefreshing = true
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      useAuthStore.getState().setToken(data.accessToken)
      queue.forEach((cb) => cb(data.accessToken))
      queue = []
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return apiClient(original)
    } catch {
      useAuthStore.getState().clearToken()
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)
```

- [ ] **Step 3: Create auth API functions**

```typescript
// src/api/auth.ts
import { apiClient } from './client'

export const signup = (data: { email: string; password: string; name: string }) =>
  apiClient.post<{ accessToken: string }>('/auth/signup', data)

export const login = (data: { email: string; password: string }) =>
  apiClient.post<{ accessToken: string }>('/auth/login', data)

export const logout = () => apiClient.post('/auth/logout')

export const refresh = () => apiClient.post<{ accessToken: string }>('/auth/refresh')
```

- [ ] **Step 4: Create templates API functions**

```typescript
// src/api/templates.ts
import { apiClient } from './client'

export const getWeeklyPlan = () => apiClient.get('/templates').then((r) => r.data)

export const updateTemplateDay = (dayId: string, body: {
  exercises?: Array<{ exerciseId: string; defaultSets: number; defaultReps: number; defaultWeightKg: number; order: number }>
  rounds?: Array<{ roundTypeId: string; roundNumber: number }>
}) => apiClient.patch(`/templates/days/${dayId}`, body).then((r) => r.data)
```

- [ ] **Step 5: Create sessions API functions**

```typescript
// src/api/sessions.ts
import { apiClient } from './client'

export const createSession = (body: {
  templateDayId?: string
  date: string
  warmupType?: 'walk' | 'run'
  warmupDurationMin?: number
  notes?: string
  idempotencyKey: string
}) => apiClient.post('/sessions', body).then((r) => r.data)

export const listSessions = (params?: {
  from?: string; to?: string; status?: string; page?: number; limit?: number
}) => apiClient.get('/sessions', { params }).then((r) => r.data)

export const getSession = (id: string) =>
  apiClient.get(`/sessions/${id}`).then((r) => r.data)

export const updateSession = (id: string, body: {
  warmupType?: string; warmupDurationMin?: number; notes?: string
}) => apiClient.patch(`/sessions/${id}`, body).then((r) => r.data)

export const completeSession = (id: string) =>
  apiClient.post(`/sessions/${id}/complete`).then((r) => r.data)

export const deleteSession = (id: string) =>
  apiClient.delete(`/sessions/${id}`).then((r) => r.data)

export const upsertSets = (sessionId: string, sets: Array<{
  exerciseId: string; setNumber: number; reps: number; weightKg: number; completed: boolean; idempotencyKey: string
}>) => apiClient.put(`/sessions/${sessionId}/sets`, sets).then((r) => r.data)

export const updateSet = (sessionId: string, setId: string, body: {
  reps?: number; weightKg?: number; completed?: boolean
}) => apiClient.patch(`/sessions/${sessionId}/sets/${setId}`, body).then((r) => r.data)

export const upsertRounds = (sessionId: string, rounds: Array<{
  roundTypeId: string; roundNumber: number; completed: boolean; qualityRating?: number; notes?: string; idempotencyKey: string
}>) => apiClient.put(`/sessions/${sessionId}/rounds`, rounds).then((r) => r.data)

export const updateRound = (sessionId: string, roundId: string, body: {
  completed?: boolean; qualityRating?: number; notes?: string
}) => apiClient.patch(`/sessions/${sessionId}/rounds/${roundId}`, body).then((r) => r.data)
```

- [ ] **Step 6: Create feedback API functions**

```typescript
// src/api/feedback.ts
import { apiClient } from './client'

export const generateFeedback = () =>
  apiClient.post('/feedback/generate').then((r) => r.data)

export const listFeedback = (params?: { page?: number; limit?: number }) =>
  apiClient.get('/feedback', { params }).then((r) => r.data)
```

- [ ] **Step 7: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: API client with JWT interceptor, auth store, and API modules"
```

---

## Task 3: Offline Queue

**Files:**
- Create: `frontend/src/offline/queue.ts`
- Create: `frontend/src/hooks/useSyncStatus.ts`

- [ ] **Step 1: Create IndexedDB offline queue**

```typescript
// src/offline/queue.ts
import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'fitness-offline'
const STORE = 'request-queue'

interface QueueEntry {
  id: string         // UUID — also the idempotency key
  method: string
  url: string
  body: unknown
  queuedAt: number   // Date.now() — FIFO ordering
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('queuedAt', 'queuedAt')
      }
    },
  })
}

export async function enqueue(entry: Omit<QueueEntry, 'queuedAt'>) {
  const db = await getDB()
  await db.put(STORE, { ...entry, queuedAt: Date.now() })
}

export async function getQueueLength(): Promise<number> {
  const db = await getDB()
  return db.count(STORE)
}

// Replay queue in FIFO order, with exponential backoff
export async function replayQueue(
  sendRequest: (entry: QueueEntry) => Promise<void>,
  onComplete?: () => void,
) {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORE, 'queuedAt') // sorted by queuedAt ASC = FIFO

  for (const entry of all) {
    let attempts = 0
    let success = false

    while (attempts < 5 && !success) {
      try {
        await sendRequest(entry)
        await db.delete(STORE, entry.id)
        success = true
      } catch {
        attempts++
        if (attempts < 5) {
          await delay(Math.pow(2, attempts) * 1000) // 2s, 4s, 8s, 16s
        }
      }
    }

    if (!success) {
      console.warn(`Failed to sync queue entry ${entry.id} after 5 attempts`)
      // Notify the user — the SyncStatusBanner will continue showing pending count.
      // Dispatch a custom event so the UI can show a more specific error if needed.
      window.dispatchEvent(new CustomEvent('sync-failed', { detail: { id: entry.id } }))
    }
  }

  onComplete?.()
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

- [ ] **Step 2: Create useSyncStatus hook**

```typescript
// src/hooks/useSyncStatus.ts
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
```

- [ ] **Step 3: Wire up online listener to trigger replay in `main.tsx`**

Add to `src/main.tsx` (after imports):
```tsx
import { replayQueue } from './offline/queue'
import { apiClient } from './api/client'

// Replay offline queue when coming back online
window.addEventListener('online', () => {
  replayQueue(async (entry) => {
    await apiClient.request({
      method: entry.method,
      url: entry.url,
      data: entry.body,
    })
  })
})
```

- [ ] **Step 4: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: IndexedDB offline queue with FIFO replay and exponential backoff"
```

---

## Task 4: Auth Pages (Login + Signup)

**Files:**
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/SignupPage.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/routes.tsx`

- [ ] **Step 1: Create ProtectedRoute**

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
```

- [ ] **Step 2: Create Layout with bottom nav**

```tsx
// src/components/Layout.tsx
import { Outlet, NavLink } from 'react-router-dom'
import { useSyncStatus } from '../hooks/useSyncStatus'

export function Layout() {
  const pending = useSyncStatus()

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      {pending > 0 && (
        <div className="bg-yellow-600 text-xs text-center py-1">
          {pending} session{pending > 1 ? 's' : ''} pending sync...
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex justify-around py-2">
        {[
          { to: '/', label: 'Home' },
          { to: '/history', label: 'History' },
          { to: '/progress', label: 'Progress' },
          { to: '/feedback', label: 'AI' },
          { to: '/profile', label: 'Profile' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `text-xs px-3 py-1 rounded ${isActive ? 'text-blue-400' : 'text-gray-400'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 3: Create LoginPage**

```tsx
// src/pages/LoginPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuthStore } from '../store/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const setToken = useAuthStore((s) => s.setToken)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await login({ email, password })
      setToken(data.accessToken)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">FitTrack</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-4 py-3 text-sm">
            Log In
          </button>
        </form>
        <p className="text-gray-400 text-sm text-center mt-4">
          No account? <Link to="/signup" className="text-blue-400">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create SignupPage**

```tsx
// src/pages/SignupPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../api/auth'
import { useAuthStore } from '../store/auth'

export function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const setToken = useAuthStore((s) => s.setToken)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await signup({ name, email, password })
      setToken(data.accessToken)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Your name" value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input type="password" placeholder="Password (min 8 chars)" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            minLength={8} required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-4 py-3 text-sm">
            Sign Up
          </button>
        </form>
        <p className="text-gray-400 text-sm text-center mt-4">
          Already have an account? <Link to="/login" className="text-blue-400">Log in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire up routes**

```tsx
// src/routes.tsx
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { SessionPage } from './pages/SessionPage'
import { HistoryPage } from './pages/HistoryPage'
import { ProgressPage } from './pages/ProgressPage'
import { FeedbackPage } from './pages/FeedbackPage'
import { ProfilePage } from './pages/ProfilePage'

// Stub pages for tasks that aren't built yet
const Stub = ({ name }: { name: string }) => (
  <div className="p-6 text-white">{name} — coming soon</div>
)

export const routes = [
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Stub name="Dashboard" /> },
          { path: '/session/:id', element: <Stub name="Session" /> },
          { path: '/history', element: <Stub name="History" /> },
          { path: '/progress', element: <Stub name="Progress" /> },
          { path: '/feedback', element: <Stub name="Feedback" /> },
          { path: '/profile', element: <Stub name="Profile" /> },
        ],
      },
    ],
  },
]
```

- [ ] **Step 6: Manual test**

```bash
pnpm run dev
```

1. Open http://localhost:5173 → redirects to `/login` ✓
2. Click "Sign up" → signup form ✓
3. Sign up → redirected to `/` with stub "Dashboard" ✓
4. Bottom nav links work ✓
5. Sync banner absent (queue empty) ✓

- [ ] **Step 7: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: auth pages, layout with bottom nav, protected routes"
```

---

## Task 5: Dashboard Page

**Files:**
- Create: `frontend/src/hooks/useWeeklyPlan.ts`
- Create: `frontend/src/components/SessionCard.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create useWeeklyPlan hook**

```typescript
// src/hooks/useWeeklyPlan.ts
import { useQuery } from '@tanstack/react-query'
import { getWeeklyPlan } from '../api/templates'

export function useWeeklyPlan() {
  return useQuery({
    queryKey: ['weeklyPlan'],
    queryFn: getWeeklyPlan,
    staleTime: 1000 * 60 * 10,
  })
}
```

- [ ] **Step 2: Create SessionCard component**

```tsx
// src/components/SessionCard.tsx
import { Link } from 'react-router-dom'

interface Props {
  session: {
    id: string
    date: string
    status: string
    templateDay?: { dayOfWeek: string; workoutType: string }
  }
}

export function SessionCard({ session }: Props) {
  const label = session.templateDay
    ? `${session.templateDay.dayOfWeek.toUpperCase()} — ${session.templateDay.workoutType}`
    : 'Ad-hoc session'

  return (
    <Link to={`/session/${session.id}`}
      className="block bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-gray-400 text-xs mt-1">{new Date(session.date).toLocaleDateString()}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          session.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
        }`}>
          {session.status === 'completed' ? 'Done' : 'In Progress'}
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create DashboardPage**

```tsx
// src/pages/DashboardPage.tsx
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { createSession } from '../api/sessions'
import { useAuthStore } from '../store/auth'

const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function DashboardPage() {
  const { data: plan, isLoading } = useWeeklyPlan()
  const navigate = useNavigate()

  const todayDow = DAY_ORDER[new Date().getDay()]
  const todayDay = plan?.days?.find((d: any) => d.dayOfWeek === todayDow)

  const handleStartSession = async () => {
    const session = await createSession({
      templateDayId: todayDay?.id,
      date: new Date().toISOString().split('T')[0],
      idempotencyKey: uuidv4(),
    })
    navigate(`/session/${session.id}`)
  }

  if (isLoading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Today</h1>

      {todayDay ? (
        <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
          <p className="text-gray-400 text-sm uppercase tracking-wide">{todayDow}</p>
          <p className="text-white text-lg font-semibold capitalize">{todayDay.workoutType} Session</p>
          {todayDay.workoutType === 'gym' && (
            <p className="text-gray-400 text-sm">
              {todayDay.templateExercises?.length ?? 0} exercises
            </p>
          )}
          {todayDay.workoutType === 'kickboxing' && (
            <p className="text-gray-400 text-sm">10 rounds</p>
          )}
          <button
            onClick={handleStartSession}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm mt-2"
          >
            Start Session
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-5 text-center text-gray-400">
          Rest day — no session today
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">This Week</h2>
        <div className="grid grid-cols-7 gap-1">
          {plan?.days?.map((day: any) => (
            <div key={day.id}
              className={`rounded-lg p-2 text-center text-xs ${
                day.dayOfWeek === todayDow ? 'bg-blue-700 text-white' :
                day.workoutType === 'gym' ? 'bg-gray-700 text-gray-300' :
                'bg-purple-900 text-purple-300'
              }`}
            >
              <p className="font-semibold">{day.dayOfWeek.slice(0, 2).toUpperCase()}</p>
              <p className="text-[10px] mt-0.5 opacity-70">
                {day.workoutType === 'gym' ? 'Gym' : 'KB'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update routes to use real DashboardPage**

In `src/routes.tsx`, replace the Dashboard stub:
```tsx
import { DashboardPage } from './pages/DashboardPage'
// ...
{ path: '/', element: <DashboardPage /> },
```

- [ ] **Step 5: Manual test**

With backend running (`pnpm run start:dev` in `backend/`):
1. Log in → dashboard shows today's session type
2. Click "Start Session" → navigates to `/session/:id` (stub for now)
3. Weekly grid shows all 7 days

- [ ] **Step 6: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: dashboard page with today's session card and weekly overview"
```

---

## Task 6: Session Logger Page

**Files:**
- Create: `frontend/src/hooks/useSession.ts`
- Create: `frontend/src/components/GymLogger.tsx`
- Create: `frontend/src/components/KickboxingLogger.tsx`
- Modify: `frontend/src/pages/SessionPage.tsx`

- [ ] **Step 1: Create useSession hook**

```typescript
// src/hooks/useSession.ts
import { useQuery } from '@tanstack/react-query'
import { getSession } from '../api/sessions'

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id),
    enabled: !!id,
  })
}
```

- [ ] **Step 2: Create GymLogger component**

```tsx
// src/components/GymLogger.tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { upsertSets, completeSession } from '../api/sessions'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

interface Exercise {
  id: string
  name: string
  defaultSets: number
  defaultReps: number
  defaultWeightKg: number
}

interface Props {
  sessionId: string
  warmupType?: string
  warmupDurationMin?: number
  exercises: Exercise[]
}

interface SetEntry {
  setNumber: number
  reps: number
  weightKg: number
  completed: boolean
  idempotencyKey: string
}

export function GymLogger({ sessionId, exercises }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetEntry[]>>(
    () => Object.fromEntries(
      exercises.map((ex) => [
        ex.id,
        Array.from({ length: ex.defaultSets }, (_, i) => ({
          setNumber: i + 1,
          reps: ex.defaultReps,
          weightKg: ex.defaultWeightKg,
          completed: false,
          idempotencyKey: uuidv4(),
        })),
      ])
    )
  )

  const updateSet = (exId: string, idx: number, field: string, value: any) => {
    setSetsByExercise((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }))
  }

  const handleSave = async () => {
    const allSets = exercises.flatMap((ex) =>
      setsByExercise[ex.id].map((s) => ({ exerciseId: ex.id, ...s }))
    )
    // Note: these calls are direct (online-only). For offline support, replace
    // with enqueue() from src/offline/queue.ts and let the sync loop handle them.
    await upsertSets(sessionId, allSets)
    await completeSession(sessionId)
    qc.invalidateQueries({ queryKey: ['session', sessionId] })
    qc.invalidateQueries({ queryKey: ['sessions'] })
    navigate('/')
  }

  return (
    <div className="space-y-6">
      {exercises.map((ex) => (
        <div key={ex.id} className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">{ex.name}</h3>
          <div className="space-y-2">
            {setsByExercise[ex.id]?.map((set, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-6">S{set.setNumber}</span>
                <input type="number" value={set.reps} min={0}
                  onChange={(e) => updateSet(ex.id, idx, 'reps', Number(e.target.value))}
                  className="w-16 bg-gray-700 text-white text-sm rounded px-2 py-1 text-center"
                  placeholder="Reps"
                />
                <span className="text-gray-500 text-xs">×</span>
                <input type="number" value={set.weightKg} min={0} step={0.5}
                  onChange={(e) => updateSet(ex.id, idx, 'weightKg', Number(e.target.value))}
                  className="w-20 bg-gray-700 text-white text-sm rounded px-2 py-1 text-center"
                  placeholder="kg"
                />
                <button
                  onClick={() => updateSet(ex.id, idx, 'completed', !set.completed)}
                  className={`ml-auto text-xs px-3 py-1 rounded-full ${
                    set.completed ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {set.completed ? '✓' : 'Done'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleSave}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-4 text-sm">
        Complete Session
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create KickboxingLogger component**

```tsx
// src/components/KickboxingLogger.tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { upsertRounds, completeSession } from '../api/sessions'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

interface Round {
  id: string
  roundNumber: number
  roundType: { id: string; name: string }
}

interface Props {
  sessionId: string
  rounds: Round[]
}

interface RoundEntry {
  roundTypeId: string
  roundNumber: number
  completed: boolean
  qualityRating: number
  idempotencyKey: string
}

export function KickboxingLogger({ sessionId, rounds }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [entries, setEntries] = useState<RoundEntry[]>(() =>
    rounds.map((r) => ({
      roundTypeId: r.roundType.id,
      roundNumber: r.roundNumber,
      completed: false,
      qualityRating: 3,
      idempotencyKey: uuidv4(),
    }))
  )

  const update = (idx: number, field: string, value: any) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const handleSave = async () => {
    await upsertRounds(sessionId, entries)
    await completeSession(sessionId)
    qc.invalidateQueries({ queryKey: ['session', sessionId] })
    qc.invalidateQueries({ queryKey: ['sessions'] })
    navigate('/')
  }

  return (
    <div className="space-y-3">
      {rounds.map((round, idx) => (
        <div key={round.id} className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-gray-400 text-xs">Round {round.roundNumber}</span>
              <p className="text-white font-semibold capitalize">{round.roundType.name}</p>
            </div>
            <button
              onClick={() => update(idx, 'completed', !entries[idx].completed)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                entries[idx].completed ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-400'
              }`}
            >
              {entries[idx].completed ? '✓ Done' : 'Mark Done'}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-400 text-xs">Quality:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => update(idx, 'qualityRating', star)}
                className={`w-7 h-7 rounded-full text-xs font-bold ${
                  entries[idx].qualityRating >= star ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-500'
                }`}
              >
                {star}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleSave}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-4 text-sm">
        Complete Session
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create SessionPage**

```tsx
// src/pages/SessionPage.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { GymLogger } from '../components/GymLogger'
import { KickboxingLogger } from '../components/KickboxingLogger'
import { deleteSession } from '../api/sessions'

export function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading } = useSession(id!)
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (!confirm('Discard this session?')) return
    await deleteSession(id!)
    navigate('/')
  }

  if (isLoading) return <div className="p-6 text-gray-400">Loading session...</div>
  if (!session) return <div className="p-6 text-red-400">Session not found</div>

  const workoutType = session.templateDay?.workoutType ?? 'gym'

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white capitalize">{workoutType} Session</h1>
          <p className="text-gray-400 text-sm">{new Date(session.date).toLocaleDateString()}</p>
        </div>
        {session.status === 'in_progress' && (
          <button onClick={handleDelete} className="text-red-400 text-sm hover:text-red-300">
            Discard
          </button>
        )}
      </div>

      {session.status === 'completed' ? (
        <div className="bg-green-900 rounded-xl p-4 text-green-300 text-center">
          Session completed!
        </div>
      ) : workoutType === 'gym' ? (
        <GymLogger
          sessionId={session.id}
          exercises={session.templateDay?.templateExercises?.map((te: any) => ({
            id: te.exercise.id,
            name: te.exercise.name,
            defaultSets: te.defaultSets,
            defaultReps: te.defaultReps,
            defaultWeightKg: te.defaultWeightKg,
          })) ?? []}
        />
      ) : (
        <KickboxingLogger
          sessionId={session.id}
          rounds={session.templateDay?.templateRounds?.map((tr: any) => ({
            id: tr.id,
            roundNumber: tr.roundNumber,
            roundType: tr.roundType,
          })) ?? []}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Update routes**

In `src/routes.tsx`:
```tsx
import { SessionPage } from './pages/SessionPage'
// ...
{ path: '/session/:id', element: <SessionPage /> },
```

- [ ] **Step 6: Manual test**

1. Start a gym session from dashboard → see exercise list with sets
2. Enter reps/weight, mark sets done, click "Complete Session" → back to dashboard
3. Start a kickboxing session (change device date or wait for Saturday/Sunday) → see round list

- [ ] **Step 7: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: session logger — GymLogger and KickboxingLogger components"
```

---

## Task 7: History Page

**Files:**
- Create: `frontend/src/hooks/useSessions.ts`
- Modify: `frontend/src/pages/HistoryPage.tsx`

- [ ] **Step 1: Create useSessions hook**

```typescript
// src/hooks/useSessions.ts
import { useQuery } from '@tanstack/react-query'
import { listSessions } from '../api/sessions'

export function useSessions(params?: { from?: string; to?: string; status?: string; page?: number }) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => listSessions(params),
  })
}
```

- [ ] **Step 2: Create HistoryPage**

```tsx
// src/pages/HistoryPage.tsx
import { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import { SessionCard } from '../components/SessionCard'

export function HistoryPage() {
  const [filter, setFilter] = useState<'week' | 'month'>('week')

  const from = filter === 'week'
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, isLoading } = useSessions({ from })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">History</h1>

      <div className="flex gap-2">
        {(['week', 'month'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Last {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : data?.data?.length === 0 ? (
        <p className="text-gray-500">No sessions yet. Start training!</p>
      ) : (
        <div className="space-y-3">
          {data?.data?.map((session: any) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update routes**

```tsx
import { HistoryPage } from './pages/HistoryPage'
// { path: '/history', element: <HistoryPage /> }
```

- [ ] **Step 4: Manual test**

1. Navigate to /history → see past sessions
2. Toggle week/month filter → list updates

- [ ] **Step 5: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: history page with week/month filter"
```

---

## Task 8: Progress Charts

**Files:**
- Create: `frontend/src/components/charts/WeightProgressChart.tsx`
- Create: `frontend/src/components/charts/RoundQualityChart.tsx`
- Modify: `frontend/src/pages/ProgressPage.tsx`

- [ ] **Step 1: Create WeightProgressChart**

```tsx
// src/components/charts/WeightProgressChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  [exercise: string]: number | string
}

interface Props {
  data: DataPoint[]
  exercises: string[]
}

const COLORS = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa']

export function WeightProgressChart({ data, exercises }: Props) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data yet</p>

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit="kg" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }}
          labelStyle={{ color: '#f9fafb' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        {exercises.map((ex, i) => (
          <Line key={ex} type="monotone" dataKey={ex} stroke={COLORS[i % COLORS.length]}
            strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create RoundQualityChart**

```tsx
// src/components/charts/RoundQualityChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  [roundType: string]: number | string
}

interface Props {
  data: DataPoint[]
  roundTypes: string[]
}

const COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8']

export function RoundQualityChart({ data, roundTypes }: Props) {
  if (!data.length) return <p className="text-gray-500 text-sm">No data yet</p>

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }}
          labelStyle={{ color: '#f9fafb' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        {roundTypes.map((rt, i) => (
          <Line key={rt} type="monotone" dataKey={rt} stroke={COLORS[i % COLORS.length]}
            strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Create ProgressPage**

> **Performance note:** This page fetches each session individually via `useQueries`. To keep Neon connection pressure low and avoid Render cold-start cascades, the session list is capped at **14 sessions** (enough for 2 weeks). If you later have many sessions, consider adding a dedicated `/progress` endpoint on the backend that returns aggregated data in one query.

```tsx
// src/pages/ProgressPage.tsx
import { useSessions } from '../hooks/useSessions'
import { useSession } from '../hooks/useSession'
import { WeightProgressChart } from '../components/charts/WeightProgressChart'
import { RoundQualityChart } from '../components/charts/RoundQualityChart'
import { useQueries } from '@tanstack/react-query'
import { getSession } from '../api/sessions'

export function ProgressPage() {
  const { data: listData } = useSessions({
    from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'completed',
    limit: 14, // cap at 14 to avoid hammering Neon/Render
  })

  const sessionIds: string[] = listData?.data?.map((s: any) => s.id) ?? []

  const sessionQueries = useQueries({
    queries: sessionIds.map((id) => ({
      queryKey: ['session', id],
      queryFn: () => getSession(id),
      staleTime: 1000 * 60 * 10,
    })),
  })

  const completedSessions = sessionQueries
    .filter((q) => q.data)
    .map((q) => q.data)

  // Build weight chart data: { date, [exerciseName]: maxWeightKg }
  const gymSessions = completedSessions.filter((s: any) => s.templateDay?.workoutType === 'gym')
  const exerciseNames = [...new Set(
    gymSessions.flatMap((s: any) => s.sessionSets.map((ss: any) => ss.exercise.name))
  )]
  const weightData = gymSessions.map((s: any) => {
    const point: Record<string, any> = { date: new Date(s.date).toLocaleDateString() }
    for (const name of exerciseNames) {
      const sets = s.sessionSets.filter((ss: any) => ss.exercise.name === name)
      if (sets.length) point[name] = Math.max(...sets.map((ss: any) => ss.weightKg))
    }
    return point
  })

  // Build round quality data: { date, [roundTypeName]: avgRating }
  const kbSessions = completedSessions.filter((s: any) => s.templateDay?.workoutType === 'kickboxing')
  const roundTypeNames = [...new Set(
    kbSessions.flatMap((s: any) => s.sessionRounds.map((sr: any) => sr.roundType.name))
  )]
  const qualityData = kbSessions.map((s: any) => {
    const point: Record<string, any> = { date: new Date(s.date).toLocaleDateString() }
    for (const name of roundTypeNames) {
      const rounds = s.sessionRounds.filter((sr: any) => sr.roundType.name === name && sr.qualityRating)
      if (rounds.length) {
        point[name] = rounds.reduce((sum: number, r: any) => sum + r.qualityRating, 0) / rounds.length
      }
    }
    return point
  })

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-white">Progress</h1>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Barbell Weight (last 30 days)</h2>
        <WeightProgressChart data={weightData} exercises={exerciseNames as string[]} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Kickboxing Round Quality</h2>
        <RoundQualityChart data={qualityData} roundTypes={roundTypeNames as string[]} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update routes**

```tsx
import { ProgressPage } from './pages/ProgressPage'
// { path: '/progress', element: <ProgressPage /> }
```

- [ ] **Step 5: Manual test**

After logging 2+ sessions with sets/rounds:
1. Navigate to /progress → weight chart shows per-exercise trends
2. Kickboxing quality chart shows round type trends

- [ ] **Step 6: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: progress charts — weight trends and kickboxing quality trends"
```

---

## Task 9: Feedback Page + Profile Page

**Files:**
- Create: `frontend/src/hooks/useFeedback.ts`
- Modify: `frontend/src/pages/FeedbackPage.tsx`
- Modify: `frontend/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Create useFeedback hook**

```typescript
// src/hooks/useFeedback.ts
import { useQuery } from '@tanstack/react-query'
import { listFeedback } from '../api/feedback'

export function useFeedback() {
  return useQuery({
    queryKey: ['feedback'],
    queryFn: () => listFeedback(),
  })
}
```

- [ ] **Step 2: Create FeedbackPage**

```tsx
// src/pages/FeedbackPage.tsx
import { useState } from 'react'
import { useFeedback } from '../hooks/useFeedback'
import { generateFeedback } from '../api/feedback'
import { useQueryClient } from '@tanstack/react-query'

export function FeedbackPage() {
  const { data, isLoading } = useFeedback()
  const qc = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      await generateFeedback()
      qc.invalidateQueries({ queryKey: ['feedback'] })
    } catch (err: any) {
      if (err.response?.status === 429) {
        setCooldown(err.response.data?.retry_after)
        setError('You already generated feedback today. Try again tomorrow.')
      } else {
        setError('Failed to generate feedback. Try again later.')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">AI Feedback</h1>
        <button
          onClick={handleGenerate}
          disabled={generating || !!cooldown}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-xl font-semibold"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-yellow-400 text-sm">{error}</p>}

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : data?.data?.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-6 text-center">
          <p className="text-gray-400">No feedback yet.</p>
          <p className="text-gray-500 text-sm mt-1">Train for a few days, then generate feedback.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data?.map((fb: any) => (
            <div key={fb.id} className="bg-gray-800 rounded-2xl p-5">
              <p className="text-gray-400 text-xs mb-3">
                {new Date(fb.periodStart).toLocaleDateString()} — {new Date(fb.periodEnd).toLocaleDateString()}
              </p>
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{fb.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create ProfilePage**

```tsx
// src/pages/ProfilePage.tsx
import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { useAuthStore } from '../store/auth'

// Decode JWT payload to read name/email without an extra API call
function decodeJwt(token: string): { email?: string; name?: string } | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function ProfilePage() {
  const { clearToken, accessToken } = useAuthStore((s) => ({ clearToken: s.clearToken, accessToken: s.accessToken }))
  const navigate = useNavigate()
  const profile = accessToken ? decodeJwt(accessToken) : null

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearToken()
    navigate('/login')
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile</h1>
      <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
        {profile && (
          <div>
            <p className="text-white font-semibold">{(profile as any).name ?? '—'}</p>
            <p className="text-gray-400 text-sm">{profile.email ?? '—'}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold rounded-xl py-3 text-sm"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update routes**

```tsx
import { FeedbackPage } from './pages/FeedbackPage'
import { ProfilePage } from './pages/ProfilePage'
// { path: '/feedback', element: <FeedbackPage /> }
// { path: '/profile', element: <ProfilePage /> }
```

- [ ] **Step 5: Manual test**

1. Navigate to /feedback → shows empty state
2. Click "Generate" → Gemini returns feedback card
3. Click again → shows 429 cooldown message
4. Navigate to /profile → click logout → back to /login

- [ ] **Step 6: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "feat: feedback page with AI generation, profile page with logout"
```

---

## Task 10: Deploy Frontend to Vercel

- [ ] **Step 1: Add `vercel.json` for SPA routing**

```bash
cat > /home/elgnas/Projects/Personal/fitness-tracker/frontend/vercel.json << 'EOF'
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
EOF
```

- [ ] **Step 2: Push latest code to GitHub**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add frontend/
git commit -m "chore: add vercel.json for SPA routing"
git push
```

- [ ] **Step 3: Deploy to Vercel**

1. Go to https://vercel.com → New Project → Import GitHub repo
2. **Root directory:** `frontend`
3. **Framework preset:** Vite (auto-detected)
4. **Build command:** `pnpm run build`
5. **Output directory:** `dist`

- [ ] **Step 4: Set environment variable in Vercel dashboard**

```
VITE_API_URL=https://your-app.onrender.com
```

- [ ] **Step 5: Update backend CORS**

In Render dashboard, set `FRONTEND_URL` to your Vercel URL:
```
FRONTEND_URL=https://your-app.vercel.app
```

- [ ] **Step 6: Smoke test on mobile**

1. Open Vercel URL on phone browser
2. Tap "Add to Home Screen" → installs as PWA
3. Sign up, log a session, complete it
4. Turn off WiFi → try opening the app → cached shell loads
5. Turn WiFi back on → any queued items sync

- [ ] **Step 7: Final commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add .
git commit -m "chore: frontend deployment complete"
git push
```

---

## Done

Both backend and frontend are deployed:
- **API:** https://your-app.onrender.com
- **PWA:** https://your-app.vercel.app (installable on phone)
