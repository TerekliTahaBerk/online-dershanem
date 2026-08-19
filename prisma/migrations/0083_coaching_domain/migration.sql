-- CreateEnum
CREATE TYPE "CoachingSessionStatus" AS ENUM ('PLANNED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "teacher_profiles" ADD COLUMN     "coach_capacity" INTEGER,
ADD COLUMN     "is_coach" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "coach_assignments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "cadence_days" INTEGER,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "assigned_by_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coach_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaching_sessions" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "CoachingSessionStatus" NOT NULL DEFAULT 'PLANNED',
    "completed_at" TIMESTAMPTZ(3),
    "focus" TEXT,
    "shared_note" TEXT,
    "private_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coaching_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_assignments_student_id_ended_at_idx" ON "coach_assignments"("student_id", "ended_at");

-- CreateIndex
CREATE INDEX "coach_assignments_coach_id_ended_at_idx" ON "coach_assignments"("coach_id", "ended_at");

-- CreateIndex
CREATE INDEX "coaching_sessions_assignment_id_scheduled_at_idx" ON "coaching_sessions"("assignment_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "coaching_sessions_status_scheduled_at_idx" ON "coaching_sessions"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "teacher_profiles_is_coach_idx" ON "teacher_profiles"("is_coach");

-- AddForeignKey
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "coach_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Bir öğrencinin AYNI ANDA TEK aktif koçu olabilir.
-- Prisma şema dili koşullu (partial) unique indeks tanımlayamadığı için elle
-- eklenir. Bu olmadan iki aktif atama yan yana durabilir ve ekran hangisini
-- göstereceğini sessizce seçerdi — veli/öğrenci yanlış koçu doğru sanabilir.
CREATE UNIQUE INDEX "coach_assignments_one_active_per_student"
  ON "coach_assignments" ("student_id")
  WHERE "ended_at" IS NULL;
