import { z } from "zod";
import { automationConditionSchema, automationActionsSchema, automationTriggerSchema } from "../automation/schemas";

const id = z.string().cuid();
const unit = z.string().min(1).max(64).optional();
const revision = z.string().datetime().optional();
const date = z.union([z.string().date(), z.literal("")]).optional();

/** P2.7d: web ve Bearer API aynı allowlist ve alan sınırlarını kullanır. */
export const governanceSchemas = [
  z.object({ type: z.literal("knowledge.create"), businessUnitId: unit, title: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80), content: z.string().trim().min(10).max(10_000), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]), validFrom: date, validUntil: date }).strict(),
  z.object({ type: z.literal("knowledge.version"), id, content: z.string().trim().min(10).max(10_000), isActive: z.boolean(), expectedRevision: revision }).strict(),
  z.object({ type: z.literal("prompt.create"), businessUnitId: unit, name: z.string().trim().min(2).max(80), systemPrompt: z.string().trim().min(20).max(8000) }).strict(),
  z.object({ type: z.literal("automation.create"), businessUnitId: unit, name: z.string().trim().min(2).max(160), triggerType: automationTriggerSchema, conditions: automationConditionSchema, actions: automationActionsSchema, isActive: z.boolean() }).strict(),
  z.object({ type: z.literal("automation.toggle"), id, isActive: z.boolean(), expectedRevision: revision }).strict(),
  z.object({ type: z.literal("automation.dry_run"), id, triggerType: automationTriggerSchema, entityType: z.enum(["lead", "conversation", "order", "student", "intervention", "lesson", "assignment", "digest", "payment", "user"]).default("lead"), entityId: z.string().min(2).max(80).default("dry-run-sample"), source: z.string().max(60).optional(), product: z.string().max(60).optional(), severity: z.string().max(60).optional(), stage: z.string().max(40).optional(), ownerEmpty: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("retention.update"), retentionDays: z.coerce.number().int().min(30).max(3650) }).strict(),
  z.object({ type: z.literal("role.assign"), userId: z.string().min(1).max(128), businessUnitId: id, role: z.enum(["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT", "ACCOUNTING", "VIEWER"]) }).strict(),
  z.object({ type: z.literal("role.revoke"), id }).strict(),
] as const;
export type GovernanceCommand = z.infer<(typeof governanceSchemas)[number]>;
