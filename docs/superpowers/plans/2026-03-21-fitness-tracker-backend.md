# Fitness Tracker Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NestJS REST API for the Fitness Tracker app — JWT auth, weekly template management, session logging (gym + kickboxing), and Gemini 2.5 Flash AI feedback.

**Architecture:** NestJS modular monolith with Prisma ORM connecting to Neon PostgreSQL. JWT access tokens (15min) in Authorization header, refresh tokens (7 days) in httpOnly cookies stored server-side (hashed). All session-scoped writes enforce ownership. Gemini called server-side only.

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL (Neon), passport-jwt, bcrypt, @google/genai, class-validator, Jest + Supertest, pnpm

---

## File Map

```
fitness-tracker/backend/
├── prisma/
│   ├── schema.prisma          # Full data model
│   └── seed.ts                # exercise_library + round_type_library data
├── src/
│   ├── main.ts                # Bootstrap: CORS, cookies, validation pipe, port
│   ├── app.module.ts          # Root module — imports all feature modules
│   ├── prisma/
│   │   ├── prisma.module.ts   # Global PrismaModule
│   │   └── prisma.service.ts  # Extends PrismaClient, onModuleInit connect
│   ├── common/
│   │   └── decorators/
│   │       └── current-user.decorator.ts  # @CurrentUser() param decorator
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts   # POST /auth/signup, login, refresh, logout
│   │   ├── auth.service.ts      # signup, login, refresh, logout logic
│   │   ├── jwt.strategy.ts      # Passport JWT strategy (access token)
│   │   ├── jwt-auth.guard.ts    # JwtAuthGuard — applied globally via APP_GUARD
│   │   └── dto/
│   │       ├── signup.dto.ts
│   │       └── login.dto.ts
│   ├── templates/
│   │   ├── templates.module.ts
│   │   ├── templates.controller.ts  # GET /templates, PATCH /templates/days/:dayId
│   │   ├── templates.service.ts     # getWeeklyPlan, updateDay
│   │   ├── template-seeder.service.ts  # seedForUser() — called from auth.service on signup
│   │   └── dto/
│   │       └── update-template-day.dto.ts
│   ├── sessions/
│   │   ├── sessions.module.ts
│   │   ├── sessions.controller.ts  # All /sessions/* endpoints
│   │   ├── sessions.service.ts     # create, list, findOne, update, complete, delete
│   │   ├── sets.service.ts         # upsertSets, updateSet — owns idempotency logic
│   │   ├── rounds.service.ts       # upsertRounds, updateRound
│   │   └── dto/
│   │       ├── create-session.dto.ts
│   │       ├── update-session.dto.ts
│   │       ├── upsert-set.dto.ts
│   │       └── upsert-round.dto.ts
│   └── feedback/
│       ├── feedback.module.ts
│       ├── feedback.controller.ts  # POST /feedback/generate, GET /feedback
│       ├── feedback.service.ts     # generate, list, rate-limit check
│       └── gemini.service.ts       # Wraps @google/genai — buildPrompt, call API
├── test/
│   ├── jest-e2e.json
│   ├── setup.ts               # Create test DB tables before suite, truncate between tests
│   ├── auth.e2e-spec.ts
│   ├── templates.e2e-spec.ts
│   ├── sessions.e2e-spec.ts
│   └── feedback.e2e-spec.ts
├── .env.example
├── .env                       # gitignored
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `fitness-tracker/backend/` (whole directory via `nest new`)
- Modify: `backend/src/main.ts`
- Modify: `backend/package.json` (add scripts)

- [ ] **Step 1: Scaffold NestJS project**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
pnpm dlx @nestjs/cli new backend --package-manager pnpm --skip-git
cd backend
```

Expected: NestJS project created with `src/app.module.ts`, `src/main.ts`, etc.

- [ ] **Step 2: Install all backend dependencies**

```bash
# Core
pnpm add @nestjs/passport passport passport-jwt @nestjs/jwt
pnpm add @prisma/client @nestjs/config
pnpm add bcrypt cookie-parser class-validator class-transformer
pnpm add @google/genai

# Dev
pnpm add -D prisma @types/passport-jwt @types/bcrypt @types/cookie-parser
pnpm add -D @types/supertest supertest
pnpm add uuid && pnpm add -D @types/uuid
```

- [ ] **Step 3: Init Prisma**

```bash
pnpm exec prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` and `.env` created.

