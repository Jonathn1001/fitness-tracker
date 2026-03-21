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
| Database | PostgreSQL (Prisma ORM) | Neon (free, 500MB) |
| AI | Gemini 2.5 Flash API | Google AI Studio (free tier) |

> Render's free tier cold-starts after ~15min of inactivity. Acceptable for personal use.

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

**workout_types**
```
id, name (gym | kickboxing | ...), description
```

**exercise_library**
```
id, name, muscle_group, category, description
```

**round_type_library**
```
id, name (boxing | elbow | knee | kicks | combo), description
```

### Template Tables (Weekly Plan)

**users**
```
id, email, password (hashed), name, created_at
```

**workout_templates**
```
id, user_id (FK), name, is_active, created_at
```

**template_days**
```
id, template_id (FK), day_of_week, workout_type_id (FK), order
```

**template_exercises** (gym days)
```
id, template_day_id (FK), exercise_id (FK), default_sets, default_reps, default_weight, order
```

**template_rounds** (kickboxing days)
```
id, template_day_id (FK), round_type_id (FK), round_number
```

### Session Tables (Logged Workouts)

**sessions**
```
id, user_id (FK), template_day_id (FK), date, warmup_type (walk | run),
warmup_duration_min, notes, completed_at
```

**session_sets** (gym)
```
id, session_id (FK), exercise_id (FK), set_number, reps, weight_kg, completed
```

**session_rounds** (kickboxing)
```
id, session_id (FK), round_type_id (FK), round_number, completed, quality_rating (1–5), notes
```

### Supporting Tables

**ai_feedback**
```
id, user_id (FK), content (text), period_start, period_end, generated_at, context_snapshot (JSON)
```

**body_metrics** (optional, future-ready)
```
id, user_id (FK), recorded_at, weight_kg, notes
```

### Extensibility Notes
- `workout_types`, `exercise_library`, and `round_type_library` are seeded lookup tables — new workout types or exercises can be added without schema changes.
- `template_exercises.default_*` stores planned defaults; `session_sets` stores actuals.
- `ai_feedback.context_snapshot` stores the data used to generate feedback as JSON for debugging and replayability.
- `body_metrics` is ready for future body composition tracking.

---

## Authentication

- JWT-based: access token (15min) + refresh token (7 days, httpOnly cookie)
- NestJS Guards protect all routes except `/auth/*`
- Refresh token rotation on each use
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
├── feedback/      # trigger & retrieve AI feedback
└── metrics/       # body metrics (optional)
```

### Key API Endpoints

```
POST   /auth/signup
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /templates              # user's weekly plan
PATCH  /templates/:id          # customize a template day

POST   /sessions               # start/log a session
GET    /sessions               # history
GET    /sessions/:id           # single session detail
PATCH  /sessions/:id/sets      # update sets logged
PATCH  /sessions/:id/rounds    # update rounds logged

POST   /feedback/generate      # trigger Gemini analysis
GET    /feedback               # feedback history

GET    /metrics
POST   /metrics
```

### Gemini Integration

`POST /feedback/generate` collects the last N sessions, formats them into a structured coaching prompt, calls Gemini 2.5 Flash server-side (API key never exposed to client), and persists the response in `ai_feedback`. The prompt includes:
- Muscle group coverage across gym sessions
- Weight/rep progression per exercise
- Kickboxing round quality trends (ratings per round type)
- Rest day and recovery patterns

---

## Frontend — React PWA

**Stack:** React + Vite + TypeScript + TailwindCSS + React Query + React Router + Axios

**PWA:** `vite-plugin-pwa` — installable, service worker caches app shell, offline-first session logging with background sync.

### Pages

```
/login & /signup          → Auth screens
/dashboard                → Weekly overview, today's session card
/session/:id              → Active session logger
  ├── Gym: sets/reps/weight input per exercise
  └── Kickboxing: complete + rate (1–5) each round
/history                  → Past sessions, filterable by week/month
/progress                 → Line charts: weight over time, round quality trends
/feedback                 → AI feedback cards, "Generate feedback" button
/profile                  → User settings
```

### UX Principles
- Dashboard pre-loads today's template — one tap to start session
- Session logger is mobile-first: large tap targets, minimal keyboard input
- Progress charts via Recharts (lightweight)
- Offline session logging syncs automatically when back online

---

## Future Considerations

- Native mobile app (React Native) using the same NestJS API
- Nutrition tracking module
- Social features / sharing progress
- Push notifications for session reminders
