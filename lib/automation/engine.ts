import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { DatabaseNotificationProvider } from "@/lib/business/providers";
import { sendPanelNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { conditionsMatch } from "@/lib/automation/conditions";
import {
  AUTOMATION_MAX_ACTIONS,
  AUTOMATION_RATE_LIMIT_PER_HOUR,
  TRIGGER_ALIASES,
  type AutomationTrigger,
  type ApprovedEmailTemplate,
} from "@/lib/automation/definitions";
import {
  automationActionSchema,
  automationActionsSchema,
  type AutomationAction,
} from "@/lib/automation/schemas";
import {
  assertActionBudget,
  assertRecursionDepth,
  assertRuleEnabled,
  buildEventId,
} from "@/lib/automation/safety";

const depthStore = new AsyncLocalStorage<number>();

export type AutomationEntityType =
  | "conversation"
  | "lead"
  | "payment"
  | "order"
  | "user"
  | "student"
  | "intervention"
  | "lesson"
  | "assignment"
  | "digest";

export type AutomationEventContext = {
  businessUnitId: string;
  entityType: AutomationEntityType;
  entityId: string;
  eventId?: string;
  conversationId?: string;
  leadId?: string;
  studentId?: string;
  ownerId?: string | null;
  source?: string | null;
  product?: string | null;
  severity?: string | null;
  stage?: string | null;
  temperature?: "COLD" | "WARM" | "HOT" | null;
  intent?: string | null;
  campaignExternalId?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
};

export type AutomationExecutionResult =
  | "SUCCEEDED"
  | "FAILED"
  | "SKIPPED"
  | "DRY_RUN"
  | "RUNNING"
  | "DUPLICATE"
  | "RATE_LIMITED"
  | "RECURSION_BLOCKED"
  | "DISABLED";

export type RuleRunOutcome = {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  result: AutomationExecutionResult;
  applied: string[];
  planned: string[];
  errorCode: string | null;
  durationMs: number;
};

export type EmitSummary = {
  trigger: AutomationTrigger;
  eventId: string;
  outcomes: RuleRunOutcome[];
};

function currentDepth(): number {
  return depthStore.getStore() ?? 0;
}

function triggersForLookup(trigger: AutomationTrigger): string[] {
  const alias = TRIGGER_ALIASES[trigger];
  return alias ? [trigger, alias] : [trigger];
}

function parseActions(raw: unknown): { ok: true; actions: AutomationAction[] } | { ok: false; error: string } {
  const parsed = automationActionsSchema.safeParse(raw);
  if (parsed.success) return { ok: true, actions: parsed.data };
  // Eski kurallar 5'ten fazla aksiyon taşıyabilir — bütçeye kırp.
  const loose = Array.isArray(raw) ? raw.slice(0, AUTOMATION_MAX_ACTIONS) : [];
  const retried = zArraySafe(loose);
  if (!retried) return { ok: false, error: "INVALID_ACTIONS" };
  return { ok: true, actions: retried };
}

function zArraySafe(raw: unknown[]): AutomationAction[] | null {
  const out: AutomationAction[] = [];
  for (const item of raw) {
    const parsed = automationActionSchema.safeParse(item);
    if (!parsed.success) return null;
    out.push(parsed.data);
  }
  return out.length ? out : null;
}

async function applyAction(action: AutomationAction, ctx: AutomationEventContext, dryRun: boolean): Promise<void> {
  if (dryRun) return;

  switch (action.type) {
    case "create_task":
    case "CREATE_TASK": {
      if (!ctx.leadId) return;
      await prisma.leadTask.create({ data: { leadId: ctx.leadId, title: action.title } });
      return;
    }
    case "assign_owner": {
      const ownerId =
        action.userId ||
        (
          await prisma.businessRoleAssignment.findFirst({
            where: { businessUnitId: ctx.businessUnitId, role: "SALES" },
            orderBy: { createdAt: "asc" },
            select: { userId: true },
          })
        )?.userId;
      if (!ownerId) return;
      if (ctx.leadId) await prisma.businessLead.update({ where: { id: ctx.leadId }, data: { assignedUserId: ownerId } });
      if (ctx.conversationId) {
        await prisma.businessConversation.update({ where: { id: ctx.conversationId }, data: { assignedUserId: ownerId } });
      }
      return;
    }
    case "ASSIGN_SALES": {
      const assignee = await prisma.businessRoleAssignment.findFirst({
        where: { businessUnitId: ctx.businessUnitId, role: "SALES" },
        orderBy: { createdAt: "asc" },
      });
      if (!assignee) return;
      if (ctx.leadId) await prisma.businessLead.update({ where: { id: ctx.leadId }, data: { assignedUserId: assignee.userId } });
      if (ctx.conversationId) {
        await prisma.businessConversation.update({ where: { id: ctx.conversationId }, data: { assignedUserId: assignee.userId } });
      }
      return;
    }
    case "send_internal_notification":
    case "NOTIFY_ADMIN": {
      const admins = await prisma.businessRoleAssignment.findMany({
        where: { businessUnitId: ctx.businessUnitId, role: { in: ["SUPER_ADMIN", "ADMIN"] } },
        select: { userId: true },
      });
      const title = action.type === "send_internal_notification" ? action.title : "İşletme merkezi uyarısı";
      const body =
        action.type === "send_internal_notification"
          ? action.body
          : `${ctx.meta?.trigger ?? "otomasyon"}: inceleme gerekiyor.`;
      await new DatabaseNotificationProvider().notify({
        title,
        body,
        href:
          ctx.href ||
          (ctx.conversationId
            ? `/panel/yonetim/isletme/mesaj-kutusu?conversation=${ctx.conversationId}`
            : "/panel/yonetim/isletme/otomasyon-kurallari"),
        userIds: admins.map((item) => item.userId),
      });
      return;
    }
    case "create_intervention": {
      if (!ctx.studentId) return;
      const reasonCode = normalizeInterventionReason(action.reasonCode);
      const fingerprint = createHash("sha256")
        .update(`automation-v1:${ctx.studentId}:${reasonCode}:${ctx.entityId}`)
        .digest("hex");
      const existing = await prisma.interventionCase.findFirst({ where: { fingerprint }, select: { id: true } });
      if (existing) return;
      const now = new Date();
      await prisma.interventionCase.create({
        data: {
          studentId: ctx.studentId,
          ruleVersion: "automation-v1",
          reasonCode,
          fingerprint,
          explanation: `Otomasyon kuralı: ${reasonCode}`,
          suggestedAction: action.suggestedAction,
          evidenceCount: 1,
          windowStart: now,
          windowEnd: new Date(now.getTime() + 86_400_000),
          dueAt: new Date(now.getTime() + 86_400_000),
          activities: { create: { type: "GENERATED" } },
        },
      });
      return;
    }
    case "send_approved_template_email": {
      await sendApprovedTemplate(action.templateKey, ctx);
      return;
    }
    case "add_tag":
    case "ADD_TAG": {
      const tag = action.tag;
      if (ctx.leadId) await prisma.businessLead.update({ where: { id: ctx.leadId }, data: { tags: { push: tag } } });
      if (ctx.conversationId) {
        await prisma.businessConversation.update({ where: { id: ctx.conversationId }, data: { tags: { push: tag } } });
      }
      return;
    }
    case "SUGGEST_AI_REPLY": {
      if (!ctx.conversationId) return;
      const bucket = Math.floor(Date.now() / 8_000);
      const idempotencyKey = `ai-suggestion:${ctx.conversationId}:${bucket}`;
      await prisma.backgroundJob.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          businessUnitId: ctx.businessUnitId,
          type: "GENERATE_AI_REPLY",
          idempotencyKey,
          payload: { conversationId: ctx.conversationId },
        },
      });
      return;
    }
    case "MARK_WON": {
      if (!ctx.leadId) return;
      await prisma.businessLead.update({ where: { id: ctx.leadId }, data: { stage: "WON", wonAt: new Date() } });
      return;
    }
    case "STOP_AI": {
      if (!ctx.conversationId) return;
      await prisma.businessConversation.update({
        where: { id: ctx.conversationId },
        data: { aiMode: "OFF", status: "WAITING_HUMAN" },
      });
      return;
    }
    case "MARK_SPAM": {
      if (!ctx.conversationId) return;
      await prisma.businessConversation.update({
        where: { id: ctx.conversationId },
        data: { aiMode: "OFF", status: "SPAM" },
      });
      return;
    }
    default:
      return;
  }
}

