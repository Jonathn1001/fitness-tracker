# Fitness Tracker App — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

A Progressive Web App (PWA) for tracking a fixed weekly training plan — 5 gym sessions (Monday–Friday) and 2 kickboxing heavy bag sessions (Saturday–Sunday) — with AI-powered feedback via Gemini 2.5 Flash. Users can log warmups, gym sets, and kickboxing rounds, view progress charts, and receive periodic AI coaching feedback.

---

## Training Plan

**Monday–Friday (Gym):** Warmup (walk or run) + weight training + abs
- Day split: Upper, Lower, Arms, Chest, Shoulder-Back

**Saturday–Sunday (Kickboxing):** 10 rounds per session
- Round breakdown: 3 boxing, 1 elbow, 1 knee, 4 kicks, 1 combination

---

## Platform & Hosting

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React + Vite + TypeScript (PWA) | Vercel (free) |
| Backend | NestJS (Node.js) | Render (free, spins down after 15min idle) |
| Database | PostgreSQL (Prisma ORM) | Neon (free, 500MB storage, ~10–20 concurrent connections) |
| AI | Gemini 2.5 Flash API | Google AI Studio (free tier) |

**Hosting gotchas:**
- Render cold-starts after ~15min of inactivity (~30s delay on first request). Background sync from the PWA must use retry with exponential backoff (starting at 2s) to handle cold-start timeouts gracefully.
- Neon's free tier limits concurrent connections (typically 10–20). Set `?connection_limit=5` in the Prisma `DATABASE_URL` to stay within limits.

---

## Architecture

```
┌─────────────────────────────────────┐
│         React PWA (Frontend)        │
│  Vite + React + TailwindCSS         │
│  Installable on mobile & desktop    │
└──────────────┬──────────────────────┘
               │ REST API (JWT auth)
┌──────────────▼──────────────────────┐
│        NestJS API (Backend)         │
│  Modules: Auth, Users, Workouts,    │
│           Sessions, AI Feedback     │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────────┐
│ PostgreSQL  │  │  Gemini 2.5     │
│  (Neon)     │  │  Flash API      │
└─────────────┘  └─────────────────┘
```

---

## Database Schema

### Lookup / Library Tables

**exercise_library**
```
id, name, muscle_group, category, description
```

**round_type_library**
```
id, name (boxing | elbow | knee | kicks | combo), description
```

> `workout_type` is stored as a string enum (`gym` | `kickboxing`) directly on `template_days` rather than a separate lookup table. This avoids unnecessary joins for only two current types and can be migrated to a lookup table if more types are added.

### Auth Tables

**users**
```
id, email, password (hashed), name, created_at
```

**refresh_tokens**
```
id, user_id (FK), token (hashed), expires_at, revoked, created_at
```
> Refresh tokens are stored server-side (hashed) to support rotation and invalidation. On each use, the old token is revoked and a new one is issued.

### Template Tables (Weekly Plan)

**workout_templates**
```
id, user_id (FK), name, is_active, created_at
```

**template_days**
```
id, template_id (FK), day_of_week (mon | tue | wed | thu | fri | sat | sun),
workout_type (gym | kickboxing)
```

> No `order` column — days are naturally ordered by `day_of_week` enum value. User reordering is not supported in v1.

**template_exercises** (gym days only)
```
id, template_day_id (FK), exercise_id (FK), default_sets, default_reps, default_weight_kg, order
```

**template_rounds** (kickboxing days only)
```
id, template_day_id (FK), round_type_id (FK), round_number
```

### Session Tables (Logged Workouts)

**sessions**
```
id, user_id (FK), template_day_id (FK, nullable), date,
warmup_type (walk | run | null), warmup_duration_min (nullable),
notes (nullable), status (in_progress | completed), completed_at (nullable),
idempotency_key (UUID, unique, indexed)
```

> - `template_day_id` is nullable to support ad-hoc sessions not tied to a template day.
> - `warmup_type` and `warmup_duration_min` are nullable — only apply to gym sessions. The backend **rejects non-null warmup fields if the session's `workout_type` is `kickboxing`**.
> - `idempotency_key` is a client-generated UUID sent on creation. The backend ignores duplicate requests with the same key (returns the existing record). Records are retained indefinitely (no cleanup needed at this scale).

**session_sets** (gym)
```
id, session_id (FK), exercise_id (FK), set_number, reps, weight_kg, completed,
idempotency_key (UUID, unique, indexed)
```

**session_rounds** (kickboxing)
```
id, session_id (FK), round_type_id (FK), round_number, completed,
quality_rating (1–5), notes (nullable),
idempotency_key (UUID, unique, indexed)
```

### AI Feedback Table

**ai_feedback**
```
id, user_id (FK), content (text), period_start (date), period_end (date),
generated_at, context_snapshot (JSONB)
```

