import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PilotCohort, type PilotCohortMember, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { getPilotReadiness } from "@/lib/pilot-readiness-server";
import { pilotTransitionAllowed, roleCoverage } from "@/lib/pilot-rollout";
import { operationDigest } from "./group-mutation-core";

/**
 * PİLOT KOHORTU servisi — web kontrolü ve mobil yönetim ekranı AYNI
 * `pilot-cohorts` uçlarını, o uçlar da bu servisi çağırır.
 *
 *  - Oluşturma: `requestKey` (UUID) aktöre bağlı işlem anahtarıdır. Aynı
 *    anahtar aynı gövdeyle tekrar gelirse ilk sonuç döner; başka gövde veya
 *    başka yönetici için kullanılırsa 409 `IDEMPOTENCY_REUSE`.
 *  - Geçiş: `expectedVersion` (sürüm/409) + isteğe bağlı `idempotencyKey`.
 *  - Kohort / durum değişikliği ve audit makbuzu TEK Serializable
 *    transaction'dadır; ürün olayı commit sonrası yazılır.
 */

export type PilotAction = "ACTIVATE" | "PAUSE" | "RESUME" | "COMPLETE" | "ROLLBACK";
export type PilotStopReason = "GUARDRAIL_BREACH" | "SECURITY_INCIDENT" | "DATA_QUALITY" | "OPERATIONAL" | "MANUAL_COMPLETION";
type Readiness = Awaited<ReturnType<typeof getPilotReadiness>>;

export class PilotCohortError extends Error {
  constructor(
    public status: 400 | 404 | 409,
    public code: string,
    message: string,
    public checks?: Readiness["checks"],
  ) {
    super(message);
  }
}

const memberBand = (count: number) => (count <= 4 ? ("1-4" as const) : count <= 12 ? ("5-12" as const) : ("13+" as const));
const readinessBand = (readiness: Readiness) => (readiness.canExpand ? ("PASS" as const) : readiness.canActivate ? ("WAIT" as const) : ("BLOCK" as const));
const reuse = () => new PilotCohortError(409, "IDEMPOTENCY_REUSE", "İşlem anahtarı farklı bir istek için kullanılamaz.");
const isRetryable = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code);

function readReceipt(payload: unknown, digest: string) {
  const saved = payload as { operationDigest?: string } | null;
  if (saved?.operationDigest !== digest) throw reuse();
}

