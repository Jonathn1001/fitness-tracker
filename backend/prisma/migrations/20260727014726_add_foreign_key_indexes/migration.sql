-- CreateIndex
CREATE INDEX "session_rounds_session_id_idx" ON "session_rounds"("session_id");

-- CreateIndex
CREATE INDEX "session_rounds_round_type_id_idx" ON "session_rounds"("round_type_id");

-- CreateIndex
CREATE INDEX "session_sets_session_id_idx" ON "session_sets"("session_id");

-- CreateIndex
CREATE INDEX "session_sets_exercise_id_idx" ON "session_sets"("exercise_id");

-- CreateIndex
CREATE INDEX "sessions_template_day_id_idx" ON "sessions"("template_day_id");

-- CreateIndex
CREATE INDEX "template_exercises_template_day_id_idx" ON "template_exercises"("template_day_id");

-- CreateIndex
CREATE INDEX "template_exercises_exercise_id_idx" ON "template_exercises"("exercise_id");

-- CreateIndex
CREATE INDEX "template_rounds_template_day_id_idx" ON "template_rounds"("template_day_id");

-- CreateIndex
CREATE INDEX "template_rounds_round_type_id_idx" ON "template_rounds"("round_type_id");

-- CreateIndex
CREATE INDEX "workout_templates_user_id_idx" ON "workout_templates"("user_id");
