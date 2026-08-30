ALTER TYPE "InterventionReason" ADD VALUE 'RECENT_EXAM_DROP';
ALTER TYPE "InterventionReason" ADD VALUE 'ENGAGEMENT_GAP';
ALTER TYPE "InterventionReason" ADD VALUE 'HUMAN_CONCERN';

ALTER TYPE "InterventionActivityType" ADD VALUE 'HUMAN_CONCERN_RAISED';

ALTER TABLE "intervention_cases" ALTER COLUMN "rule_version" SET DEFAULT 'intervention-v3';
