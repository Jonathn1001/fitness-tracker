-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('gym', 'kickboxing');

-- CreateEnum
CREATE TYPE "WarmupType" AS ENUM ('walk', 'run');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('in_progress', 'completed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_library" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "exercise_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_type_library" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "round_type_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_templates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_days" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "workout_type" "WorkoutType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "template_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_exercises" (
    "id" TEXT NOT NULL,
    "template_day_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "default_sets" INTEGER NOT NULL,
    "default_reps" INTEGER NOT NULL,
    "default_weight_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,

    CONSTRAINT "template_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_rounds" (
    "id" TEXT NOT NULL,
    "template_day_id" TEXT NOT NULL,
    "round_type_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,

    CONSTRAINT "template_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_day_id" TEXT,
    "date" DATE NOT NULL,
    "warmup_type" "WarmupType",
    "warmup_duration_min" INTEGER,
    "notes" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'in_progress',
    "completed_at" TIMESTAMP(3),
    "idempotency_key" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_sets" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "idempotency_key" TEXT NOT NULL,

    CONSTRAINT "session_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_rounds" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "round_type_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "quality_rating" INTEGER,
    "notes" TEXT,
    "idempotency_key" TEXT NOT NULL,

    CONSTRAINT "session_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "context_snapshot" JSONB NOT NULL,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_library_name_key" ON "exercise_library"("name");

-- CreateIndex
CREATE UNIQUE INDEX "round_type_library_name_key" ON "round_type_library"("name");

-- CreateIndex
CREATE UNIQUE INDEX "template_days_template_id_day_of_week_key" ON "template_days"("template_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_idempotency_key_key" ON "sessions"("idempotency_key");

-- CreateIndex
CREATE INDEX "sessions_user_id_date_idx" ON "sessions"("user_id", "date");

-- CreateIndex
CREATE INDEX "sessions_user_id_status_idx" ON "sessions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "session_sets_idempotency_key_key" ON "session_sets"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "session_rounds_idempotency_key_key" ON "session_rounds"("idempotency_key");

-- CreateIndex
CREATE INDEX "ai_feedback_user_id_generated_at_idx" ON "ai_feedback"("user_id", "generated_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_feedback_user_id_generated_date_key" ON "ai_feedback"("user_id", "generated_date");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_days" ADD CONSTRAINT "template_days_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workout_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_template_day_id_fkey" FOREIGN KEY ("template_day_id") REFERENCES "template_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise_library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_rounds" ADD CONSTRAINT "template_rounds_template_day_id_fkey" FOREIGN KEY ("template_day_id") REFERENCES "template_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_rounds" ADD CONSTRAINT "template_rounds_round_type_id_fkey" FOREIGN KEY ("round_type_id") REFERENCES "round_type_library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_template_day_id_fkey" FOREIGN KEY ("template_day_id") REFERENCES "template_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise_library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_rounds" ADD CONSTRAINT "session_rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_rounds" ADD CONSTRAINT "session_rounds_round_type_id_fkey" FOREIGN KEY ("round_type_id") REFERENCES "round_type_library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
