import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ textEvidence: z.string().trim().min(20).max(2000), idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{12,80}$/) }).strict();
function attemptBand(value: number): "1" | "2" | "3+" { return value === 1 ? "1" : value === 2 ? "2" : "3+"; }
function characterBand(value: number): "20-199" | "200-499" | "500+" { return value < 200 ? "20-199" : value < 500 ? "200-499" : "500+"; }

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("STUDENT"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().assignmentEvidence) return NextResponse.json({ error: "Kanıtlı teslim henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.assignment-evidence.submit", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:assignment-evidence:${auth.session.userId}`, rateLimit: { max: 40, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Kanıt metni 20–2000 karakter olmalı." }, { status: 400 });
  const { id } = await context.params; const storedKey = `${auth.session.userId}:${parsed.data.idempotencyKey}`;
  const replay = await prisma.assignmentSubmission.findUnique({ where: { idempotencyKey: storedKey }, select: { id: true, assignmentId: true, student: { select: { userId: true } }, attemptNumber: true } });
  if (replay) return replay.assignmentId === id && replay.student.userId === auth.session.userId ? NextResponse.json({ id: replay.id, attemptNumber: replay.attemptNumber, replayed: true }) : NextResponse.json({ error: "Teslim anahtarı kullanılamıyor." }, { status: 409 });
  const assignment = await prisma.assignment.findFirst({ where: { id, isActive: true, evidenceRequired: true, group: { isActive: true, enrollments: { some: { endedAt: null, student: { userId: auth.session.userId } } } } }, include: { group: { select: { teacherId: true } }, rubricCriteria: { select: { id: true } }, progress: { where: { student: { userId: auth.session.userId } }, select: { studentId: true }, take: 1 }, submissions: { where: { student: { userId: auth.session.userId } }, orderBy: { attemptNumber: "desc" }, take: 1, select: { attemptNumber: true, status: true } } } });
  if (!assignment || assignment.rubricCriteria.length < 2 || !assignment.progress[0]) return NextResponse.json({ error: "Kanıtlı ödev bulunamadı." }, { status: 404 });
  const latest = assignment.submissions[0]; if (latest && latest.status !== "CHANGES_REQUESTED") return NextResponse.json({ error: latest.status === "APPROVED" ? "Bu çalışma öğretmenin tarafından onaylandı." : "Gönderimin öğretmen değerlendirmesinde." }, { status: 409 });
  const attemptNumber = (latest?.attemptNumber || 0) + 1;
  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.assignmentSubmission.create({ data: { assignmentId: id, studentId: assignment.progress[0].studentId, attemptNumber, textEvidence: parsed.data.textEvidence, idempotencyKey: storedKey } });
    await tx.assignmentProgress.update({ where: { assignmentId_studentId: { assignmentId: id, studentId: assignment.progress[0].studentId } }, data: { status: "IN_PROGRESS", completedAt: null } });
    await tx.notification.create({ data: { userId: assignment.group.teacherId, type: "ASSIGNMENT", title: "Değerlendirme bekleyen çalışma", body: "Bir öğrenci kanıtlı çalışmasını gönderdi.", href: "/panel/ogretmen/odevler" } });
    return created;
  });
  await recordPanelProductEvent({ name: "assignment_evidence_submitted", properties: { attemptBand: attemptBand(attemptNumber), characterBand: characterBand(parsed.data.textEvidence.length), late: new Date() > assignment.dueAt, replayed: false } }, auth.session.role);
  return NextResponse.json({ id: submission.id, attemptNumber, replayed: false });
}