export async function createPilotCohortService(input: { actorUserId: string; actorRole: UserRole; groupId: string; requestKey: string }): Promise<{ cohort: PilotCohort & { members: PilotCohortMember[] }; replayed: boolean }> {
  const key = `pilot-create:${input.actorUserId}:${input.requestKey}`;
  const digest = operationDigest({ groupId: input.groupId });
  const replay = async () => {
    const cohort = await prisma.pilotCohort.findUnique({ where: { requestKey: input.requestKey }, include: { members: true } });
    if (!cohort) return null;
    const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
    // Anahtar başka bir yöneticinin kohortunu döndürmez.
    if (!receipt) throw reuse();
    readReceipt(receipt.payload, digest);
    return { cohort, replayed: true };
  };
  const prior = await replay();
  if (prior) return prior;

  let memberCount = 0;
  try {
    const cohort = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('pilot-cohort', 0))::text`;
        const existing = await tx.pilotCohort.findFirst({ where: { groupId: input.groupId, status: { in: ["DRAFT", "ACTIVE", "PAUSED"] } }, select: { id: true } });
        if (existing) throw new PilotCohortError(409, "OPEN_COHORT_EXISTS", "Bu grup için açık bir pilot kaydı zaten var.");
        const group = await tx.group.findFirst({ where: { id: input.groupId, isActive: true }, select: { id: true, name: true, teacher: { select: { id: true, role: true, status: true } }, enrollments: { where: { endedAt: null, student: { user: { status: "ACTIVE" } } }, select: { student: { select: { user: { select: { id: true, role: true } }, parents: { where: { parent: { status: "ACTIVE" } }, select: { parent: { select: { id: true, role: true } } } } } } } } } });
        if (!group || group.teacher.status !== "ACTIVE") throw new PilotCohortError(404, "GROUP_NOT_FOUND", "Aktif grup ve öğretmen bulunamadı.");
        const memberMap = new Map<string, "ADMIN" | "TEACHER" | "STUDENT" | "PARENT">([[input.actorUserId, "ADMIN"], [group.teacher.id, "TEACHER"]]);
        for (const enrollment of group.enrollments) {
          memberMap.set(enrollment.student.user.id, "STUDENT");
          for (const link of enrollment.student.parents) memberMap.set(link.parent.id, "PARENT");
        }
        const members = [...memberMap].map(([userId, role]) => ({ userId, role }));
        const coverage = roleCoverage(members.map((item) => item.role));
        if (!Object.values(coverage).every((count) => count > 0)) throw new PilotCohortError(400, "ROLE_COVERAGE", "Pilot için admin, öğretmen, öğrenci ve en az bir aktif veli gerekir.");
        memberCount = members.length;
        const created = await tx.pilotCohort.create({ data: { groupId: group.id, groupNameSnapshot: group.name, createdById: input.actorUserId, requestKey: input.requestKey, members: { create: members } }, include: { members: true } });
        await tx.auditLog.create({ data: { actorUserId: input.actorUserId, actorType: "USER", idempotencyKey: key, entityType: "PilotCohort", entityId: created.id, action: "pilot.cohort_created", summary: `${group.name} için dört rollü pilot taslağı oluşturuldu`, payload: { operationDigest: digest, groupId: group.id, memberCount: members.length, coverage } } });
        return created;
      },
      { isolationLevel: "Serializable", timeout: 15_000 },
    );
    await recordPanelProductEvent({ name: "pilot_cohort_changed", properties: { action: "CREATED", memberBand: memberBand(memberCount), fourRoleCoverage: true, readiness: "WAIT" } }, input.actorRole);
    return { cohort, replayed: false };
  } catch (error) {
    if (isRetryable(error)) {
      const saved = await replay();
      if (saved) return saved;
      throw new PilotCohortError(409, "PILOT_CONFLICT", "Pilot kaydı eşzamanlı değişti. Görünümü yenileyin.");
    }
    throw error;
  }
}

export async function transitionPilotCohortService(input: { actorUserId: string; actorRole: UserRole; cohortId: string; action: PilotAction; expectedVersion: number; stopReason?: PilotStopReason; idempotencyKey?: string }): Promise<{ cohort: PilotCohort; readiness: Readiness; replayed: boolean }> {
  const key = `pilot-transition:${input.actorUserId}:${input.idempotencyKey ?? randomUUID()}`;
  const digest = operationDigest({ cohortId: input.cohortId, action: input.action, expectedVersion: input.expectedVersion, stopReason: input.stopReason ?? null });
  const replay = async () => {
    const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
    if (!receipt) return null;
    readReceipt(receipt.payload, digest);
    const cohort = await prisma.pilotCohort.findUniqueOrThrow({ where: { id: input.cohortId }, include: { members: { select: { role: true } } } });
    const { members, ...rest } = cohort;
    return { cohort: rest, readiness: await getPilotReadiness(members.map((member) => member.role)), replayed: true };
  };
  const prior = await replay();
  if (prior) return prior;

  const cohort = await prisma.pilotCohort.findUnique({ where: { id: input.cohortId }, include: { members: { select: { role: true } } } });
  if (!cohort) throw new PilotCohortError(404, "NOT_FOUND", "Pilot kohortu bulunamadı.");
  if (cohort.version !== input.expectedVersion) throw new PilotCohortError(409, "VERSION_CONFLICT", "Pilot başka bir yönetici tarafından güncellendi. Sayfayı yenileyin.");
  if (!pilotTransitionAllowed(cohort.status, input.action)) throw new PilotCohortError(409, "TRANSITION_NOT_ALLOWED", "Bu pilot durumunda seçilen geçiş yapılamaz.");
  if ((input.action === "PAUSE" || input.action === "ROLLBACK") && !input.stopReason) throw new PilotCohortError(400, "STOP_REASON_REQUIRED", "Durdurma nedeni seçilmelidir.");
  const readiness = await getPilotReadiness(cohort.members.map((member) => member.role));
  if ((input.action === "ACTIVATE" || input.action === "RESUME") && !readiness.canActivate) throw new PilotCohortError(409, "READINESS_BLOCKED", "Pilot aktivasyon kapıları tamamlanmadı.", readiness.checks);

  const status = input.action === "ACTIVATE" || input.action === "RESUME" ? "ACTIVE" : input.action === "PAUSE" ? "PAUSED" : input.action === "COMPLETE" ? "COMPLETED" : "ROLLED_BACK";
  const stops = input.action === "PAUSE" || input.action === "COMPLETE" || input.action === "ROLLBACK";
  const stopReason = input.action === "COMPLETE" ? "MANUAL_COMPLETION" : input.stopReason;
  const now = new Date();
  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const result = await tx.pilotCohort.updateMany({
          where: { id: cohort.id, version: cohort.version, status: cohort.status },
          data: {
            status,
            version: { increment: 1 },
            startedAt: input.action === "ACTIVATE" ? now : undefined,
            stoppedAt: stops ? now : input.action === "RESUME" ? null : undefined,
            stopReason: stops ? stopReason : input.action === "RESUME" ? null : undefined,
          },
        });
        if (!result.count) throw new PilotCohortError(409, "VERSION_CONFLICT", "Pilot durumu çakıştı. Sayfayı yenileyin.");
        const next = await tx.pilotCohort.findUniqueOrThrow({ where: { id: cohort.id } });
        await tx.auditLog.create({ data: { actorUserId: input.actorUserId, actorType: "USER", idempotencyKey: key, entityType: "PilotCohort", entityId: cohort.id, action: `pilot.${input.action.toLowerCase()}`, summary: `Pilot durumu ${status} olarak güncellendi`, payload: { operationDigest: digest, from: cohort.status, to: status, stopReason: stopReason || null, version: next.version, readiness: readinessBand(readiness) } } });
        return next;
      },
      { isolationLevel: "Serializable", timeout: 15_000 },
    );
    await recordPanelProductEvent({ name: "pilot_cohort_changed", properties: { action: input.action, memberBand: memberBand(cohort.members.length), fourRoleCoverage: Object.values(readiness.coverage).every((count) => count > 0), readiness: readinessBand(readiness) } }, input.actorRole);
    return { cohort: updated, readiness, replayed: false };
  } catch (error) {
    if (isRetryable(error)) {
      const saved = await replay();
      if (saved) return saved;
      throw new PilotCohortError(409, "VERSION_CONFLICT", "Pilot durumu çakıştı. Sayfayı yenileyin.");
    }
    throw error;
  }
}