- [ ] **Step 4: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require&connection_limit=5"
TEST_DATABASE_URL="postgresql://user:password@host/testdb?sslmode=require&connection_limit=5"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_REFRESH_SECRET="change-me-to-another-long-random-string"
GEMINI_API_KEY="your-google-ai-studio-key"
EOF
```

- [ ] **Step 5: Update `src/main.ts`**

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

- [ ] **Step 6: Verify server starts**

```bash
pnpm run start:dev
```

Expected: `Application is running on: http://[::1]:3000`
Kill with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add backend/
git commit -m "feat: scaffold NestJS backend with dependencies"
```

---

## Task 2: Prisma Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Write the full schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum DayOfWeek {
  mon
  tue
  wed
  thu
  fri
  sat
  sun
}

enum WorkoutType {
  gym
  kickboxing
}

enum WarmupType {
  walk
  run
}

enum SessionStatus {
  in_progress
  completed
}

// ─── Auth ────────────────────────────────────────────────────────────────────

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now()) @map("created_at")

  refreshTokens    RefreshToken[]
  workoutTemplates WorkoutTemplate[]
  sessions         Session[]
  aiFeedback       AiFeedback[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   // bcrypt hash of the raw token
  expiresAt DateTime @map("expires_at")
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

// ─── Library / Lookup ────────────────────────────────────────────────────────

model ExerciseLibrary {
  id          String @id @default(uuid())
  name        String @unique
  muscleGroup String @map("muscle_group")
  category    String
  description String?

  templateExercises TemplateExercise[]
  sessionSets       SessionSet[]

  @@map("exercise_library")
}

model RoundTypeLibrary {
  id          String  @id @default(uuid())
  name        String  @unique // boxing | elbow | knee | kicks | combo
  description String?

  sessionRounds SessionRound[]
  TemplateRound TemplateRound[]

  @@map("round_type_library")
}

// ─── Templates ───────────────────────────────────────────────────────────────

model WorkoutTemplate {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  templateDays TemplateDay[]

  @@map("workout_templates")
}

model TemplateDay {
  id          String      @id @default(uuid())
  templateId  String      @map("template_id")
  dayOfWeek   DayOfWeek   @map("day_of_week")
  workoutType WorkoutType @map("workout_type")

  template          WorkoutTemplate    @relation(fields: [templateId], references: [id], onDelete: Cascade)
  templateExercises TemplateExercise[]
  templateRounds    TemplateRound[]
  sessions          Session[]

  @@unique([templateId, dayOfWeek])
  @@map("template_days")
}

model TemplateExercise {
  id              String @id @default(uuid())
  templateDayId   String @map("template_day_id")
  exerciseId      String @map("exercise_id")
  defaultSets     Int    @map("default_sets")
  defaultReps     Int    @map("default_reps")
  defaultWeightKg Float  @default(0) @map("default_weight_kg")
  order           Int

  templateDay TemplateDay     @relation(fields: [templateDayId], references: [id], onDelete: Cascade)
  exercise    ExerciseLibrary @relation(fields: [exerciseId], references: [id])

  @@map("template_exercises")
}

model TemplateRound {
  id            String @id @default(uuid())
  templateDayId String @map("template_day_id")
  roundTypeId   String @map("round_type_id")
  roundNumber   Int    @map("round_number")

  templateDay TemplateDay      @relation(fields: [templateDayId], references: [id], onDelete: Cascade)
  roundType   RoundTypeLibrary @relation(fields: [roundTypeId], references: [id])

  @@map("template_rounds")
}

// ─── Sessions ────────────────────────────────────────────────────────────────

model Session {
  id               String        @id @default(uuid())
  userId           String        @map("user_id")
  templateDayId    String?       @map("template_day_id")
  date             DateTime      @db.Date
  warmupType       WarmupType?   @map("warmup_type")
  warmupDurationMin Int?         @map("warmup_duration_min")
  notes            String?
  status           SessionStatus @default(in_progress)
  completedAt      DateTime?     @map("completed_at")
  idempotencyKey   String        @unique @map("idempotency_key")

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  templateDay TemplateDay? @relation(fields: [templateDayId], references: [id])
  sessionSets SessionSet[]
  sessionRounds SessionRound[]

  @@index([userId, date])
  @@map("sessions")
}

model SessionSet {
  id             String  @id @default(uuid())
  sessionId      String  @map("session_id")
  exerciseId     String  @map("exercise_id")
  setNumber      Int     @map("set_number")
  reps           Int
  weightKg       Float   @map("weight_kg")
  completed      Boolean @default(false)
  idempotencyKey String  @unique @map("idempotency_key")

  session  Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  exercise ExerciseLibrary @relation(fields: [exerciseId], references: [id])

  @@map("session_sets")
}

model SessionRound {
  id             String  @id @default(uuid())
  sessionId      String  @map("session_id")
  roundTypeId    String  @map("round_type_id")
  roundNumber    Int     @map("round_number")
  completed      Boolean @default(false)
  qualityRating  Int?    @map("quality_rating") // 1-5
  notes          String?
  idempotencyKey String  @unique @map("idempotency_key")

  session   Session          @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  roundType RoundTypeLibrary @relation(fields: [roundTypeId], references: [id])

  @@map("session_rounds")
}

// ─── AI Feedback ─────────────────────────────────────────────────────────────

model AiFeedback {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  content         String
  periodStart     DateTime @map("period_start") @db.Date
  periodEnd       DateTime @map("period_end") @db.Date
  generatedAt     DateTime @default(now()) @map("generated_at")
  contextSnapshot Json     @map("context_snapshot") // JSONB in PostgreSQL

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, generatedAt]) // prevents race-condition duplicates (partial — see feedback.service for daily enforcement)
  @@index([userId, generatedAt])
  @@map("ai_feedback")
}
```

> **Note on `RoundTypeLibrary` self-relation:** Remove the `roundTypes` line above — it was a mistake. The final schema has no self-relation on that model.

- [ ] **Step 2: Run migration**

Set `DATABASE_URL` in `.env` to your Neon connection string first, then:

```bash
pnpm exec prisma migrate dev --name init
```

Expected: Migration applied, `PrismaClient` generated.

- [ ] **Step 3: Verify schema in Prisma Studio**

```bash
pnpm exec prisma studio
```

