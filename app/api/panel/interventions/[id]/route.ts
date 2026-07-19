import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const base = { expectedVersion: z.number().int().min(1) };
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ASSIGN_SELF"), ...base }).strict(),
  z.object({ action: z.literal("START"), note: z.string().trim().max(500).optional(), ...base }).strict(),
  z.object({ action: z.literal("LOG_ACTION"), note: z.string().trim().min(1).max(500), ...base }).strict(),
  z.object({ action: z.literal("SNOOZE"), days: z.union([z.literal(1), z.literal(3), z.literal(7)]), note: z.string().trim().max(500).optional(), ...base }).strict(),
  z.object({ action: z.literal("RESOLVE"), outcomeCode: z.enum(["CHECK_IN_COMPLETED", "SUPPORT_PLANNED", "PRACTICE_ADJUSTED", "FAMILY_CONTACTED", "NO_ACTION_NEEDED", "OTHER"]), note: z.string().trim().max(500).optional(), ...base }).strict(),
  z.object({ action: z.literal("FALSE_POSITIVE"), falsePositiveReason: z.enum(["CONTEXT_MISSING", "DATA_OUTDATED", "THRESHOLD_TOO_SENSITIVE", "DUPLICATE", "OTHER"]), note: z.string().trim().max(500).optional(), ...base }).strict(),
  z.object({ action: z.literal("REOPEN"), ...base }).strict(),
]);

const DAY = 86_400_000;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) return NextResponse.json({ error: "Müdahale kutusu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.interventions.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:intervention-update:${auth.session.userId}`, rateLimit: { max: 100, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Müdahale işlemi geçersiz." }, { status: 400 });
  const { id } = await context.params;
  const item = await prisma.interventionCase.findFirst({
    where: {
      id,
      ...(auth.session.role === "TEACHER" ? {
        student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: auth.session.userId } } } },
        OR: [{ ownerId: null }, { ownerId: auth.session.userId }],
      } : {}),
    },
    select: { id: true, status: true, version: true, ownerId: true, reasonCode: true, createdAt: true, firstActionAt: true },
  });
  if (!item) return NextResponse.json({ error: "Müdahale kaydı bulunamadı." }, { status: 404 });
  if (item.version !== parsed.data.expectedVersion) return NextResponse.json({ error: "Kayıt başka bir sekmede değişti." }, { status: 409 });

  const action = parsed.data.action;
  const actorRole = auth.session.role as "ADMIN" | "TEACHER";
  if (action === "REOPEN" && !["RESOLVED", "FALSE_POSITIVE"].includes(item.status)) return NextResponse.json({ error: "Yalnız kapanmış kayıt yeniden açılabilir." }, { status: 409 });
  if (action !== "REOPEN" && action !== "ASSIGN_SELF" && ["RESOLVED", "FALSE_POSITIVE"].includes(item.status)) return NextResponse.json({ error: "Kapanmış kayıt için önce yeniden açın." }, { status: 409 });

  const now = new Date();
  const isFirstHumanAction = !item.firstActionAt && action !== "ASSIGN_SELF" && action !== "REOPEN";
  const data: Prisma.InterventionCaseUncheckedUpdateManyInput = { version: { increment: 1 } };
  let activityType: "ASSIGNED" | "STARTED" | "ACTION_LOGGED" | "SNOOZED" | "RESOLVED" | "FALSE_POSITIVE" | "REOPENED" = "ACTION_LOGGED";
  if (action === "ASSIGN_SELF") { data.ownerId = auth.session.userId; activityType = "ASSIGNED"; }
  if (action === "START") { data.ownerId = item.ownerId || auth.session.userId; data.status = "IN_PROGRESS"; activityType = "STARTED"; }
  if (action === "LOG_ACTION") { data.ownerId = item.ownerId || auth.session.userId; data.status = "IN_PROGRESS"; activityType = "ACTION_LOGGED"; }
  if (action === "SNOOZE") { data.ownerId = item.ownerId || auth.session.userId; data.status = "SNOOZED"; data.snoozedUntil = new Date(now.getTime() + parsed.data.days * DAY); activityType = "SNOOZED"; }
  if (action === "RESOLVE") { data.ownerId = item.ownerId || auth.session.userId; data.status = "RESOLVED"; data.resolvedAt = now; data.snoozedUntil = null; data.outcomeCode = parsed.data.outcomeCode; activityType = "RESOLVED"; }
  if (action === "FALSE_POSITIVE") { data.ownerId = item.ownerId || auth.session.userId; data.status = "FALSE_POSITIVE"; data.resolvedAt = now; data.snoozedUntil = null; data.outcomeCode = null; activityType = "FALSE_POSITIVE"; }
  if (action === "REOPEN") { data.status = "OPEN"; data.resolvedAt = null; data.snoozedUntil = null; data.outcomeCode = null; data.dueAt = new Date(now.getTime() + DAY); activityType = "REOPENED"; }
  if (isFirstHumanAction) data.firstActionAt = now;

  const note = "note" in parsed.data ? parsed.data.note || null : null;
  const outcomeCode = action === "RESOLVE" ? parsed.data.outcomeCode : null;
  const falsePositiveReason = action === "FALSE_POSITIVE" ? parsed.data.falsePositiveReason : null;
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.interventionCase.updateMany({ where: { id, version: parsed.data.expectedVersion }, data });
    if (changed.count !== 1) return false;
    await tx.interventionCaseActivity.create({ data: { caseId: id, actorId: auth.session.userId, type: activityType, note, outcomeCode, falsePositiveReason } });
    return true;
  });
  if (!updated) return NextResponse.json({ error: "Kayıt başka bir sekmede değişti." }, { status: 409 });

  if (action === "ASSIGN_SELF") await recordPanelProductEvent({ name: "case_assigned", properties: { ownerRole: actorRole, reasonCode: item.reasonCode } }, auth.session.role);
  if (action !== "ASSIGN_SELF") {
    const timeToActionMs = isFirstHumanAction ? Math.max(0, now.getTime() - item.createdAt.getTime()) : null;
    await recordPanelProductEvent({ name: "intervention_logged", properties: { action, reasonCode: item.reasonCode, timeToActionMs, withinSla: timeToActionMs === null ? null : timeToActionMs <= DAY, noteProvided: Boolean(note) } }, auth.session.role);
  }
  if (action === "SNOOZE") await recordPanelProductEvent({ name: "case_snoozed", properties: { reasonCode: item.reasonCode, days: parsed.data.days } }, auth.session.role);
  if (action === "RESOLVE") await recordPanelProductEvent({ name: "case_closed", properties: { reasonCode: item.reasonCode, outcomeCode: parsed.data.outcomeCode } }, auth.session.role);
  if (action === "FALSE_POSITIVE") await recordPanelProductEvent({ name: "case_false_positive", properties: { reasonCode: item.reasonCode, falsePositiveReason: parsed.data.falsePositiveReason } }, auth.session.role);
  return NextResponse.json({ updated: true });
}