**`context_snapshot` shape:**
```json
{
  "user_id": "uuid",
  "period_start": "2026-03-07",
  "period_end": "2026-03-21",
  "sessions": [
    {
      "id": "uuid",
      "date": "2026-03-10",
      "workout_type": "gym",
      "template_day": "Upper",
      "sets": [
        { "exercise": "Bench Press", "set_number": 1, "reps": 10, "weight_kg": 80 }
      ]
    },
    {
      "id": "uuid",
      "date": "2026-03-15",
      "workout_type": "kickboxing",
      "rounds": [
        { "round_type": "boxing", "round_number": 1, "completed": true, "quality_rating": 4 }
      ]
    }
  ]
}
```

### Extensibility Notes
- `exercise_library` and `round_type_library` are seeded lookup tables — new exercises or round types can be added without schema changes.
- `template_exercises.default_*` stores planned defaults; `session_sets` stores actuals.
- Ad-hoc sessions (`template_day_id = null`) are supported for off-plan training days.
- Body metrics tracking is deferred to v2 and is not in the initial schema.

---

## Template Seeding on Signup

When a user signs up, a default weekly template is automatically created based on the fixed training plan:

| Day | Type | Content |
|---|---|---|
| Monday | gym | Upper body exercises (pre-seeded from exercise_library) |
| Tuesday | gym | Lower body exercises |
| Wednesday | gym | Arms exercises |
| Thursday | gym | Chest exercises |
| Friday | gym | Shoulder-Back exercises |
| Saturday | kickboxing | 10 rounds: 3 boxing, 1 elbow, 1 knee, 4 kicks, 1 combo |
| Sunday | kickboxing | 10 rounds: 3 boxing, 1 elbow, 1 knee, 4 kicks, 1 combo |

The same fixed template is seeded for every user. Users can then customize per day via `PATCH /templates/days/:dayId`.

---

## Authentication

- JWT-based: access token (15min) + refresh token (7 days, httpOnly cookie)
- Refresh tokens stored server-side in `refresh_tokens` table (hashed). On each use, old token is revoked and a new one is issued.
- NestJS Guards protect all routes except `/auth/*`
- Weekly template seeded automatically on signup

---

## Backend — NestJS Module Structure

```
src/
├── auth/          # signup, login, refresh, logout
├── users/         # profile management
├── templates/     # weekly plan CRUD, seeding on signup
├── exercises/     # exercise library
├── sessions/      # log a workout, get history
└── feedback/      # trigger & retrieve AI feedback
```

### Authorization Rule

All session-scoped endpoints (`GET/PATCH/PUT/POST /sessions/:id/*`) must verify `session.user_id === req.user.id` before operating. Return `403 Forbidden` if ownership does not match. This applies to sets and rounds sub-resources as well.

### API Endpoints

```
POST   /auth/signup
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /templates                      # user's full weekly plan
PATCH  /templates/days/:dayId          # customize a specific template day
                                       # body: { exercises?: [...], rounds?: [...] }
                                       #   exercises: [{ exercise_id, default_sets, default_reps, default_weight_kg, order }]
                                       #   rounds: [{ round_type_id, round_number }]
                                       # Replaces the day's exercise/round list wholesale.

POST   /sessions                       # create session
                                       # body: {
                                       #   template_day_id?: string,   // nullable
                                       #   date: string,               // ISO date
                                       #   warmup_type?: "walk"|"run", // gym only
                                       #   warmup_duration_min?: number,
                                       #   notes?: string,
                                       #   idempotency_key: string     // client UUID
                                       # }

GET    /sessions                       # session history
                                       # query params:
                                       #   ?from=YYYY-MM-DD   (default: 30 days ago)
                                       #   ?to=YYYY-MM-DD     (default: today)
                                       #   ?status=in_progress|completed
                                       #   ?page=1&limit=20

GET    /sessions/:id                   # single session detail

PATCH  /sessions/:id                   # update session-level fields
                                       # body: { warmup_type?, warmup_duration_min?, notes? }

POST   /sessions/:id/complete          # mark session as completed

DELETE /sessions/:id                   # delete a session (only allowed if status = in_progress)
                                       # returns 409 if session is already completed

PUT    /sessions/:id/sets              # upsert all sets for a session (bulk)
                                       # body: [{ exercise_id, set_number, reps, weight_kg, completed, idempotency_key }]
                                       # behavior: for each item in the array —
                                       #   - if idempotency_key already exists: skip (return existing record)
                                       #   - if idempotency_key is new: insert
                                       # Mixed batches (new + duplicate keys) are handled per-item. No error on duplicates.

PATCH  /sessions/:id/sets/:setId       # update a single set
                                       # body: { reps?, weight_kg?, completed? }

PUT    /sessions/:id/rounds            # upsert all rounds for a session (bulk)
                                       # body: [{ round_type_id, round_number, completed, quality_rating, notes?, idempotency_key }]
                                       # same per-item upsert behavior as PUT /sessions/:id/sets

PATCH  /sessions/:id/rounds/:roundId   # update a single round
                                       # body: { completed?, quality_rating?, notes? }

POST   /feedback/generate              # trigger Gemini analysis (last 14 days)
                                       # rate-limited: 1 request per user per 24 hours
                                       # enforced via a unique DB constraint on (user_id, date_trunc('day', generated_at))
                                       # to prevent race conditions from double-taps
                                       # returns 429 with { retry_after: <ISO timestamp> } if limit hit

GET    /feedback                       # feedback history
                                       # query params: ?page=1&limit=10 (offset-based)

GET    /sessions                       # returns lightweight list (id, date, workout_type, status, completed_at)
                                       # use GET /sessions/:id for full detail including notes, sets, rounds
```

