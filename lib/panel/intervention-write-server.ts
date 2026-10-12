import "server-only";
import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseIstanbulDateInput, istanbulDayEnd, istanbulDayStart } from "@/lib/istanbul-time";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { interventionReasonCodes } from "@/lib/intervention-rules";
import { afterEducationCommit } from "@/lib/panel/education-write";

type Actor = { userId: string; role: "ADMIN" | "TEACHER" };
const TEACHER_MANUAL_INTERVENTION_VERSION = "teacher-manual-v1";

const MANUAL_REASON_CODES = [
  "ATTENDANCE_PATTERN",
  "OVERDUE_WORK",
  "REPEATED_REVIEW_DIFFICULTY",
  "PLAN_STALLED",
  "TEACHER_OBSERVED",
] as const;

export const interventionCreateSchema = z
  .object({
    studentId: z.string().trim().min(1).max(64),
    reasonCode: z.enum(MANUAL_REASON_CODES),
    explanation: z.string().trim().min(8).max(500),
    suggestedAction: z.string().trim().min(4).max(300),
    followUpDate: z.string().trim().min(8).max(16),
  })
  .strict();

function manualFingerprint(teacherId: string, studentId: string, nonce: string) {
  return createHash("sha256")
    .update(`${TEACHER_MANUAL_INTERVENTION_VERSION}:${teacherId}:${studentId}:${nonce}`)
    .digest("hex");
}

const base = { expectedVersion: z.number().int().min(1) };
export const interventionUpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ASSIGN_SELF"), ...base }).strict(),
  z.object({ action: z.literal("START"), note: z.string().trim().max(500).optional(), ...base }).strict(),
  z.object({ action: z.literal("LOG_ACTION"), note: z.string().trim().min(1).max(500), ...base }).strict(),
  z.object({ action: z.literal("SNOOZE"), days: z.union([z.literal(1), z.literal(3), z.literal(7)]), note: z.string().trim().max(500).optional(), ...base }).strict(),
  z.object({ action: z.literal("RESOLVE"), outcomeCode: z.enum(["CHECK_IN_COMPLETED", "SUPPORT_PLANNED", "PRACTICE_ADJUSTED", "FAMILY_CONTACTED", "NO_ACTION_NEEDED", "OTHER"]), note: z.string().trim().max(500).optional(), ...base }).strict(),
  z.object({ action: z.literal("FALSE_POSITIVE"), falsePositiveReason: z.enum(["CONTEXT_MISSING", "DATA_OUTDATED", "THRESHOLD_TOO_SENSITIVE", "DUPLICATE", "OTHER"]), note: z.string().trim().max(500).optional(), ...base }).strict(),
  z.object({ action: z.literal("REOPEN"), ...base }).strict(),
]);

const DAY = 86_400_000;

