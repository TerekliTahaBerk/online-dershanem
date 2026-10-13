import "server-only";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { operationDigest, GroupMutationError } from "./group-mutation-core";

export async function coachPreparationScope(coachId: string, studentId: string, db: PrismaClient = prisma) {
  const now = new Date();
  return db.coachAssignment.findFirst({ where: { studentId, endedAt: null, coach: { userId: coachId }, student: { user: { status: "ACTIVE", productMemberships: { some: { product: "OK", revokedAt: null, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } } } }, select: { id: true, cadenceDays: true, updatedAt: true, studentId: true } });
}
export async function loadCoachPreparation(coachId: string, studentId: string, db: PrismaClient = prisma) {
  const assignment = await coachPreparationScope(coachId, studentId, db);
  if (!assignment) return null;
  const weekStart = planningWeekStart();
  const [plans, sessions, goals, subjects, templates, summary] = await Promise.all([
    db.weeklyPlan.findMany({ where: { studentId, productRef: { code: "OK" }, weekStart: { gte: new Date(weekStart.getTime() - 7 * 86400000), lte: weekStart } }, orderBy: { weekStart: "desc" }, include: { tasks: { orderBy: { id: "asc" } } } }),
    db.coachingSession.findMany({ where: { assignmentId: assignment.id, status: "PLANNED" }, orderBy: [{ scheduledAt: "asc" }, { id: "asc" }], select: { id: true, version: true, scheduledAt: true } }),
    db.studentGoal.findMany({ where: { studentId, archivedAt: null }, orderBy: { id: "asc" }, select: { id: true, kind: true, subjectName: true, targetValue: true, nearTermNote: true, updatedAt: true } }),
    db.mockExamSection.findMany({ where: { mockExam: { studentId } }, distinct: ["subjectName"], orderBy: { subjectName: "asc" }, select: { subjectName: true } }),
    db.weeklyPlanTemplate.findMany({ orderBy: [{ title: "asc" }, { id: "asc" }], take: 50 }),
    db.weeklyCoachSummary.findUnique({ where: { studentId_weekStart: { studentId, weekStart } } }),
  ]);
  return { contractVersion: 1 as const, studentId, weekStart: weekStart.toISOString(), revision: operationDigest({ assignment, weekStart, plans, sessions, goals, subjects, templates, summary }),
    plans: plans.map((p) => ({ id: p.id, version: p.version, status: p.status, weekStart: p.weekStart.toISOString(), taskCount: p.tasks.length })),
    templates: templates.map((t) => ({ id: t.id, title: t.title })), subjects: subjects.map((s) => s.subjectName),
    nextSession: sessions[0] ? { ...sessions[0], scheduledAt: sessions[0].scheduledAt.toISOString() } : null,
    goals: goals.map((g) => ({ id: g.id, kind: g.kind, subjectName: g.subjectName, targetValue: g.targetValue, nearTermNote: g.nearTermNote })),
    summary: summary ? { strengths: summary.strengths, focusAreas: summary.focusAreas, nextWeekFocus: summary.nextWeekFocus, studentVisibleText: summary.studentVisibleText, parentVisibleText: summary.parentVisibleText, status: summary.status } : null,
  };
}
export const coachRecordSchema = z.object({ studentId: z.string().min(1).max(100), focus: z.string().trim().max(300).optional(), sharedNote: z.string().trim().max(4000).optional(), privateNote: z.string().trim().max(4000).optional(), nextAt: z.string().datetime().optional() }).strict();
export const coachGoalSchema = z.object({ studentId: z.string().min(1).max(100), kind: z.enum(["SUBJECT_NET", "PLAN_COMPLETION"]), subjectName: z.string().trim().max(100).optional(), targetValue: z.number().min(0), nearTermNote: z.string().trim().max(300).optional() }).strict().superRefine((v, c) => {
  if (v.kind === "PLAN_COMPLETION" && v.targetValue > 100) c.addIssue({ code: "custom", path: ["targetValue"], message: "Yüzde 0–100 olmalı." });
  if (v.kind === "SUBJECT_NET" && !v.subjectName) c.addIssue({ code: "custom", path: ["subjectName"], message: "Ders seçin." });
});
export async function recordCoachSession(input: z.infer<typeof coachRecordSchema>, actorId: string, db: PrismaClient = prisma) {
  return db.$transaction(async (tx) => {
    const assignment = await coachPreparationScope(actorId, input.studentId, tx as PrismaClient);
    if (!assignment) throw new GroupMutationError("NOT_FOUND", "Öğrenci bulunamadı.", 404);
    const now = new Date();
    if (input.nextAt && new Date(input.nextAt) <= now) throw new GroupMutationError("INVALID_DATE", "Sonraki görüşme gelecekte olmalı.", 400);
    const planned = await tx.coachingSession.findFirst({ where: { assignmentId: assignment.id, status: "PLANNED" }, orderBy: [{ scheduledAt: "asc" }, { id: "asc" }], select: { id: true, version: true } });
    const data = { status: "COMPLETED" as const, completedAt: now, focus: input.focus || null, sharedNote: input.sharedNote || null, privateNote: input.privateNote || null };
    const session = planned ? await tx.coachingSession.update({ where: { id: planned.id, status: "PLANNED", version: planned.version }, data: { ...data, version: { increment: 1 } } }) : await tx.coachingSession.create({ data: { ...data, assignmentId: assignment.id, scheduledAt: now } });
    const nextAt = input.nextAt ? new Date(input.nextAt) : assignment.cadenceDays ? new Date(now.getTime() + assignment.cadenceDays * 86400000) : null;
    if (nextAt) await tx.coachingSession.create({ data: { assignmentId: assignment.id, scheduledAt: nextAt } });
    await tx.auditLog.create({ data: { actorType: "USER", actorUserId: actorId, entityType: "CoachingSession", entityId: session.id, action: "coaching.session.record", summary: "Koç görüşmesi kaydedildi" } });
    return { ok: true as const, id: session.id };
  });
}
export async function setCoachGoal(input: z.infer<typeof coachGoalSchema>, actorId: string, db: PrismaClient = prisma) {
  return db.$transaction(async (tx) => {
    if (!await coachPreparationScope(actorId, input.studentId, tx as PrismaClient)) throw new GroupMutationError("NOT_FOUND", "Öğrenci bulunamadı.", 404);
    const subjectName = input.kind === "SUBJECT_NET" ? input.subjectName! : null;
    if (subjectName && !await tx.mockExamSection.findFirst({ where: { mockExam: { studentId: input.studentId }, subjectName }, select: { id: true } })) throw new GroupMutationError("INVALID_SUBJECT", "Öğrencinin deneme derslerinden seçin.", 400);
    await tx.studentGoal.updateMany({ where: { studentId: input.studentId, kind: input.kind, subjectName, archivedAt: null }, data: { archivedAt: new Date() } });
    const goal = await tx.studentGoal.create({ data: { studentId: input.studentId, kind: input.kind, subjectName, targetValue: input.targetValue, nearTermNote: input.nearTermNote || null, setById: actorId } });
    await tx.auditLog.create({ data: { actorType: "USER", actorUserId: actorId, entityType: "StudentGoal", entityId: goal.id, action: "coaching.goal.set", summary: "Öğrenci hedefi belirlendi" } });
    return { ok: true as const, id: goal.id };
  });
}
