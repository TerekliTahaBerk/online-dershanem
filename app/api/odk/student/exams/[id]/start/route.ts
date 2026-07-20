import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { attemptStartError, decideAttemptStart } from "@/lib/odk/attempt-domain";
import { odkLateEntryBand } from "@/lib/odk/telemetry";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ meetAcknowledged: z.boolean().default(false) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.attempt.start", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:attempt-start:${auth.session.userId}`, rateLimit: { max: 15, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Sınav giriş onayını kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const exam = await prisma.odkExam.findFirst({ where: { id, publishedAt: { not: null } }, select: { id: true, family: true, status: true, startsAt: true, endsAt: true, lateEntryMinutes: true, attemptLimit: true, meetRequired: true, currentVersion: { select: { id: true, status: true, durationMinutes: true } } } });
  if (!exam?.currentVersion || exam.currentVersion.status !== "LOCKED") return NextResponse.json({ error: "Sınav sürümü kullanıma hazır değil." }, { status: 409 });
  const existing = await prisma.odkExamAttempt.findFirst({ where: { examId: id, studentUserId: auth.session.userId, status: "IN_PROGRESS" }, orderBy: { attemptNumber: "desc" } });
  if (existing && existing.deadlineAt > new Date()) { await recordPanelProductEvent({ name: "odk_attempt_started", properties: { family: exam.family, resumed: true, lateEntryBand: odkLateEntryBand(exam.startsAt, existing.startedAt) } }, "STUDENT"); return NextResponse.json({ attemptId: existing.id, resumed: true }); }
  if (existing) await prisma.odkExamAttempt.update({ where: { id: existing.id }, data: { status: "AUTO_SUBMITTED", submittedAt: new Date() } });
  if (exam.meetRequired && !parsed.data.meetAcknowledged) return NextResponse.json({ error: "Sınava başlamadan önce Meet katılımınızı onaylayın." }, { status: 400 });
  const decision = decideAttemptStart({ ...exam, durationMinutes: exam.currentVersion.durationMinutes });
  if (!decision.ok) return NextResponse.json({ error: attemptStartError[decision.code], code: decision.code }, { status: 409 });
  const previous = await prisma.odkExamAttempt.aggregate({ where: { examId: id, studentUserId: auth.session.userId, status: { not: "VOID" } }, _count: true, _max: { attemptNumber: true } });
  if (previous._count >= exam.attemptLimit) return NextResponse.json({ error: "Bu deneme için giriş hakkınız kullanılmış." }, { status: 409 });
  const now = new Date();
  let attempt;
  try {
    attempt = await prisma.odkExamAttempt.create({ data: { examId: id, versionId: exam.currentVersion.id, studentUserId: auth.session.userId, attemptNumber: (previous._max.attemptNumber || 0) + 1, meetAcknowledgedAt: exam.meetRequired ? now : null, startedAt: now, deadlineAt: decision.deadlineAt, lastActivityAt: now } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const concurrent = await prisma.odkExamAttempt.findFirst({ where: { examId: id, studentUserId: auth.session.userId, status: "IN_PROGRESS", deadlineAt: { gt: now } }, orderBy: { attemptNumber: "desc" } });
    if (!concurrent) throw error;
    return NextResponse.json({ attemptId: concurrent.id, resumed: true });
  }
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExamAttempt", entityId: attempt.id, action: "odk.attempt_started", summary: "Öğrenci deneme oturumunu başlattı", payload: { examId: id, attemptNumber: attempt.attemptNumber } });
  await recordPanelProductEvent({ name: "odk_attempt_started", properties: { family: exam.family, resumed: false, lateEntryBand: odkLateEntryBand(exam.startsAt, now) } }, "STUDENT");
  return NextResponse.json({ attemptId: attempt.id, resumed: false });
}