Open http://localhost:5555 — confirm all tables exist. Kill with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add backend/prisma/
git commit -m "feat: define Prisma schema and run initial migration"
```

---

## Task 3: PrismaService + Seed Data

**Files:**
- Create: `backend/src/prisma/prisma.module.ts`
- Create: `backend/src/prisma/prisma.service.ts`
- Create: `backend/prisma/seed.ts`
- Modify: `backend/package.json` (add prisma.seed)

- [ ] **Step 1: Create PrismaService**

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 2: Create PrismaModule (global)**

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Write seed data**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const exercises = [
  // Upper body
  { name: 'Bench Press', muscleGroup: 'Chest', category: 'upper' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', category: 'upper' },
  { name: 'Pull-Up', muscleGroup: 'Back', category: 'upper' },
  { name: 'Barbell Row', muscleGroup: 'Back', category: 'upper' },
  { name: 'Overhead Press', muscleGroup: 'Shoulders', category: 'upper' },
  // Lower body
  { name: 'Squat', muscleGroup: 'Quads', category: 'lower' },
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', category: 'lower' },
  { name: 'Leg Press', muscleGroup: 'Quads', category: 'lower' },
  { name: 'Calf Raise', muscleGroup: 'Calves', category: 'lower' },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings', category: 'lower' },
  // Arms
  { name: 'Barbell Curl', muscleGroup: 'Biceps', category: 'arms' },
  { name: 'Hammer Curl', muscleGroup: 'Biceps', category: 'arms' },
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps', category: 'arms' },
  { name: 'Skull Crusher', muscleGroup: 'Triceps', category: 'arms' },
  // Chest
  { name: 'Cable Fly', muscleGroup: 'Chest', category: 'chest' },
  { name: 'Dips', muscleGroup: 'Chest/Triceps', category: 'chest' },
  { name: 'Pec Deck', muscleGroup: 'Chest', category: 'chest' },
  // Shoulder-Back
  { name: 'Lateral Raise', muscleGroup: 'Shoulders', category: 'shoulder-back' },
  { name: 'Face Pull', muscleGroup: 'Rear Delts', category: 'shoulder-back' },
  { name: 'Deadlift', muscleGroup: 'Back', category: 'shoulder-back' },
  { name: 'Shrug', muscleGroup: 'Traps', category: 'shoulder-back' },
  // Abs (included in all gym days)
  { name: 'Plank', muscleGroup: 'Core', category: 'abs' },
  { name: 'Crunch', muscleGroup: 'Core', category: 'abs' },
  { name: 'Leg Raise', muscleGroup: 'Core', category: 'abs' },
];

const roundTypes = [
  { name: 'boxing', description: '3 rounds of boxing combinations' },
  { name: 'elbow', description: '1 round of elbow strikes' },
  { name: 'knee', description: '1 round of knee strikes' },
  { name: 'kicks', description: '4 rounds of kick combinations' },
  { name: 'combo', description: '1 round of full combinations' },
];

async function main() {
  console.log('Seeding exercise library...');
  for (const ex of exercises) {
    await prisma.exerciseLibrary.upsert({
      where: { name: ex.name },
      update: {},
      create: ex,
    });
  }

  console.log('Seeding round type library...');
  for (const rt of roundTypes) {
    await prisma.roundTypeLibrary.upsert({
      where: { name: rt.name },
      update: {},
      create: rt,
    });
  }

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Add seed script to `package.json`**

In `package.json`, add under the root object:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Also install `ts-node` if not present:
```bash
pnpm add -D ts-node
```

- [ ] **Step 5: Run seed**

```bash
pnpm exec prisma db seed
```

Expected:
```
Seeding exercise library...
Seeding round type library...
Seed complete.
```

- [ ] **Step 6: Import PrismaModule in AppModule**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add backend/
git commit -m "feat: add PrismaService and seed exercise/round-type libraries"
```

---

## Task 4: Auth — Signup & Login

**Files:**
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/jwt.strategy.ts`
- Create: `backend/src/auth/jwt-auth.guard.ts`
- Create: `backend/src/auth/dto/signup.dto.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/common/decorators/current-user.decorator.ts`
- Create: `backend/test/auth.e2e-spec.ts`

- [ ] **Step 1: Write the e2e test (signup + login)**

```typescript
// test/auth.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.sessionRound.deleteMany();
    await prisma.sessionSet.deleteMany();
    await prisma.session.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.aiFeedback.deleteMany();
    await prisma.templateExercise.deleteMany();
    await prisma.templateRound.deleteMany();
    await prisma.templateDay.deleteMany();
    await prisma.workoutTemplate.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/signup — creates user and returns access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test User' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined(); // refresh token cookie
  });

  it('POST /auth/signup — rejects duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test User' });

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Another' })
      .expect(409);
  });

  it('POST /auth/login — returns access token for valid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test User' });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Password1!' })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /auth/login — rejects wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test User' });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
      .expect(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pnpm run test:e2e -- --testPathPattern=auth
```

Expected: FAIL — `Cannot find module '../src/app.module'` or route not found.

- [ ] **Step 3: Create DTOs**

```typescript
// src/auth/dto/signup.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;
}
```

```typescript
// src/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

- [ ] **Step 4: Create JWT strategy**

```typescript
// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

- [ ] **Step 5: Create JwtAuthGuard**

```typescript
// src/auth/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 6: Create @CurrentUser decorator**

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 7: Create AuthService**

```typescript
// src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name },
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.email);
  }

  async refresh(rawRefreshToken: string) {
    let payload: { sub: string; email: string };
    try {
      payload = this.jwt.verify(rawRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find a non-revoked, non-expired token for this user
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, revoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!stored) throw new UnauthorizedException('Refresh token not found or expired');

    const matches = await bcrypt.compare(rawRefreshToken, stored.token);
    if (!matches) throw new UnauthorizedException('Invalid refresh token');

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    return this.issueTokens(payload.sub, payload.email);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '15m',
      secret: this.config.get('JWT_SECRET'),
    });

    const rawRefresh = this.jwt.sign(payload, {
      expiresIn: '7d',
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: await bcrypt.hash(rawRefresh, 10),
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }
}
```

