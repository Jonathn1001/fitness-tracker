# 🏋️ Fitness Tracker

A personal PWA for logging gym strength sessions and kickboxing rounds, with AI-generated training feedback. Built as a mobile-first offline-capable app with a NestJS API backend.

---

## ✨ Features

- 💪 **Gym logging** — track sets, reps, and weight per exercise with a stepper UI
- 🥊 **Kickboxing logging** — rate each round 1–5 for quality tracking
- 📅 **Weekly plan** — template-driven workout schedule (strength + kickboxing days)
- 📈 **Progress charts** — bench press, back squat, and kickboxing quality trends over time
- 🤖 **AI feedback** — Gemini 2.5 Flash generates a 14-day training review (1×/day)
- 📶 **Offline support** — service worker + IndexedDB queue syncs when back online
- 📱 **PWA** — installable on iOS and Android

---

## 🛠 Tech Stack

### Backend
| Layer           | Technology                                          |
| --------------- | --------------------------------------------------- |
| Framework       | NestJS 11                                           |
| Language        | TypeScript 5                                        |
| ORM             | Prisma 7 (PostgreSQL)                               |
| Auth            | JWT (access + refresh tokens, httpOnly cookies)     |
| AI              | Google Gemini 2.5 Flash (`@google/genai`)           |
| Validation      | `class-validator` + `class-transformer`             |
| Security        | Helmet, rate limiting (`@nestjs/throttler`), bcrypt |
| Logging         | `nestjs-pino` (structured JSON)                     |
| Runtime         | Node.js 22                                          |
| Package manager | pnpm 10                                             |

### Frontend
| Layer           | Technology                                      |
| --------------- | ----------------------------------------------- |
| Framework       | React 19                                        |
| Build tool      | Vite 8                                          |
| Language        | TypeScript 6                                    |
| Routing         | React Router 7                                  |
| Data fetching   | TanStack React Query 5                          |
| State           | Zustand 5                                       |
| Offline         | `vite-plugin-pwa` (Workbox) + IndexedDB (`idb`) |
| HTTP client     | Axios                                           |
| Package manager | pnpm 10                                         |

### Infrastructure
| Concern          | Service                          |
| ---------------- | -------------------------------- |
| Backend hosting  | Render (Web Service)             |
| Frontend hosting | GitHub Pages                     |
| Database         | Neon (external PostgreSQL)       |
| CI/CD            | GitHub Actions (`master` branch) |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   GitHub Actions                     │
│   CI (PRs): lint + typecheck + test + build          │
│   Deploy (master): builds and publishes to Pages     │
└──────────────────┬──────────────────────────────────┘
                   │                  Render watches master
                   │                  itself (autoDeploy)
       ┌───────────┴───────────┐
       ▼                       ▼
┌──────────────┐        ┌─────────────┐
│ GitHub Pages │        │   Render    │
│  (React PWA) │◄──────►│  (NestJS)   │
│              │  HTTPS │             │
└──────────────┘        └──────┬──────┘
                               │ Prisma
                         ┌─────▼──────┐
                         │ PostgreSQL │
                         │   (Neon)   │
                         └────────────┘
```

### 🗂 Backend module map

```
src/
├── auth/          JWT signup/login/logout/refresh
├── sessions/      Session lifecycle, sets (gym), rounds (kickboxing)
├── templates/     Weekly workout plan + exercise library
├── feedback/      Gemini AI 14-day review generation
├── prisma/        PrismaService (global)
└── config/        Env validation, logger config
```

### 🗃 Data model (key entities)

```
User → WorkoutTemplate → TemplateDay → TemplateExercise / TemplateRound
User → Session → SessionSet (gym) / SessionRound (kickboxing)
User → AiFeedback
```

---

## 📋 Requirements

- Node.js 22+
- pnpm 10+
- Docker (for local PostgreSQL)
- A Google Gemini API key (free tier works)

---

## 🚀 Running Locally

### 1. Start the database

```bash
# from repo root
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in values (see below)
pnpm install
pnpm exec prisma migrate dev
pnpm exec prisma db seed   # seeds exercise library + default template
pnpm run start:dev
```

Backend runs at `http://localhost:3000`.

**Required `.env` values:**

```env
DATABASE_URL=postgresql://fitness:fitness@localhost:5432/fitness
JWT_SECRET=change-me-32-chars-minimum
JWT_REFRESH_SECRET=change-me-different-32-chars
GEMINI_API_KEY=your-key-here
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL
pnpm install
pnpm run dev
```

Frontend runs at `http://localhost:5173`.

**Required `.env` values:**

```env
VITE_API_URL=http://localhost:3000
```

---

## 🔌 API Routes

| Method | Path                     | Description                   |
| ------ | ------------------------ | ----------------------------- |
| POST   | `/auth/signup`           | Register                      |
| POST   | `/auth/login`            | Login (sets httpOnly cookie)  |
| POST   | `/auth/refresh`          | Rotate refresh token          |
| POST   | `/auth/logout`           | Clear tokens                  |
| GET    | `/templates`             | Weekly plan for current user  |
| PATCH  | `/templates/days/:dayId` | Update a plan day             |
| GET    | `/sessions`              | List sessions                 |
| POST   | `/sessions`              | Create session                |
| GET    | `/sessions/:id`          | Get session detail            |
| POST   | `/sessions/:id/complete` | Mark session complete         |
| PUT    | `/sessions/:id/sets`     | Upsert sets (gym)             |
| PUT    | `/sessions/:id/rounds`   | Upsert rounds (kickboxing)    |
| POST   | `/feedback/generate`     | Generate AI review (1×/day)   |
| GET    | `/feedback`              | List past reviews             |
| GET    | `/health`                | Health check (used by Render) |

---

## ☁️ Deployment

### Prerequisites

1. A Render account with a **Web Service** + **PostgreSQL** database created
2. A Vercel project linked to this repo (`cd frontend && vercel link`)
3. GitHub secrets configured (see below)

### 🔑 GitHub Secrets

**Render (backend):**
| Secret | Where to get it |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render dashboard → service → Settings → Deploy Hook |

**Vercel (frontend):**
| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `frontend/.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | Same file |
| `VITE_API_URL` | Your Render backend URL |

### ⚙️ Render Settings

**Build command:**

```
cd backend && pnpm install && pnpm exec prisma generate && pnpm run build
```

**Start command:**

```
cd backend && pnpm exec prisma migrate deploy && node dist/main
```

**Environment variables** (set in Render dashboard):

```
DATABASE_URL=<from Render Postgres>
DIRECT_URL=<direct connection URL if using a pooler>
JWT_SECRET=
JWT_REFRESH_SECRET=
GEMINI_API_KEY=
FRONTEND_URL=https://your-app.vercel.app
```

### 🔄 Deploy flow

- **Every PR** → GitHub Actions runs build checks on both backend and frontend
- **Merge to `main`** → backend triggers Render deploy hook; frontend deploys via Vercel CLI

---

## 📁 Project Structure

```
fitness-tracker/
├── backend/                NestJS API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
├── frontend/               React PWA
│   ├── public/
│   └── src/
│       ├── api/            Axios API client functions
│       ├── components/     UI components
│       ├── hooks/          React Query hooks
│       ├── offline/        IndexedDB sync queue
│       ├── pages/          Route-level page components
│       └── store/          Zustand stores (auth, theme)
├── .github/workflows/
│   ├── ci.yml              PR build checks
│   └── deploy.yml          Production deploy
└── docker-compose.example.yml
```
