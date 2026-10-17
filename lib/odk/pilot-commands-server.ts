import "server-only";
import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { educationTransactionClient, transactionalAudit } from "@/lib/panel/education-write";
import { GroupMutationError } from "@/lib/panel/group-mutation-core";
import { roleCoverage } from "@/lib/pilot-rollout";
import { getOdkPilotReadiness } from "./pilot-readiness-server";
import { odkPilotTransitionAllowed } from "./pilot-rollout";
export const createOdkPilotSchema = z.object({ name: z.string().trim().min(3).max(80), userIds: z.array(z.string().min(1).max(80)).min(5).max(100), requestKey: z.string().uuid() }).strict();
export const transitionOdkPilotSchema = z.object({ action: z.enum(["ACTIVATE", "PAUSE", "RESUME", "COMPLETE", "ROLLBACK"]), expectedVersion: z.number().int().positive(), stopReason: z.enum(["GUARDRAIL_BREACH", "SECURITY_INCIDENT", "DATA_QUALITY", "OPERATIONAL", "MANUAL_COMPLETION"]).optional() }).strict();
export async function replayOdkPilot(input: z.output<typeof createOdkPilotSchema>, actorId: string, db: PrismaClient = prisma) {
  const run = await db.odkPilotRun.findUnique({ where: { requestKey: input.requestKey }, include: { members: true } });
  if (!run) return null;
  if (run.createdById !== actorId || run.name !== input.name || JSON.stringify(run.members.map((m) => m.userId).sort()) !== JSON.stringify([...new Set(input.userIds)].sort())) throw new GroupMutationError("IDEMPOTENCY_CONFLICT", "Aynı işlem anahtarı farklı pilot bilgileriyle kullanılamaz.");
  return NextResponse.json({ run, replayed: true });
}
export async function createOdkPilot(input: z.output<typeof createOdkPilotSchema>, actorId: string, client: PrismaClient = prisma) {
  return client.$transaction(async (tx) => {
    const db = educationTransactionClient(tx);
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('odk-pilot-write', 0))::text`;
    const replay = await replayOdkPilot(input, actorId, db); if (replay) return replay;
    if (await db.odkPilotRun.findFirst({ where: { status: { in: ["DRAFT", "ACTIVE", "PAUSED"] } }, select: { id: true } })) return NextResponse.json({ error: "Önce açık ODK pilot koşusunu tamamlayın veya geri alın." }, { status: 409 });
    const now = new Date(), userIds = [...new Set(input.userIds)];
    const users = await db.user.findMany({ where: { id: { in: userIds }, status: "ACTIVE", OR: [{ role: { in: ["ADMIN", "TEACHER"] } }, { productMemberships: { some: { product: "ODK", startsAt: { lte: now }, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } }] }, select: { id: true, role: true } });
    if (users.length !== userIds.length) return NextResponse.json({ error: "Seçilen hesaplardan biri aktif değil veya ODK erişimi yok." }, { status: 400 });
    const coverage = roleCoverage(users.map((u) => u.role));
    if (coverage.ADMIN < 1 || coverage.TEACHER < 1 || coverage.STUDENT < 2 || coverage.PARENT < 1) return NextResponse.json({ error: "Pilot için admin, öğretmen, en az iki öğrenci ve en az bir veli seçilmelidir." }, { status: 400 });
    const run = await db.odkPilotRun.create({ data: { name: input.name, createdById: actorId, requestKey: input.requestKey, members: { create: users.map((u) => ({ userId: u.id, role: u.role })) } }, include: { members: true } });
    await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkPilotRun", entityId: run.id, action: "odk.pilot_created", summary: `${run.name} ODK pilot taslağı oluşturuldu`, payload: { memberCount: users.length, coverage } });
    return NextResponse.json({ run, replayed: false });
  }, { isolationLevel: "Serializable", timeout: 30000 });
}
export async function transitionOdkPilot(id: string, input: z.output<typeof transitionOdkPilotSchema>, actorId: string, client: PrismaClient = prisma) {
  return client.$transaction(async (tx) => {
    const db = educationTransactionClient(tx);
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('odk-pilot-write', 0))::text`;
    const run = await db.odkPilotRun.findUnique({ where: { id }, include: { members: { orderBy: { userId: "asc" }, select: { role: true, userId: true } } } });
    if (!run) return NextResponse.json({ error: "ODK pilot koşusu bulunamadı; kaldırılmış ya da değişmiş olabilir." }, { status: 404 });
    if (run.version !== input.expectedVersion) return NextResponse.json({ error: "Pilot başka bir yönetici tarafından güncellendi. Sayfayı yenileyip tekrar deneyebilirsiniz." }, { status: 409 });
    if (!odkPilotTransitionAllowed(run.status, input.action)) return NextResponse.json({ error: "Bu pilot durumunda seçilen geçiş yapılamaz." }, { status: 409 });
    if (["PAUSE", "ROLLBACK"].includes(input.action) && !input.stopReason) return NextResponse.json({ error: "Durdurma nedeni seçilmelidir." }, { status: 400 });
    const readiness = await getOdkPilotReadiness(run.members, run.startedAt, db);
    if (["ACTIVATE", "RESUME"].includes(input.action) && !readiness.canActivate) return NextResponse.json({ error: "ODK pilot aktivasyon kapıları tamamlanmadı.", checks: readiness.checks }, { status: 409 });
    if (input.action === "COMPLETE" && !readiness.canExpand) return NextResponse.json({ error: "İki gerçek deneme ve kabul kanıtları tamamlanmadan pilot kapatılamaz.", checks: readiness.checks }, { status: 409 });
    const status = input.action === "ACTIVATE" || input.action === "RESUME" ? "ACTIVE" : input.action === "PAUSE" ? "PAUSED" : input.action === "COMPLETE" ? "COMPLETED" : "ROLLED_BACK";
    const now = new Date(), stopReason = input.action === "COMPLETE" ? "MANUAL_COMPLETION" : input.stopReason;
    const updatedCount = await db.odkPilotRun.updateMany({ where: { id, version: run.version, status: run.status }, data: { status, version: { increment: 1 }, startedAt: input.action === "ACTIVATE" ? now : undefined, stoppedAt: ["PAUSE", "COMPLETE", "ROLLBACK"].includes(input.action) ? now : input.action === "RESUME" ? null : undefined, stopReason: ["PAUSE", "COMPLETE", "ROLLBACK"].includes(input.action) ? stopReason : input.action === "RESUME" ? null : undefined } });
    if (!updatedCount.count) return NextResponse.json({ error: "Pilot durumu çakıştı. Sayfayı yenileyip tekrar deneyebilirsiniz." }, { status: 409 });
    const updated = await db.odkPilotRun.findUniqueOrThrow({ where: { id } });
    await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkPilotRun", entityId: id, action: `odk.pilot_${input.action.toLowerCase()}`, summary: `ODK pilot durumu ${status} olarak güncellendi`, payload: { from: run.status, to: status, stopReason: stopReason || null, version: updated.version, readiness: readiness.canExpand ? "PASS" : readiness.canActivate ? "WAIT" : "BLOCK" } });
    return NextResponse.json({ run: updated, readiness });
  }, { isolationLevel: "Serializable", timeout: 30000 });
}
