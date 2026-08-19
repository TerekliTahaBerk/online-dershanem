-- CreateEnum
CREATE TYPE "StudentGoalKind" AS ENUM ('SUBJECT_NET', 'PLAN_COMPLETION');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "target_rank" INTEGER;

-- CreateTable
CREATE TABLE "student_goals" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "kind" "StudentGoalKind" NOT NULL,
    "subject_name" TEXT,
    "target_value" DOUBLE PRECISION NOT NULL,
    "near_term_note" TEXT,
    "set_by_id" TEXT,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_goals_student_id_archived_at_idx" ON "student_goals"("student_id", "archived_at");

-- AddForeignKey
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_set_by_id_fkey" FOREIGN KEY ("set_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Ders neti hedefinin dersi OLMAK ZORUNDA; plan tamamlama hedefinin OLMAMALI.
-- Aksi hâlde "şimdi" değeri hesaplanamayan, karşılığı olmayan bir hedef
-- kaydedilebilirdi.
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_subject_matches_kind"
  CHECK (
    ("kind" = 'SUBJECT_NET' AND "subject_name" IS NOT NULL)
    OR ("kind" = 'PLAN_COMPLETION' AND "subject_name" IS NULL)
  );

-- Hedef değeri negatif olamaz.
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_target_non_negative"
  CHECK ("target_value" >= 0);

-- Aynı öğrenciye aynı başlıkta İKİ AKTİF hedef konamaz; ekran hangisini
-- göstereceğini sessizce seçerdi.
CREATE UNIQUE INDEX "student_goals_one_active_per_topic"
  ON "student_goals" ("student_id", "kind", COALESCE("subject_name", ''))
  WHERE "archived_at" IS NULL;
