ALTER TABLE "weekly_plan_tasks"
ADD COLUMN "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "score_version" TEXT NOT NULL DEFAULT 'adaptive-score-v1',
ADD COLUMN "score_breakdown" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "explanation" TEXT NOT NULL DEFAULT '';

ALTER TABLE "weekly_plans" ALTER COLUMN "rule_version" SET DEFAULT 'adaptive-v2';
