ALTER TABLE "odk_exam_series" ALTER COLUMN "family" DROP NOT NULL;
ALTER TABLE "odk_exams" ALTER COLUMN "family" DROP NOT NULL;

ALTER TABLE "odk_exam_questions" ADD COLUMN "content_text" TEXT;

CREATE INDEX "odk_exam_series_exam_family_ref_id_academic_year_is_active_idx"
  ON "odk_exam_series"("exam_family_ref_id", "academic_year", "is_active");
CREATE INDEX "odk_exams_exam_family_ref_id_status_starts_at_idx"
  ON "odk_exams"("exam_family_ref_id", "status", "starts_at");

ALTER TABLE "odk_exam_series"
  ADD CONSTRAINT "odk_exam_series_family_required"
  CHECK ("family" IS NOT NULL OR "exam_family_ref_id" IS NOT NULL);
ALTER TABLE "odk_exams"
  ADD CONSTRAINT "odk_exams_family_required"
  CHECK ("family" IS NOT NULL OR "exam_family_ref_id" IS NOT NULL);

INSERT INTO "odk_scoring_policies" (
  "id", "code", "title", "wrong_penalty", "minimum_net_is_zero"
) VALUES (
  'odk_scoring_policy_generic_four_wrong',
  'ODK_GENERIC_FOUR_WRONG_V1',
  'Genel dört yanlış bir doğruyu götürür',
  4.00,
  true
) ON CONFLICT ("code") DO NOTHING;