async function sendApprovedTemplate(templateKey: ApprovedEmailTemplate, ctx: AutomationEventContext) {
  const admins = await prisma.businessRoleAssignment.findMany({
    where: { businessUnitId: ctx.businessUnitId, role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    select: { user: { select: { email: true, fullName: true } } },
  });
  const copy: Record<ApprovedEmailTemplate, { title: string; body: string }> = {
    automation_ops_alert: {
      title: "Otomasyon operasyon uyarısı",
      body: `Tetikleyici olay işlendi. Varlık: ${ctx.entityType}/${ctx.entityId}.`,
    },
    automation_invite_reminder: {
      title: "Öğrenci daveti bekliyor",
      body: `Davet kabul edilmemiş hesap için otomasyon uyarısı. Varlık: ${ctx.entityId}.`,
    },
    automation_intervention_alert: {
      title: "Müdahale otomasyon uyarısı",
      body: `Müdahale/risk sinyali için onaylı şablon e-posta. Varlık: ${ctx.entityId}.`,
    },
  };
  const message = copy[templateKey];
  for (const row of admins) {
    if (!row.user.email) continue;
    await sendPanelNotificationEmail({
      to: row.user.email,
      name: row.user.fullName,
      title: message.title,
      body: message.body,
      href: ctx.href ?? "/panel/yonetim/isletme/otomasyon-kurallari",
    });
  }
}

async function recordExecution(input: {
  ruleId: string;
  eventId: string | null;
  entityType: string;
  entityId: string;
  matched: boolean;
  dryRun: boolean;
  result: AutomationExecutionResult;
  errorCode: string | null;
  durationMs: number;
  details: Prisma.InputJsonValue;
}): Promise<"created" | "duplicate"> {
  try {
    await prisma.automationExecution.create({
      data: {
        ruleId: input.ruleId,
        eventId: input.eventId,
        entityType: input.entityType,
        entityId: input.entityId,
        matched: input.matched,
        dryRun: input.dryRun,
        result: input.result,
        errorCode: input.errorCode,
        durationMs: input.durationMs,
        details: input.details,
      },
    });
    return "created";
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002",
  );
}

const INTERVENTION_REASONS = [
  "ATTENDANCE_PATTERN",
  "OVERDUE_WORK",
  "REPEATED_REVIEW_DIFFICULTY",
  "PLAN_STALLED",
  "TEACHER_OBSERVED",
] as const;

function normalizeInterventionReason(value: string): (typeof INTERVENTION_REASONS)[number] {
  return (INTERVENTION_REASONS as readonly string[]).includes(value)
    ? (value as (typeof INTERVENTION_REASONS)[number])
    : "TEACHER_OBSERVED";
}

async function runSingleRule(input: {
  rule: {
    id: string;
    name: string;
    isActive: boolean;
    conditions: unknown;
    actions: unknown;
  };
  trigger: AutomationTrigger;
  context: AutomationEventContext;
  eventId: string;
  dryRun: boolean;
  includeDisabled: boolean;
}): Promise<RuleRunOutcome> {
  const started = Date.now();
  const planned: string[] = [];
  const applied: string[] = [];

  const enabled = assertRuleEnabled(input.includeDisabled ? true : input.rule.isActive);
  if (!enabled.ok) {
    await recordExecution({
      ruleId: input.rule.id,
      eventId: input.dryRun ? null : input.eventId,
      entityType: input.context.entityType,
      entityId: input.context.entityId,
      matched: false,
      dryRun: input.dryRun,
      result: "DISABLED",
      errorCode: "DISABLED",
      durationMs: Date.now() - started,
      details: { trigger: input.trigger, planned, applied },
    });
    return {
      ruleId: input.rule.id,
      ruleName: input.rule.name,
      matched: false,
      result: "DISABLED",
      applied,
      planned,
      errorCode: "DISABLED",
      durationMs: Date.now() - started,
    };
  }

  const matched = conditionsMatch(input.rule.conditions, {
    source: input.context.source,
    product: input.context.product,
    severity: input.context.severity,
    ownerId: input.context.ownerId,
    stage: input.context.stage,
    temperature: input.context.temperature,
    intent: input.context.intent,
    campaignExternalId: input.context.campaignExternalId,
  });

  if (!matched) {
    await recordExecution({
      ruleId: input.rule.id,
      eventId: input.dryRun ? `dryrun-nomatch:${input.rule.id}:${Date.now()}` : input.eventId,
      entityType: input.context.entityType,
      entityId: input.context.entityId,
      matched: false,
      dryRun: input.dryRun,
      result: "SKIPPED",
      errorCode: null,
      durationMs: Date.now() - started,
      details: { trigger: input.trigger, planned, applied, reason: "condition_no_match" },
    });
    return {
      ruleId: input.rule.id,
      ruleName: input.rule.name,
      matched: false,
      result: "SKIPPED",
      applied,
      planned,
      errorCode: null,
      durationMs: Date.now() - started,
    };
  }

  if (!input.dryRun) {
    const rate = await checkRateLimit(
      `automation:rule:${input.rule.id}`,
      AUTOMATION_RATE_LIMIT_PER_HOUR,
      60 * 60_000,
    );
    if (!rate.allowed) {
      await recordExecution({
        ruleId: input.rule.id,
        eventId: input.eventId,
        entityType: input.context.entityType,
        entityId: input.context.entityId,
        matched: true,
        dryRun: false,
        result: "RATE_LIMITED",
        errorCode: "RATE_LIMIT",
        durationMs: Date.now() - started,
        details: { trigger: input.trigger, planned, applied },
      });
      return {
        ruleId: input.rule.id,
        ruleName: input.rule.name,
        matched: true,
        result: "RATE_LIMITED",
        applied,
        planned,
        errorCode: "RATE_LIMIT",
        durationMs: Date.now() - started,
      };
    }
  }

  const parsed = parseActions(input.rule.actions);
  if (!parsed.ok) {
    await recordExecution({
      ruleId: input.rule.id,
      eventId: input.dryRun ? null : input.eventId,
      entityType: input.context.entityType,
      entityId: input.context.entityId,
      matched: true,
      dryRun: input.dryRun,
      result: "FAILED",
      errorCode: parsed.error,
      durationMs: Date.now() - started,
      details: { trigger: input.trigger, planned, applied },
    });
    return {
      ruleId: input.rule.id,
      ruleName: input.rule.name,
      matched: true,
      result: "FAILED",
      applied,
      planned,
      errorCode: parsed.error,
      durationMs: Date.now() - started,
    };
  }

  const budget = assertActionBudget(parsed.actions.length);
  if (!budget.ok) {
    await recordExecution({
      ruleId: input.rule.id,
      eventId: input.dryRun ? null : input.eventId,
      entityType: input.context.entityType,
      entityId: input.context.entityId,
      matched: true,
      dryRun: input.dryRun,
      result: "FAILED",
      errorCode: "MAX_ACTIONS",
      durationMs: Date.now() - started,
      details: { trigger: input.trigger, planned, applied },
    });
    return {
      ruleId: input.rule.id,
      ruleName: input.rule.name,
      matched: true,
      result: "FAILED",
      applied,
      planned,
      errorCode: "MAX_ACTIONS",
      durationMs: Date.now() - started,
    };
  }

  for (const action of parsed.actions) planned.push(action.type);

  const claimEventId = input.dryRun ? `dryrun:${input.rule.id}:${Date.now()}` : input.eventId;
  const claim = await recordExecution({
    ruleId: input.rule.id,
    eventId: claimEventId,
    entityType: input.context.entityType,
    entityId: input.context.entityId,
    matched: true,
    dryRun: input.dryRun,
    result: input.dryRun ? "DRY_RUN" : "RUNNING",
    errorCode: null,
    durationMs: Date.now() - started,
    details: { trigger: input.trigger, planned, applied },
  });

  if (claim === "duplicate") {
    return {
      ruleId: input.rule.id,
      ruleName: input.rule.name,
      matched: true,
      result: "DUPLICATE",
      applied: [],
      planned,
      errorCode: "DUPLICATE",
      durationMs: Date.now() - started,
    };
  }

  let result: AutomationExecutionResult = input.dryRun ? "DRY_RUN" : "SUCCEEDED";
  let errorCode: string | null = null;

  try {
    for (const action of parsed.actions) {
      await applyAction(action, { ...input.context, meta: { ...input.context.meta, trigger: input.trigger } }, input.dryRun);
      applied.push(action.type);
    }
  } catch (error) {
    result = "FAILED";
    errorCode = error instanceof Error ? error.message.slice(0, 100) : "UNKNOWN";
  }

  await prisma.automationExecution.updateMany({
    where: { ruleId: input.rule.id, eventId: claimEventId },
    data: {
      result,
      errorCode,
      durationMs: Date.now() - started,
      details: { trigger: input.trigger, planned, applied } as Prisma.InputJsonValue,
    },
  });

  if (!input.dryRun && (result === "SUCCEEDED" || result === "FAILED")) {
    await prisma.automationRule.update({
      where: { id: input.rule.id },
      data: { lastRunAt: new Date(), runCount: { increment: 1 } },
    });
  }

  return {
    ruleId: input.rule.id,
    ruleName: input.rule.name,
    matched: true,
    result,
    applied,
    planned,
    errorCode,
    durationMs: Date.now() - started,
  };
}

/**
 * Domain olayını otomasyon motoruna basar.
 * Recursion: aksiyon içinden gelen emit'ler depth>1 ise bloklanır.
 */
export async function emitAutomationEvent(
  trigger: AutomationTrigger,
  context: AutomationEventContext,
): Promise<EmitSummary> {
  const depth = currentDepth();
  const recursion = assertRecursionDepth(depth + 1);
  const eventId =
    context.eventId ||
    buildEventId({
      trigger,
      entityType: context.entityType,
      entityId: context.entityId,
    });

  if (!recursion.ok) {
    void logAudit({
      actorType: "SYSTEM",
      entityType: "AutomationRule",
      entityId: context.entityId,
      action: "AUTOMATION_RECURSION_BLOCKED",
      payload: { trigger, eventId, depth },
      idempotencyKey: `automation-recursion:${eventId}`,
    });
    return {
      trigger,
      eventId,
      outcomes: [
        {
          ruleId: "-",
          ruleName: "-",
          matched: false,
          result: "RECURSION_BLOCKED",
          applied: [],
          planned: [],
          errorCode: "RECURSION",
          durationMs: 0,
        },
      ],
    };
  }

  return depthStore.run(depth + 1, async () => {
    const triggerKeys = triggersForLookup(trigger);
    const rules = await prisma.automationRule.findMany({
      where: {
        businessUnitId: context.businessUnitId,
        triggerType: { in: triggerKeys },
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const outcomes: RuleRunOutcome[] = [];
    for (const rule of rules) {
      outcomes.push(
        await runSingleRule({
          rule,
          trigger,
          context,
          eventId,
          dryRun: false,
          includeDisabled: false,
        }),
      );
    }
    return { trigger, eventId, outcomes };
  });
}

/** Legacy Instagram CRM çağrıları için ince sarmalayıcı. */
export async function executeAutomations(
  trigger: AutomationTrigger,
  context: AutomationEventContext,
): Promise<EmitSummary> {
  return emitAutomationEvent(trigger, context);
}

/**
 * Aktif etmeden önce örnek olay üzerinde kuralı test eder.
 * Aksiyonlar uygulanmaz; execution log'a dry_run=true yazılır.
 */
export async function dryRunAutomationRule(input: {
  ruleId: string;
  businessUnitIds: string[];
  trigger: AutomationTrigger;
  context: Omit<AutomationEventContext, "businessUnitId"> & { businessUnitId?: string };
}): Promise<RuleRunOutcome> {
  const rule = await prisma.automationRule.findFirst({
    where: { id: input.ruleId, businessUnitId: { in: input.businessUnitIds } },
  });
  if (!rule) {
    return {
      ruleId: input.ruleId,
      ruleName: "?",
      matched: false,
      result: "FAILED",
      applied: [],
      planned: [],
      errorCode: "RULE_NOT_FOUND",
      durationMs: 0,
    };
  }

  const context: AutomationEventContext = {
    ...input.context,
    businessUnitId: input.context.businessUnitId || rule.businessUnitId,
  };
  const eventId = buildEventId({
    trigger: input.trigger,
    entityType: context.entityType,
    entityId: context.entityId,
    bucket: `dryrun-${Date.now()}`,
  });

  return runSingleRule({
    rule,
    trigger: input.trigger,
    context,
    eventId,
    dryRun: true,
    includeDisabled: true,
  });
}

export async function runUnansweredHotLeadAutomations(now = new Date()) {
  const cutoff = new Date(now.getTime() - 15 * 60_000);
  const conversations = await prisma.businessConversation.findMany({
    where: {
      temperature: "HOT",
      status: { in: ["OPEN", "WAITING_HUMAN"] },
      lastMessageAt: { lte: cutoff },
      OR: [{ lastReplyBy: null }, { lastReplyBy: "CUSTOMER" }],
    },
    include: { lead: { select: { id: true } } },
    take: 200,
  });
  for (const conversation of conversations) {
    await emitAutomationEvent("UNANSWERED_HOT_LEAD", {
      businessUnitId: conversation.businessUnitId,
      entityType: "conversation",
      entityId: conversation.id,
      conversationId: conversation.id,
      leadId: conversation.lead?.id,
      temperature: "HOT",
      campaignExternalId: conversation.sourceCampaignExternalId,
      eventId: buildEventId({
        trigger: "UNANSWERED_HOT_LEAD",
        entityType: "conversation",
        entityId: conversation.id,
        bucket: now.toISOString().slice(0, 13),
      }),
    });
  }
  return conversations.length;
}
