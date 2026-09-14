ALTER TABLE "curriculum_versions"
  ALTER COLUMN "exam" DROP NOT NULL;

DROP INDEX "curriculum_versions_exam_family_ref_id_idx";
CREATE INDEX "curriculum_versions_exam_family_ref_id_status_idx"
  ON "curriculum_versions"("exam_family_ref_id", "status");