**Error response format** (NestJS default envelope):
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Session Lifecycle

```
POST /sessions          → status: in_progress
  ↓ user logs sets/rounds via PUT/PATCH endpoints
PATCH /sessions/:id     → update warmup fields if needed
POST /sessions/:id/complete → status: completed, completed_at: now
```

### Gemini Integration

`POST /feedback/generate` collects the **last 14 days** of completed sessions for the user, formats them using the `context_snapshot` JSON shape (see schema section), calls Gemini 2.5 Flash server-side (API key never exposed to client), and persists the response in `ai_feedback`.

**Rate limit:** 1 call per user per 24 hours, enforced by checking `ai_feedback.generated_at` for the most recent record. Returns `429` with `retry_after` timestamp if limit is hit.

The prompt instructs Gemini to evaluate:
- Muscle group coverage across gym sessions
- Barbell weight and rep progression per exercise
- Kickboxing round quality trends (average `quality_rating` per round type)
- Rest day and recovery patterns
- Specific areas to improve

---

## Frontend — React PWA

**Stack:** React + Vite + TypeScript + TailwindCSS + React Query + React Router + Axios

**PWA:** `vite-plugin-pwa` — installable on home screen, service worker manages caching and offline support.

### Caching Strategy

- **App shell** (HTML, JS, CSS, icons): precached by service worker — always loads instantly.
- **API responses** (sessions, templates, feedback): **network-first with cache fallback** — fresh data when online, cached data shown when offline.
- **Session writes offline:** queued in IndexedDB in **FIFO order** (by queue insertion time). When back online, replayed strictly in insertion order using idempotency keys. Retry uses exponential backoff (2s → 4s → 8s → give up after 5 attempts, notify user). Each item in the queue carries its own `idempotency_key`, so replaying the same queue entry multiple times is safe.
- Users will see their last-cached session history and templates when fully offline, but cannot submit new sessions until sync succeeds.

### Pages

```
/login & /signup          → Auth screens
/dashboard                → Weekly overview, today's session card (tap to start)
/session/:id              → Active session logger
  ├── Gym: warmup fields + sets/reps/weight input per exercise
  └── Kickboxing: complete + rate (1–5) each round
/history                  → Past sessions, filterable by week/month
/progress                 → Line charts:
                              - Barbell weight over time per exercise (session_sets.weight_kg)
                              - Kickboxing round quality trends (avg quality_rating per round type)
/feedback                 → AI feedback cards, "Generate feedback" button (shows cooldown if rate-limited)
/profile                  → User settings
```

### UX Principles
- Dashboard pre-loads today's template — one tap to start session
- Session logger is mobile-first: large tap targets, minimal keyboard input
- Progress charts via Recharts (lightweight)
- Offline queue status visible to user (e.g., "2 sessions pending sync")

---

## V1 Scope (In)

- User auth (signup, login, JWT + refresh token rotation)
- Weekly template seeded on signup, customizable per day
- Gym session logging: warmup + sets (exercise, reps, barbell weight)
- Kickboxing session logging: 10 rounds with completion + quality rating
- Session history and status lifecycle
- Progress charts (barbell weight trends, round quality trends)
- AI feedback via Gemini 2.5 Flash (last 14 days, 1x/24h rate limit)
- PWA (installable, offline logging with idempotent sync and retry)

## V2 Scope (Out for now)

- Body metrics / weight tracking (`body_metrics` table, `GET/POST /metrics`)
- Push notifications / session reminders
- Native mobile app (React Native)
- Nutrition tracking
- Social features / sharing

---

## Future Considerations

- Native mobile app (React Native) using the same NestJS API
- Nutrition tracking module
- Social features / sharing progress
- Push notifications for session reminders
- Body metrics (`body_metrics` table, `GET/POST /metrics` endpoints)
