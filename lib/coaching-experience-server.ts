import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coachingCreateSchema, coachingMutationSchema } from "./coaching-experience";
import { istanbulDayStart, istanbulWeekStart } from "./istanbul-time";
import { recordPlanRevision } from "./kocum/server";
import { queueReminderNotification } from "./reminder-notifications";
import { getPanelFeatureFlags } from "./panel-feature-flags";
export type CoachingActor = { userId: string; role: "TEACHER" | "STUDENT" | "PARENT" };
export class CoachingExperienceError extends Error {
  constructor(public status: 400 | 404 | 409, message: string) { super(message); }
}
export function coachingAssignmentScope(actor: CoachingActor): Prisma.CoachAssignmentWhereInput {
  const now = new Date();
  return { endedAt: null, student: { user: { status: "ACTIVE", productMemberships: { some: { product: "OK", revokedAt: null, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } },
    ...(actor.role === "STUDENT" ? { userId: actor.userId } : actor.role === "PARENT" ? { parents: { some: { parentId: actor.userId, active: true, endedAt: null, canViewAcademic: true } } } : {}),
  }, ...(actor.role === "TEACHER" ? { coach: { userId: actor.userId } } : {}) };
}
function operation(actor: CoachingActor, input: { idempotencyKey: string }, target: string) {
  return { id: `coaching:${createHash("sha256").update(`${actor.userId}:${input.idempotencyKey}`).digest("hex")}`, hash: createHash("sha256").update(JSON.stringify({ target, input })).digest("hex") };
}
async function replay(tx: Prisma.TransactionClient, op: { id: string; hash: string }) {
  const audit = await tx.auditLog.findUnique({ where: { id: op.id }, select: { payload: true } });
  if (!audit) return null;
  const payload = audit.payload as { requestHash?: string; result?: { id: string; version: number } };
  if (payload.requestHash !== op.hash || !payload.result) throw new CoachingExperienceError(409, "Bu işlem anahtarı başka bir değişiklik için kullanıldı.");
  return payload.result;
}
async function audited(tx: Prisma.TransactionClient, actor: CoachingActor, op: { id: string; hash: string }, action: string, result: { id: string; version: number }) {
  await tx.auditLog.create({ data: { id: op.id, actorUserId: actor.userId, entityType: "CoachingSession", entityId: result.id, action: `coaching.session.${action.toLowerCase()}`, summary: "Koçluk görüşmesi güncellendi", payload: { requestHash: op.hash, result } } });
  return result;
}
async function transact<T>(job: (tx: Prisma.TransactionClient) => Promise<T>) {
  try { return await prisma.$transaction(job, { isolationLevel: "Serializable" }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) throw new CoachingExperienceError(409, "Görüşme başka bir işlemde değişti. Güncel bilgiyi kontrol edin."); throw error; }
}
export async function createCoachingSession(actor: CoachingActor, raw: unknown) {
  const input = coachingCreateSchema.parse(raw);
  if (actor.role !== "TEACHER") throw new CoachingExperienceError(404, "Görüşme bulunamadı.");
  return transact(async (tx) => {
    const assignment = await tx.coachAssignment.findFirst({ where: { ...coachingAssignmentScope(actor), studentId: input.studentId }, select: { id: true } });
    if (!assignment) throw new CoachingExperienceError(404, "Koç ataması bulunamadı.");
    const op = operation(actor, input, assignment.id);
    const prior = await replay(tx, op); if (prior) return prior;
    if (new Date(input.scheduledAt) <= new Date()) throw new CoachingExperienceError(400, "Gelecekteki bir görüşme saatini seçin.");
    const created = await tx.coachingSession.create({ data: { assignmentId: assignment.id, scheduledAt: new Date(input.scheduledAt), meetingUrl: input.meetingUrl }, select: { id: true, version: true } });
    return audited(tx, actor, op, "CREATE", created);
  });
}
export async function mutateCoachingSession(actor: CoachingActor, id: string, raw: unknown) {
  const input = coachingMutationSchema.parse(raw);
  return transact(async (tx) => {
    const session = await tx.coachingSession.findFirst({ where: { id, assignment: coachingAssignmentScope(actor) }, include: { assignment: { select: { studentId: true, coach: { select: { userId: true } }, student: { select: { userId: true } } } } } });
    if (!session || ((input.action === "SAVE" || input.action === "COMPLETE") && actor.role !== "TEACHER") || (input.action === "REQUEST" && actor.role === "TEACHER") || (input.action === "ACCEPT" && actor.role !== "STUDENT")) throw new CoachingExperienceError(404, "Görüşme bulunamadı.");
    const op = operation(actor, input, id); const prior = await replay(tx, op); if (prior) return prior;
    if (session.status !== "PLANNED" || session.version !== input.expectedVersion) throw new CoachingExperienceError(409, "Görüşme değişti. Güncel bilgiyi kontrol edin.");
    let data: Prisma.CoachingSessionUpdateManyMutationInput;
    if (input.action === "REQUEST") {
      if (session.rescheduleRequestedAt) throw new CoachingExperienceError(409, "Saat değişikliği talebiniz zaten alındı.");
      data = { rescheduleRequestedAt: new Date(), rescheduleReason: input.reason };
    } else if (input.action === "SAVE") {
      if (new Date(input.scheduledAt) <= new Date()) throw new CoachingExperienceError(400, "Gelecekteki bir görüşme saatini seçin.");
      data = session.rescheduleRequestedAt ? { proposedAt: new Date(input.scheduledAt), proposedMeetingUrl: input.meetingUrl } : { scheduledAt: new Date(input.scheduledAt), meetingUrl: input.meetingUrl };
    } else if (input.action === "ACCEPT") {
      if (!session.rescheduleRequestedAt || !session.proposedAt || session.proposedAt <= new Date()) throw new CoachingExperienceError(409, "Güncel bir saat önerisi bulunamadı.");
      data = { scheduledAt: session.proposedAt, meetingUrl: session.proposedMeetingUrl, rescheduleRequestedAt: null, rescheduleReason: null, proposedAt: null, proposedMeetingUrl: null };
    } else {
      data = { status: "COMPLETED", completedAt: new Date(), focus: input.focus || null, sharedNote: input.sharedNote || null, privateNote: input.privateNote || null };
      if (input.decisions.length) {
        if (!getPanelFeatureFlags().adaptivePlan) throw new CoachingExperienceError(404, "Haftalık çalışmalar henüz hazırlanmadı.");
        const weekStart = istanbulWeekStart(new Date());
        if (input.decisions.some((decision) => istanbulWeekStart(new Date(decision.scheduledFor)).getTime() !== weekStart.getTime())) throw new CoachingExperienceError(400, "Kararları bu haftanın günlerine yerleştirin.");
        const product = await tx.product.findUniqueOrThrow({ where: { code: "OK" }, select: { id: true } });
        let plan = await tx.weeklyPlan.findUnique({ where: { studentId_weekStart: { studentId: session.assignment.studentId, weekStart } } });
        if (plan && (plan.productRefId !== product.id || plan.status === "ARCHIVED")) throw new CoachingExperienceError(409, "Bu haftanın planını önce koçluk ekranından kontrol edin.");
        if (!plan) plan = await tx.weeklyPlan.create({ data: { studentId: session.assignment.studentId, productRefId: product.id, weekStart, capacityMinutes: 0, createdById: actor.userId } });
        let position = (await tx.weeklyPlanTask.aggregate({ where: { planId: plan.id }, _max: { position: true } }))._max.position ?? 0;
        for (const decision of input.decisions) await tx.weeklyPlanTask.create({ data: { planId: plan.id, title: decision.title, scheduledFor: istanbulDayStart(new Date(decision.scheduledFor)), durationMinutes: decision.durationMinutes, position: ++position, sourceType: "MANUAL_COACH", sourceReferenceId: id, reasonCode: "CAPACITY_BALANCE" } });
        const updated = await tx.weeklyPlan.updateMany({ where: { id: plan.id, version: plan.version }, data: { status: "DRAFT", approvedAt: null, approvedById: null, autoApproved: false, capacityMinutes: { increment: input.decisions.reduce((sum, decision) => sum + decision.durationMinutes, 0) }, version: { increment: 1 } } });
        if (!updated.count) throw new CoachingExperienceError(409, "Haftalık plan başka bir işlemde değişti.");
        await recordPlanRevision({ planId: plan.id, version: plan.version + 1, changedById: actor.userId, changeSummary: "Görüşmenin haftalık kararları eklendi; koç onayı bekleniyor.", tx });
        await tx.auditLog.create({ data: { actorUserId: actor.userId, entityType: "WeeklyPlan", entityId: plan.id, action: "coaching.decisions.drafted", summary: "Görüşme kararları onay bekleyen plana eklendi", payload: { decisionCount: input.decisions.length } } });
      }
    }
    const changed = await tx.coachingSession.updateMany({ where: { id, version: input.expectedVersion, status: "PLANNED" }, data: { ...data, version: { increment: 1 } } });
    if (!changed.count) throw new CoachingExperienceError(409, "Görüşme başka bir işlemde değişti.");
    const result = { id, version: input.expectedVersion + 1 };
    if (input.action === "REQUEST" || (input.action === "SAVE" && session.rescheduleRequestedAt)) {
      const userId = input.action === "REQUEST" ? session.assignment.coach.userId : session.assignment.student.userId;
      await queueReminderNotification(tx, { id: `${userId}:COACHING:${id}:${input.action}:${result.version}`, userId, type: "SYSTEM", title: input.action === "REQUEST" ? "Görüşme saati için talep var" : "Koçun yeni bir saat önerdi", body: input.action === "REQUEST" ? "Öğrencinizin saat değişikliği talebini görüşme kartından inceleyebilirsiniz." : "Yeni görüşme saatini koçluk ekranından kontrol edip onaylayabilirsin.", href: input.action === "REQUEST" ? `/panel/ogretmen/hazirlik/${session.assignment.studentId}` : "/panel/ogrenci/kocluk" }, "lessonSummary");
    }
    return audited(tx, actor, op, input.action, result);
  });
}