export async function createInterventionRecord(input: unknown, actor: Actor, db: PrismaClient = prisma) {
  const parsed = interventionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Müdahale kaydı geçersiz." }, { status: 400 });
  }

  const followUpStart = parseIstanbulDateInput(parsed.data.followUpDate);
  if (!followUpStart) {
    return NextResponse.json({ error: "Takip tarihi geçersiz." }, { status: 400 });
  }
  const now = new Date();
  if (followUpStart.getTime() < istanbulDayStart(now).getTime()) {
    return NextResponse.json({ error: "Takip tarihi bugünden önce olamaz." }, { status: 400 });
  }
  const dueAt = istanbulDayEnd(followUpStart);

  const student = await db.studentProfile.findFirst({
    where: {
      id: parsed.data.studentId,
      user: { status: "ACTIVE" },
      ...(actor.role === "TEACHER"
        ? {
            enrollments: {
              some: {
                endedAt: null,
                group: { isActive: true, teacherId: actor.userId },
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
  }

  const nonce = randomUUID();
  const created = await db.interventionCase.create({
    data: {
      studentId: student.id,
      ruleVersion: TEACHER_MANUAL_INTERVENTION_VERSION,
      reasonCode: parsed.data.reasonCode,
      fingerprint: manualFingerprint(actor.userId, student.id, nonce),
      explanation: parsed.data.explanation,
      suggestedAction: parsed.data.suggestedAction,
      evidenceCount: 1,
      windowStart: now,
      windowEnd: dueAt,
      dueAt,
      status: "OPEN",
      ownerId: actor.userId,
      firstActionAt: now,
      activities: {
        create: [
          {
            type: "GENERATED",
            actorId: actor.userId,
            note: "Öğretmen gözlemiyle oluşturuldu",
          },
          {
            type: "ASSIGNED",
            actorId: actor.userId,
          },
        ],
      },
    },
    select: { id: true },
  });

  await afterEducationCommit(db, () => recordPanelProductEvent(
    {
      name: "intervention_logged",
      properties: {
        action: "CREATE_MANUAL",
        reasonCode: parsed.data.reasonCode,
        timeToActionMs: 0,
        withinSla: true,
        noteProvided: true,
      },
    },
    actor.role,
  ));

  return NextResponse.json({ id: created.id });
}

export async function updateInterventionRecord(id: string, input: unknown, actor: Actor, db: PrismaClient = prisma) {
  const parsed = interventionUpdateSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Müdahale işlemi geçersiz." }, { status: 400 });
  const item = await db.interventionCase.findFirst({
    where: {
      id,
      ...(actor.role === "TEACHER" ? {
        student: { user: { status: "ACTIVE" }, enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: actor.userId } } } },
        OR: [{ ownerId: null }, { ownerId: actor.userId }],
      } : {}),
    },
    select: { id: true, status: true, version: true, ownerId: true, reasonCode: true, createdAt: true, firstActionAt: true },
  });
  if (!item) return NextResponse.json({ error: "Müdahale kaydı bulunamadı." }, { status: 404 });
  if (item.version !== parsed.data.expectedVersion) return NextResponse.json({ error: "Kayıt başka bir sekmede değişti." }, { status: 409 });

  const value = parsed.data;
  const action = value.action;
  const actorRole = actor.role as "ADMIN" | "TEACHER";
  if (action === "REOPEN" && !["RESOLVED", "FALSE_POSITIVE"].includes(item.status)) return NextResponse.json({ error: "Yalnız kapanmış kayıt yeniden açılabilir." }, { status: 409 });
  if (action !== "REOPEN" && action !== "ASSIGN_SELF" && ["RESOLVED", "FALSE_POSITIVE"].includes(item.status)) return NextResponse.json({ error: "Kapanmış kayıt için önce yeniden açın." }, { status: 409 });

  const now = new Date();
  const isFirstHumanAction = !item.firstActionAt && action !== "ASSIGN_SELF" && action !== "REOPEN";
  const data: Prisma.InterventionCaseUncheckedUpdateManyInput = { version: { increment: 1 } };
  let activityType: "ASSIGNED" | "STARTED" | "ACTION_LOGGED" | "SNOOZED" | "RESOLVED" | "FALSE_POSITIVE" | "REOPENED" = "ACTION_LOGGED";
  if (action === "ASSIGN_SELF") { data.ownerId = actor.userId; activityType = "ASSIGNED"; }
  if (action === "START") { data.ownerId = item.ownerId || actor.userId; data.status = "IN_PROGRESS"; activityType = "STARTED"; }
  if (action === "LOG_ACTION") { data.ownerId = item.ownerId || actor.userId; data.status = "IN_PROGRESS"; activityType = "ACTION_LOGGED"; }
  if (action === "SNOOZE") { data.ownerId = item.ownerId || actor.userId; data.status = "SNOOZED"; data.snoozedUntil = new Date(now.getTime() + value.days * DAY); activityType = "SNOOZED"; }
  if (action === "RESOLVE") { data.ownerId = item.ownerId || actor.userId; data.status = "RESOLVED"; data.resolvedAt = now; data.snoozedUntil = null; data.outcomeCode = value.outcomeCode; activityType = "RESOLVED"; }
  if (action === "FALSE_POSITIVE") { data.ownerId = item.ownerId || actor.userId; data.status = "FALSE_POSITIVE"; data.resolvedAt = now; data.snoozedUntil = null; data.outcomeCode = null; activityType = "FALSE_POSITIVE"; }
  if (action === "REOPEN") { data.status = "OPEN"; data.resolvedAt = null; data.snoozedUntil = null; data.outcomeCode = null; data.dueAt = new Date(now.getTime() + DAY); activityType = "REOPENED"; }
  if (isFirstHumanAction) data.firstActionAt = now;

  const note = "note" in parsed.data ? parsed.data.note || null : null;
  const outcomeCode = action === "RESOLVE" ? value.outcomeCode : null;
  const falsePositiveReason = action === "FALSE_POSITIVE" ? value.falsePositiveReason : null;
  const updated = await db.$transaction(async (tx) => {
    const changed = await tx.interventionCase.updateMany({ where: { id, version: parsed.data.expectedVersion }, data });
    if (changed.count !== 1) return false;
    await tx.interventionCaseActivity.create({ data: { caseId: id, actorId: actor.userId, type: activityType, note, outcomeCode, falsePositiveReason } });
    return true;
  });
  if (!updated) return NextResponse.json({ error: "Kayıt başka bir sekmede değişti." }, { status: 409 });

  if (action === "ASSIGN_SELF") await afterEducationCommit(db, () => recordPanelProductEvent({ name: "case_assigned", properties: { ownerRole: actorRole, reasonCode: item.reasonCode as (typeof interventionReasonCodes)[number] } }, actor.role));
  if (action !== "ASSIGN_SELF") {
    const timeToActionMs = isFirstHumanAction ? Math.max(0, now.getTime() - item.createdAt.getTime()) : null;
    await afterEducationCommit(db, () => recordPanelProductEvent({ name: "intervention_logged", properties: { action, reasonCode: item.reasonCode as (typeof interventionReasonCodes)[number], timeToActionMs, withinSla: timeToActionMs === null ? null : timeToActionMs <= DAY, noteProvided: Boolean(note) } }, actor.role));
  }
  if (action === "SNOOZE") await afterEducationCommit(db, () => recordPanelProductEvent({ name: "case_snoozed", properties: { reasonCode: item.reasonCode as (typeof interventionReasonCodes)[number], days: value.days } }, actor.role));
  if (action === "RESOLVE") await afterEducationCommit(db, () => recordPanelProductEvent({ name: "case_closed", properties: { reasonCode: item.reasonCode as (typeof interventionReasonCodes)[number], outcomeCode: value.outcomeCode } }, actor.role));
  if (action === "FALSE_POSITIVE") await afterEducationCommit(db, () => recordPanelProductEvent({ name: "case_false_positive", properties: { reasonCode: item.reasonCode as (typeof interventionReasonCodes)[number], falsePositiveReason: value.falsePositiveReason } }, actor.role));
  return NextResponse.json({ updated: true });
}