- [ ] **Step 8: Create AuthController**

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Body, Res, Req, HttpCode, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.signup(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['refresh_token'];
    const { accessToken, refreshToken } = await this.authService.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@CurrentUser() user: { id: string }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    res.clearCookie('refresh_token');
    return { message: 'Logged out' };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
```

- [ ] **Step 9: Create AuthModule**

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets provided per-call via ConfigService
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 10: Add AuthModule to AppModule**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 11: Configure e2e test to use `TEST_DATABASE_URL`**

In `test/jest-e2e.json`, verify:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "setupFiles": ["./test/setup.ts"]
}
```

Create `test/setup.ts`:
```typescript
// test/setup.ts
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
```

- [ ] **Step 12: Run tests**

```bash
pnpm run test:e2e -- --testPathPattern=auth
```

Expected: All 4 auth tests PASS.

- [ ] **Step 13: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add backend/
git commit -m "feat: auth module — signup, login, JWT, refresh token rotation"
```

---

## Task 5: Templates Module

**Files:**
- Create: `backend/src/templates/templates.module.ts`
- Create: `backend/src/templates/templates.controller.ts`
- Create: `backend/src/templates/templates.service.ts`
- Create: `backend/src/templates/template-seeder.service.ts`
- Create: `backend/src/templates/dto/update-template-day.dto.ts`
- Create: `backend/test/templates.e2e-spec.ts`

- [ ] **Step 1: Write e2e tests**

```typescript
// test/templates.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Templates (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let templateDayId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    // Clean and re-seed a fresh user
    await prisma.templateExercise.deleteMany();
    await prisma.templateRound.deleteMany();
    await prisma.templateDay.deleteMany();
    await prisma.workoutTemplate.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test' });
    accessToken = res.body.accessToken;

    const plan = await request(app.getHttpServer())
      .get('/templates')
      .set('Authorization', `Bearer ${accessToken}`);
    templateDayId = plan.body.days[0].id; // Monday
  });

  afterAll(() => app.close());

  it('GET /templates — returns 7-day weekly plan for authenticated user', async () => {
    const res = await request(app.getHttpServer())
      .get('/templates')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.days).toHaveLength(7);
    expect(res.body.days[0].dayOfWeek).toBe('mon');
    expect(res.body.days[0].workoutType).toBe('gym');
    expect(res.body.days[5].workoutType).toBe('kickboxing'); // Saturday
  });

  it('GET /templates — returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/templates').expect(401);
  });

  it('PATCH /templates/days/:dayId — replaces exercises for a gym day', async () => {
    const exercises = await prisma.exerciseLibrary.findMany({ take: 2 });

    const res = await request(app.getHttpServer())
      .patch(`/templates/days/${templateDayId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exercises: [
          { exerciseId: exercises[0].id, defaultSets: 4, defaultReps: 8, defaultWeightKg: 80, order: 1 },
          { exerciseId: exercises[1].id, defaultSets: 3, defaultReps: 12, defaultWeightKg: 60, order: 2 },
        ],
      })
      .expect(200);

    expect(res.body.exercises).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
pnpm run test:e2e -- --testPathPattern=templates
```

Expected: FAIL — routes not found.

- [ ] **Step 3: Create DTO**

```typescript
// src/templates/dto/update-template-day.dto.ts
import { IsArray, IsOptional, ValidateNested, IsUUID, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateExerciseDto {
  @IsUUID() exerciseId: string;
  @IsInt() @Min(1) defaultSets: number;
  @IsInt() @Min(1) defaultReps: number;
  @IsNumber() @Min(0) defaultWeightKg: number;
  @IsInt() @Min(1) order: number;
}

export class UpdateRoundDto {
  @IsUUID() roundTypeId: string;
  @IsInt() @Min(1) roundNumber: number;
}

export class UpdateTemplateDayDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateExerciseDto)
  exercises?: UpdateExerciseDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateRoundDto)
  rounds?: UpdateRoundDto[];
}
```

- [ ] **Step 4: Create TemplateSeederService**

```typescript
// src/templates/template-seeder.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GYM_DAYS: Array<{ day: string; category: string; label: string }> = [
  { day: 'mon', category: 'upper', label: 'Upper Body' },
  { day: 'tue', category: 'lower', label: 'Lower Body' },
  { day: 'wed', category: 'arms', label: 'Arms' },
  { day: 'thu', category: 'chest', label: 'Chest' },
  { day: 'fri', category: 'shoulder-back', label: 'Shoulder-Back' },
];

const KICKBOXING_ROUNDS = [
  { name: 'boxing', count: 3 },
  { name: 'elbow', count: 1 },
  { name: 'knee', count: 1 },
  { name: 'kicks', count: 4 },
  { name: 'combo', count: 1 },
];

@Injectable()
export class TemplateSeederService {
  constructor(private prisma: PrismaService) {}

  async seedForUser(userId: string) {
    const template = await this.prisma.workoutTemplate.create({
      data: { userId, name: 'My Weekly Plan' },
    });

    // Gym days
    for (const { day, category } of GYM_DAYS) {
      const exercises = await this.prisma.exerciseLibrary.findMany({
        where: { category },
      });

      const templateDay = await this.prisma.templateDay.create({
        data: { templateId: template.id, dayOfWeek: day as any, workoutType: 'gym' },
      });

      await this.prisma.templateExercise.createMany({
        data: exercises.map((ex, i) => ({
          templateDayId: templateDay.id,
          exerciseId: ex.id,
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 0,
          order: i + 1,
        })),
      });
    }

    // Kickboxing days
    const roundTypes = await this.prisma.roundTypeLibrary.findMany();
    const roundTypeMap = Object.fromEntries(roundTypes.map((r) => [r.name, r.id]));

    for (const kbDay of ['sat', 'sun']) {
      const templateDay = await this.prisma.templateDay.create({
        data: { templateId: template.id, dayOfWeek: kbDay as any, workoutType: 'kickboxing' },
      });

      let roundNumber = 1;
      const roundData: Array<{ templateDayId: string; roundTypeId: string; roundNumber: number }> = [];
      for (const { name, count } of KICKBOXING_ROUNDS) {
        for (let i = 0; i < count; i++) {
          roundData.push({
            templateDayId: templateDay.id,
            roundTypeId: roundTypeMap[name],
            roundNumber: roundNumber++,
          });
        }
      }
      await this.prisma.templateRound.createMany({ data: roundData });
    }
  }
}
```

- [ ] **Step 5: Create TemplatesService**

```typescript
// src/templates/templates.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTemplateDayDto } from './dto/update-template-day.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async getWeeklyPlan(userId: string) {
    const template = await this.prisma.workoutTemplate.findFirst({
      where: { userId, isActive: true },
      include: {
        templateDays: {
          orderBy: { dayOfWeek: 'asc' },
          include: {
            templateExercises: {
              orderBy: { order: 'asc' },
              include: { exercise: true },
            },
            templateRounds: {
              orderBy: { roundNumber: 'asc' },
              include: { roundType: true },
            },
          },
        },
      },
    });

    if (!template) throw new NotFoundException('No active template found');
    return { id: template.id, name: template.name, days: template.templateDays };
  }

  async updateDay(userId: string, dayId: string, dto: UpdateTemplateDayDto) {
    const day = await this.prisma.templateDay.findFirst({
      where: { id: dayId, template: { userId } },
    });
    if (!day) throw new NotFoundException('Template day not found');

    if (dto.exercises) {
      await this.prisma.templateExercise.deleteMany({ where: { templateDayId: dayId } });
      await this.prisma.templateExercise.createMany({
        data: dto.exercises.map((e) => ({ templateDayId: dayId, ...e, defaultWeightKg: e.defaultWeightKg })),
      });
    }

    if (dto.rounds) {
      await this.prisma.templateRound.deleteMany({ where: { templateDayId: dayId } });
      await this.prisma.templateRound.createMany({
        data: dto.rounds.map((r) => ({ templateDayId: dayId, roundTypeId: r.roundTypeId, roundNumber: r.roundNumber })),
      });
    }

    return this.prisma.templateDay.findUnique({
      where: { id: dayId },
      include: {
        templateExercises: { include: { exercise: true } },
        templateRounds: { include: { roundType: true } },
      },
    });
  }
}
```

- [ ] **Step 6: Create TemplatesController**

```typescript
// src/templates/templates.controller.ts
import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { UpdateTemplateDayDto } from './dto/update-template-day.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  getWeeklyPlan(@CurrentUser() user: { id: string }) {
    return this.templatesService.getWeeklyPlan(user.id);
  }

  @Patch('days/:dayId')
  updateDay(
    @CurrentUser() user: { id: string },
    @Param('dayId') dayId: string,
    @Body() dto: UpdateTemplateDayDto,
  ) {
    return this.templatesService.updateDay(user.id, dayId, dto);
  }
}
```

- [ ] **Step 7: Create TemplatesModule and wire up**

```typescript
// src/templates/templates.module.ts
import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplateSeederService } from './template-seeder.service';

@Module({
  providers: [TemplatesService, TemplateSeederService],
  controllers: [TemplatesController],
  exports: [TemplateSeederService],
})
export class TemplatesModule {}
```

Add to `AppModule`:
```typescript
import { TemplatesModule } from './templates/templates.module';
// add TemplatesModule to imports array
```

- [ ] **Step 8: Call seeder from AuthService on signup**

In `src/auth/auth.module.ts`, import TemplatesModule:
```typescript
import { TemplatesModule } from '../templates/templates.module';
// add to imports array
```

In `src/auth/auth.service.ts`, inject and call:
```typescript
import { TemplateSeederService } from '../templates/template-seeder.service';
// Add to constructor: private seeder: TemplateSeederService
// In signup(), after user created: await this.seeder.seedForUser(user.id);
```

- [ ] **Step 9: Run tests**

```bash
pnpm run test:e2e -- --testPathPattern=templates
```

Expected: All 3 tests PASS.

- [ ] **Step 10: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add backend/
git commit -m "feat: templates module — weekly plan with auto-seed on signup"
```

---

## Task 6: Sessions Module

**Files:**
- Create: `backend/src/sessions/sessions.module.ts`
- Create: `backend/src/sessions/sessions.controller.ts`
- Create: `backend/src/sessions/sessions.service.ts`
- Create: `backend/src/sessions/sets.service.ts`
- Create: `backend/src/sessions/rounds.service.ts`
- Create: `backend/src/sessions/dto/create-session.dto.ts`
- Create: `backend/src/sessions/dto/update-session.dto.ts`
- Create: `backend/src/sessions/dto/upsert-set.dto.ts`
- Create: `backend/src/sessions/dto/upsert-round.dto.ts`
- Create: `backend/test/sessions.e2e-spec.ts`

- [ ] **Step 1: Write e2e tests**

```typescript
// test/sessions.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let templateDayId: string; // Monday gym day

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.sessionRound.deleteMany();
    await prisma.sessionSet.deleteMany();
    await prisma.session.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.aiFeedback.deleteMany();
    await prisma.templateExercise.deleteMany();
    await prisma.templateRound.deleteMany();
    await prisma.templateDay.deleteMany();
    await prisma.workoutTemplate.deleteMany();
    await prisma.user.deleteMany();

    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test' });
    accessToken = res.body.accessToken;

    const plan = await request(app.getHttpServer())
      .get('/templates')
      .set('Authorization', `Bearer ${accessToken}`);
    templateDayId = plan.body.days[0].id;
  });

  afterAll(() => app.close());

  it('POST /sessions — creates in_progress session with idempotency key', async () => {
    const key = uuidv4();
    const res = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', warmupType: 'run', warmupDurationMin: 10, idempotencyKey: key })
      .expect(201);

    expect(res.body.status).toBe('in_progress');
    expect(res.body.id).toBeDefined();

    // Duplicate key returns same session
    const dup = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', warmupType: 'run', warmupDurationMin: 10, idempotencyKey: key })
      .expect(201);

    expect(dup.body.id).toBe(res.body.id);
  });

  it('POST /sessions/:id/complete — marks session completed', async () => {
    const { body: session } = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', idempotencyKey: uuidv4() });

    await request(app.getHttpServer())
      .post(`/sessions/${session.id}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/sessions/${session.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(detail.body.status).toBe('completed');
    expect(detail.body.completedAt).toBeDefined();
  });

  it('DELETE /sessions/:id — deletes in_progress session, rejects completed', async () => {
    const { body: session } = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', idempotencyKey: uuidv4() });

    await request(app.getHttpServer())
      .post(`/sessions/${session.id}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);

    await request(app.getHttpServer())
      .delete(`/sessions/${session.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('PUT /sessions/:id/sets — upserts sets, skips duplicate idempotency keys', async () => {
    const { body: session } = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ templateDayId, date: '2026-03-24', idempotencyKey: uuidv4() });

    const exercise = await prisma.exerciseLibrary.findFirst();
    const key1 = uuidv4();

    const res = await request(app.getHttpServer())
      .put(`/sessions/${session.id}/sets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        { exerciseId: exercise.id, setNumber: 1, reps: 10, weightKg: 80, completed: true, idempotencyKey: key1 },
        { exerciseId: exercise.id, setNumber: 2, reps: 8, weightKg: 82.5, completed: false, idempotencyKey: uuidv4() },
      ])
      .expect(200);

    expect(res.body).toHaveLength(2);

    // Replay with same key1 — should not duplicate
    await request(app.getHttpServer())
      .put(`/sessions/${session.id}/sets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        { exerciseId: exercise.id, setNumber: 1, reps: 10, weightKg: 80, completed: true, idempotencyKey: key1 },
      ])
      .expect(200);

    const sets = await prisma.sessionSet.findMany({ where: { sessionId: session.id } });
    expect(sets).toHaveLength(2); // not 3
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm run test:e2e -- --testPathPattern=sessions
```

Expected: FAIL.

- [ ] **Step 3: Create DTOs**

```typescript
// src/sessions/dto/create-session.dto.ts
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateSessionDto {
  @IsOptional() @IsUUID() templateDayId?: string;
  @IsDateString() date: string;
  @IsOptional() @IsEnum(['walk', 'run']) warmupType?: 'walk' | 'run';
  @IsOptional() @IsInt() @Min(1) warmupDurationMin?: number;
  @IsOptional() notes?: string;
  @IsUUID() idempotencyKey: string;
}
```

```typescript
// src/sessions/dto/update-session.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSessionDto {
  @IsOptional() @IsEnum(['walk', 'run']) warmupType?: 'walk' | 'run';
  @IsOptional() @IsInt() @Min(1) warmupDurationMin?: number;
  @IsOptional() @IsString() notes?: string;
}
```

```typescript
// src/sessions/dto/upsert-set.dto.ts
import { IsBoolean, IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class UpsertSetDto {
  @IsUUID() exerciseId: string;
  @IsInt() @Min(1) setNumber: number;
  @IsInt() @Min(0) reps: number;
  @IsNumber() @Min(0) weightKg: number;
  @IsBoolean() completed: boolean;
  @IsUUID() idempotencyKey: string;
}
```

```typescript
// src/sessions/dto/upsert-round.dto.ts
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpsertRoundDto {
  @IsUUID() roundTypeId: string;
  @IsInt() @Min(1) roundNumber: number;
  @IsBoolean() completed: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(5) qualityRating?: number;
  @IsOptional() @IsString() notes?: string;
  @IsUUID() idempotencyKey: string;
}
```

- [ ] **Step 4: Create SessionsService**

```typescript
// src/sessions/sessions.service.ts
import {
  Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSessionDto) {
    // Idempotency check
    const existing = await this.prisma.session.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return existing;

    // Validate warmup is not set for kickboxing
    if (dto.templateDayId && (dto.warmupType || dto.warmupDurationMin)) {
      const day = await this.prisma.templateDay.findUnique({ where: { id: dto.templateDayId } });
      if (day?.workoutType === 'kickboxing') {
        throw new BadRequestException('Warmup fields are not valid for kickboxing sessions');
      }
    }

    return this.prisma.session.create({
      data: {
        userId,
        templateDayId: dto.templateDayId ?? null,
        date: new Date(dto.date),
        warmupType: dto.warmupType ?? null,
        warmupDurationMin: dto.warmupDurationMin ?? null,
        notes: dto.notes ?? null,
        idempotencyKey: dto.idempotencyKey,
      },
    });
  }

  async findAll(userId: string, query: { from?: string; to?: string; status?: string; page?: number; limit?: number }) {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where: {
          userId,
          date: { gte: from, lte: to },
          ...(query.status ? { status: query.status as any } : {}),
        },
        select: { id: true, date: true, status: true, completedAt: true, templateDayId: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.session.count({
        where: { userId, date: { gte: from, lte: to } },
      }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(userId: string, id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        sessionSets: { include: { exercise: true } },
        sessionRounds: { include: { roundType: true } },
      },
    });
    if (!session) throw new NotFoundException();
    if (session.userId !== userId) throw new ForbiddenException();
    return session;
  }

  async update(userId: string, id: string, dto: UpdateSessionDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.session.update({ where: { id }, data: dto });
  }

  async complete(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    return this.prisma.session.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  async remove(userId: string, id: string) {
    const session = await this.assertOwnership(userId, id);
    if (session.status === 'completed') {
      throw new ConflictException('Cannot delete a completed session');
    }
    await this.prisma.session.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException();
    if (session.userId !== userId) throw new ForbiddenException();
    return session;
  }
}
```

- [ ] **Step 5: Create SetsService**

```typescript
// src/sessions/sets.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSetDto } from './dto/upsert-set.dto';

@Injectable()
export class SetsService {
  constructor(private prisma: PrismaService) {}

  async upsertSets(userId: string, sessionId: string, dtos: UpsertSetDto[]) {
    await this.assertOwnership(userId, sessionId);
    const results = [];
    for (const dto of dtos) {
      const existing = await this.prisma.sessionSet.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) { results.push(existing); continue; }

      const created = await this.prisma.sessionSet.create({
        data: { sessionId, exerciseId: dto.exerciseId, setNumber: dto.setNumber,
                reps: dto.reps, weightKg: dto.weightKg, completed: dto.completed,
                idempotencyKey: dto.idempotencyKey },
      });
      results.push(created);
    }
    return results;
  }

  async updateSet(userId: string, sessionId: string, setId: string, data: Partial<{ reps: number; weightKg: number; completed: boolean }>) {
    await this.assertOwnership(userId, sessionId);
    return this.prisma.sessionSet.update({ where: { id: setId }, data });
  }

  private async assertOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException();
    if (session.userId !== userId) throw new ForbiddenException();
  }
}
```

- [ ] **Step 6: Create RoundsService**

```typescript
// src/sessions/rounds.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRoundDto } from './dto/upsert-round.dto';

@Injectable()
export class RoundsService {
  constructor(private prisma: PrismaService) {}

  async upsertRounds(userId: string, sessionId: string, dtos: UpsertRoundDto[]) {
    await this.assertOwnership(userId, sessionId);
    const results = [];
    for (const dto of dtos) {
      const existing = await this.prisma.sessionRound.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) { results.push(existing); continue; }

      const created = await this.prisma.sessionRound.create({
        data: { sessionId, roundTypeId: dto.roundTypeId, roundNumber: dto.roundNumber,
                completed: dto.completed, qualityRating: dto.qualityRating ?? null,
                notes: dto.notes ?? null, idempotencyKey: dto.idempotencyKey },
      });
      results.push(created);
    }
    return results;
  }

  async updateRound(userId: string, sessionId: string, roundId: string, data: Partial<{ completed: boolean; qualityRating: number; notes: string }>) {
    await this.assertOwnership(userId, sessionId);
    return this.prisma.sessionRound.update({ where: { id: roundId }, data });
  }

  private async assertOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException();
    if (session.userId !== userId) throw new ForbiddenException();
  }
}
```

- [ ] **Step 7: Create SessionsController**

```typescript
// src/sessions/sessions.controller.ts
import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { SetsService } from './sets.service';
import { RoundsService } from './rounds.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { UpsertSetDto } from './dto/upsert-set.dto';
import { UpsertRoundDto } from './dto/upsert-round.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private sessionsService: SessionsService,
    private setsService: SetsService,
    private roundsService: RoundsService,
  ) {}

  @Post() create(@CurrentUser() u: { id: string }, @Body() dto: CreateSessionDto) {
    return this.sessionsService.create(u.id, dto);
  }

  @Get() findAll(@CurrentUser() u: { id: string }, @Query() query: any) {
    return this.sessionsService.findAll(u.id, query);
  }

  @Get(':id') findOne(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.sessionsService.findOne(u.id, id);
  }

  @Patch(':id') update(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionsService.update(u.id, id, dto);
  }

  @Post(':id/complete') @HttpCode(200) complete(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.sessionsService.complete(u.id, id);
  }

  @Delete(':id') @HttpCode(200) remove(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return this.sessionsService.remove(u.id, id);
  }

  @Put(':id/sets') upsertSets(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dtos: UpsertSetDto[]) {
    return this.setsService.upsertSets(u.id, id, dtos);
  }

  @Patch(':id/sets/:setId') updateSet(@CurrentUser() u: { id: string }, @Param('id') id: string, @Param('setId') setId: string, @Body() data: any) {
    return this.setsService.updateSet(u.id, id, setId, data);
  }

  @Put(':id/rounds') upsertRounds(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dtos: UpsertRoundDto[]) {
    return this.roundsService.upsertRounds(u.id, id, dtos);
  }

  @Patch(':id/rounds/:roundId') updateRound(@CurrentUser() u: { id: string }, @Param('id') id: string, @Param('roundId') roundId: string, @Body() data: any) {
    return this.roundsService.updateRound(u.id, id, roundId, data);
  }
}
```

- [ ] **Step 8: Create SessionsModule and add to AppModule**

```typescript
// src/sessions/sessions.module.ts
import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SetsService } from './sets.service';
import { RoundsService } from './rounds.service';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SetsService, RoundsService],
})
export class SessionsModule {}
```

Add `SessionsModule` to `AppModule` imports.

- [ ] **Step 9: Run tests**

```bash
pnpm run test:e2e -- --testPathPattern=sessions
```

Expected: All session tests PASS.

- [ ] **Step 10: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add backend/
git commit -m "feat: sessions module — create, lifecycle, sets, rounds with idempotency"
```

---

## Task 7: Feedback Module

**Files:**
- Create: `backend/src/feedback/feedback.module.ts`
- Create: `backend/src/feedback/feedback.controller.ts`
- Create: `backend/src/feedback/feedback.service.ts`
- Create: `backend/src/feedback/gemini.service.ts`
- Create: `backend/test/feedback.e2e-spec.ts`

- [ ] **Step 1: Write e2e test**

```typescript
// test/feedback.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Feedback (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.aiFeedback.deleteMany();
    await prisma.sessionRound.deleteMany();
    await prisma.sessionSet.deleteMany();
    await prisma.session.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.templateExercise.deleteMany();
    await prisma.templateRound.deleteMany();
    await prisma.templateDay.deleteMany();
    await prisma.workoutTemplate.deleteMany();
    await prisma.user.deleteMany();

    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1!', name: 'Test' });
    accessToken = res.body.accessToken;
  });

  afterAll(() => app.close());

  it('GET /feedback — returns empty array when no feedback yet', async () => {
    const res = await request(app.getHttpServer())
      .get('/feedback')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('POST /feedback/generate — returns 429 when called twice in same day', async () => {
    // Seed a feedback record for today
    const user = await prisma.user.findFirst();
    await prisma.aiFeedback.create({
      data: {
        userId: user.id,
        content: 'Good work',
        periodStart: new Date(),
        periodEnd: new Date(),
        contextSnapshot: {},
      },
    });

    await request(app.getHttpServer())
      .post('/feedback/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(429);
  });
});
```

- [ ] **Step 2: Run to see failure**

```bash
pnpm run test:e2e -- --testPathPattern=feedback
```

Expected: FAIL.

- [ ] **Step 3: Create GeminiService**

```typescript
// src/feedback/gemini.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private ai: GoogleGenAI;

  constructor(private config: ConfigService) {
    this.ai = new GoogleGenAI({ apiKey: this.config.get<string>('GEMINI_API_KEY') });
  }

  async generateFeedback(contextSnapshot: object): Promise<string> {
    const prompt = `
You are a personal fitness coach. Analyze the following workout data from the past 14 days and provide specific, actionable coaching feedback.

Data:
${JSON.stringify(contextSnapshot, null, 2)}

Evaluate:
1. Muscle group coverage and balance across gym sessions
2. Barbell weight and rep progression per exercise (is the user progressing?)
3. Kickboxing round quality trends (average quality_rating per round type)
4. Rest and recovery patterns
5. Top 2-3 specific areas to improve

Keep feedback encouraging but honest. Be specific about numbers where possible.
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  }
}
```

- [ ] **Step 4: Create FeedbackService**

```typescript
// src/feedback/feedback.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';

@Injectable()
export class FeedbackService {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
  ) {}

  async generate(userId: string) {
    // Rate limit: 1 per user per calendar day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingToday = await this.prisma.aiFeedback.findFirst({
      where: { userId, generatedAt: { gte: todayStart, lte: todayEnd } },
    });

    if (existingToday) {
      const retryAfter = new Date(todayEnd);
      throw new HttpException(
        { message: 'Rate limit: 1 feedback per day', retry_after: retryAfter.toISOString() },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Collect last 14 days of completed sessions
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 14);

    const sessions = await this.prisma.session.findMany({
      where: { userId, status: 'completed', date: { gte: periodStart, lte: periodEnd } },
      include: {
        sessionSets: { include: { exercise: true } },
        sessionRounds: { include: { roundType: true } },
        templateDay: true,
      },
      orderBy: { date: 'asc' },
    });

    const contextSnapshot = {
      user_id: userId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date.toISOString().split('T')[0],
        workout_type: s.templateDay?.workoutType ?? 'unknown',
        template_day: s.templateDay?.dayOfWeek ?? null,
        sets: s.sessionSets.map((ss) => ({
          exercise: ss.exercise.name,
          set_number: ss.setNumber,
          reps: ss.reps,
          weight_kg: ss.weightKg,
        })),
        rounds: s.sessionRounds.map((sr) => ({
          round_type: sr.roundType.name,
          round_number: sr.roundNumber,
          completed: sr.completed,
          quality_rating: sr.qualityRating,
        })),
      })),
    };

    const content = await this.gemini.generateFeedback(contextSnapshot);

    return this.prisma.aiFeedback.create({
      data: {
        userId,
        content,
        periodStart,
        periodEnd,
        contextSnapshot,
      },
    });
  }

  async findAll(userId: string, page = 1, limit = 10) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiFeedback.findMany({
        where: { userId },
        select: { id: true, content: true, periodStart: true, periodEnd: true, generatedAt: true },
        orderBy: { generatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aiFeedback.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  }
}
```

- [ ] **Step 5: Create FeedbackController**

```typescript
// src/feedback/feedback.controller.ts
import { Controller, Post, Get, Query, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post('generate')
  @HttpCode(200)
  generate(@CurrentUser() user: { id: string }) {
    return this.feedbackService.generate(user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.findAll(user.id, Number(page) || 1, Number(limit) || 10);
  }
}
```

- [ ] **Step 6: Create FeedbackModule and add to AppModule**

```typescript
// src/feedback/feedback.module.ts
import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, GeminiService],
})
export class FeedbackModule {}
```

Add `FeedbackModule` to `AppModule` imports.

- [ ] **Step 7: Run tests**

```bash
pnpm run test:e2e -- --testPathPattern=feedback
```

Expected: All feedback tests PASS (Gemini call is skipped in the rate-limit test since it never reaches that code path).

- [ ] **Step 8: Run the full test suite**

```bash
pnpm run test:e2e
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add backend/
git commit -m "feat: feedback module — Gemini 2.5 Flash integration with daily rate limit"
```

---

## Task 8: Deploy Backend to Render

**Files:**
- Create: `backend/render.yaml` (optional, for Blueprint deploys)

- [ ] **Step 1: Push repo to GitHub**

Create a new GitHub repo called `fitness-tracker`, then:
```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git remote add origin git@github.com:YOUR_USERNAME/fitness-tracker.git
git push -u origin master
```

- [ ] **Step 2: Create Neon database**

1. Go to https://neon.tech → Sign up (free)
2. Create project: `fitness-tracker`
3. Copy the connection string (with `?sslmode=require`)
4. Append `&connection_limit=5` to the URL

- [ ] **Step 3: Create Render web service**

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root directory:** `backend`
   - **Build command:** `pnpm install && pnpm exec prisma migrate deploy && pnpm run build`
   - **Start command:** `node dist/main`
   - **Instance type:** Free

- [ ] **Step 4: Set environment variables in Render dashboard**

```
DATABASE_URL=<neon connection string with connection_limit=5>
JWT_SECRET=<generate: openssl rand -base64 64>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 64>
GEMINI_API_KEY=<from Google AI Studio>
FRONTEND_URL=<will set after frontend deploy>
NODE_ENV=production
```

- [ ] **Step 5: Trigger deploy and run seed**

After first deploy, run seed via Render Shell (or locally with production DATABASE_URL):
```bash
DATABASE_URL=<neon url> pnpm exec prisma db seed
```

- [ ] **Step 6: Smoke test the deployed API**

```bash
curl -X POST https://your-app.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Test1234!","name":"You"}'
```

Expected: `{"accessToken":"eyJ..."}`

- [ ] **Step 7: Commit deployment config**

```bash
cd /home/elgnas/Projects/Personal/fitness-tracker
git add backend/
git commit -m "chore: backend deployment config for Render"
```

---

## What's Next

The backend is complete and deployed. The frontend plan (`2026-03-21-fitness-tracker-frontend.md`) covers the React PWA — Vite + TailwindCSS + React Query + offline sync. Build and test the backend first; the frontend consumes the API you just built.
