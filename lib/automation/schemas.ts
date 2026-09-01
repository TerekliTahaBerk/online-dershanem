import { z } from "zod";
import {
  APPROVED_EMAIL_TEMPLATES,
  AUTOMATION_MAX_ACTIONS,
  AUTOMATION_TRIGGERS,
  LEGACY_ACTIONS,
  PART12_ACTIONS,
  SEVERITY_VALUES,
} from "@/lib/automation/definitions";

export const automationTriggerSchema = z.enum(AUTOMATION_TRIGGERS);

export const automationConditionSchema = z.object({
  source: z.string().trim().min(1).max(60).optional(),
  product: z.string().trim().min(1).max(60).optional(),
  severity: z.enum(SEVERITY_VALUES).optional(),
  ownerEmpty: z.boolean().optional(),
  stage: z.string().trim().min(1).max(40).optional(),
  // Legacy Instagram CRM
  temperature: z.enum(["COLD", "WARM", "HOT"]).optional(),
  intent: z.string().max(60).optional(),
  campaignExternalId: z.string().max(120).optional(),
});

export type AutomationConditions = z.infer<typeof automationConditionSchema>;

const part12ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_task"),
    title: z.string().trim().min(2).max(160).default("Otomasyon görevi"),
  }),
  z.object({
    type: z.literal("assign_owner"),
    userId: z.string().cuid().optional(),
  }),
  z.object({
    type: z.literal("send_internal_notification"),
    title: z.string().trim().min(2).max(120).default("Otomasyon bildirimi"),
    body: z.string().trim().min(2).max(500).default("Bir otomasyon kuralı tetiklendi."),
  }),
  z.object({
    type: z.literal("create_intervention"),
    reasonCode: z
      .enum(["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED", "TEACHER_OBSERVED"])
      .default("TEACHER_OBSERVED"),
    suggestedAction: z.string().trim().min(2).max(300).default("Otomasyon sinyali — inceleme gerekli."),
  }),
  z.object({
    type: z.literal("send_approved_template_email"),
    templateKey: z.enum(APPROVED_EMAIL_TEMPLATES),
  }),
  z.object({
    type: z.literal("add_tag"),
    tag: z.string().trim().min(1).max(40).default("otomasyon"),
  }),
]);

const legacyActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SUGGEST_AI_REPLY") }),
  z.object({ type: z.literal("ASSIGN_SALES") }),
  z.object({ type: z.literal("MARK_WON") }),
  z.object({ type: z.literal("NOTIFY_ADMIN") }),
  z.object({ type: z.literal("ADD_TAG"), tag: z.string().trim().min(1).max(40).default("otomasyon") }),
  z.object({ type: z.literal("STOP_AI") }),
  z.object({ type: z.literal("MARK_SPAM") }),
  z.object({ type: z.literal("CREATE_TASK"), title: z.string().trim().min(2).max(160).default("Adayı takip et") }),
]);

/** Part 12 + legacy aksiyon birleşimi (Zod union). */
export const automationActionSchema = z.union([part12ActionSchema, legacyActionSchema]);
export type AutomationAction = z.infer<typeof automationActionSchema>;

export const automationActionsSchema = z.array(automationActionSchema).min(1).max(AUTOMATION_MAX_ACTIONS);

export const automationRuleInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  triggerType: automationTriggerSchema,
  conditions: automationConditionSchema.default({}),
  actions: automationActionsSchema,
  isActive: z.boolean().default(true),
});

export function isPart12ActionType(type: string): type is (typeof PART12_ACTIONS)[number] {
  return (PART12_ACTIONS as readonly string[]).includes(type);
}

export function isLegacyActionType(type: string): type is (typeof LEGACY_ACTIONS)[number] {
  return (LEGACY_ACTIONS as readonly string[]).includes(type);
}
