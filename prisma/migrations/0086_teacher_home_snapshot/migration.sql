CREATE TABLE "teacher_home_snapshots" (
    "teacher_id" TEXT NOT NULL,
    "generated_at" TIMESTAMPTZ(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teacher_home_snapshots_pkey" PRIMARY KEY ("teacher_id"),
    CONSTRAINT "teacher_home_snapshots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "teacher_home_snapshots_generated_at_idx" ON "teacher_home_snapshots"("generated_at");
