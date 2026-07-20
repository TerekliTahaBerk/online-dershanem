import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";
import { STUDENT_CHECK_IN_WEEKLY_LIMIT, studentCheckInWeekEnd, studentCheckInWeekStart, studentHelpDueAt } from "@/lib/student-check-in";

const schema = z.object({
  groupId: z.string().min(1),
  energy: z.enum(["LOW", "STEADY", "GOOD"]),
  confidence: z.enum(["NEED_GUIDANCE", "BUILDING", "CONFIDENT"]),
  barrier: z.enum(["NONE", "NOT_UNDERSTANDING", "TIME_LOAD", "ACCESS_TECH", "NEED_EXAMPLE", "OTHER"]),
  shareWithTeacher: z.boolean(),
  helpRequested: z.boolean(),
}).strict().refine((value) => !value.helpRequested || value.shareWithTeacher, { message: "Yardım isteği öğretmenle paylaşılmalıdır." });

export async function POST(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().studentCheckIn) return NextResponse.json({ error: "Check-in henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.student_check_in.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:student-check-in:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check-in seçeneklerini kontrol et." }, { status: 400 });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 });
  const enrollment = await prisma.enrollment.findFirst({ where: { studentId: profile.id, groupId: parsed.data.groupId, endedAt: null, group: { isActive: true } }, include: { group: { select: { teacherId: true } } } });
  if (!enrollment) return NextResponse.json({ error: "Aktif grup bulunamadı." }, { status: 404 });
  const now = new Date();
  let result: { kind: "CREATED"; checkIn: { id: string }; helpRequest: { id: string } | null; weeklyCount: number } | { kind: "LIMIT" } | { kind: "OPEN" };
  try {
    result = await prisma.$transaction(async (tx) => {
      const weeklyCount = await tx.studentCheckIn.count({ where: { studentId: profile.id, createdAt: { gte: studentCheckInWeekStart(now), lt: studentCheckInWeekEnd(now) } } });
      if (weeklyCount >= STUDENT_CHECK_IN_WEEKLY_LIMIT) return { kind: "LIMIT" as const };
      if (parsed.data.helpRequested) {
        const open = await tx.studentHelpRequest.findFirst({ where: { studentId: profile.id, groupId: parsed.data.groupId, status: { in: ["OPEN", "RESPONDED"] } }, select: { id: true } });
        if (open) return { kind: "OPEN" as const };
      }
      const checkIn = await tx.studentCheckIn.create({ data: { studentId: profile.id, groupId: parsed.data.groupId, energy: parsed.data.energy, confidence: parsed.data.confidence, barrier: parsed.data.barrier, shareWithTeacher: parsed.data.shareWithTeacher } });
      const helpRequest = parsed.data.helpRequested ? await tx.studentHelpRequest.create({ data: { checkInId: checkIn.id, studentId: profile.id, groupId: parsed.data.groupId, dueAt: studentHelpDueAt(now) } }) : null;
      if (parsed.data.helpRequested) await tx.notification.create({ data: { userId: enrollment.group.teacherId, type: "SYSTEM", title: "Yeni yardım isteği", body: "Bir öğrencin kontrollü check-in üzerinden yardım istedi.", href: "/panel/ogretmen/yardim" } });
      return { kind: "CREATED" as const, checkIn, helpRequest, weeklyCount: weeklyCount + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Aynı anda başka bir check-in kaydedildi. Sayfayı yenileyip tekrar kontrol et." }, { status: 409 });
    throw error;
  }
  if (result.kind === "LIMIT") return NextResponse.json({ error: "Bu hafta iki check-in tamamladın. Yeni hafta başladığında tekrar uğrayabilirsin." }, { status: 409 });
  if (result.kind === "OPEN") return NextResponse.json({ error: "Bu grup için açık bir yardım isteğin zaten var." }, { status: 409 });
  const created = result;
  await logAudit({ actorUserId: auth.session.userId, entityType: "StudentCheckIn", entityId: created.checkIn.id, action: "student_check_in.created", summary: "Kontrollü öğrenci check-in'i kaydedildi", payload: { sharedWithTeacher: parsed.data.shareWithTeacher, helpRequested: parsed.data.helpRequested } });
  await recordPanelProductEvent({ name: "student_check_in_submitted", properties: { energy: parsed.data.energy, confidence: parsed.data.confidence, barrier: parsed.data.barrier, sharedWithTeacher: parsed.data.shareWithTeacher, helpRequested: parsed.data.helpRequested, weeklyCount: created.weeklyCount } }, auth.session.role);
  return NextResponse.json({ created: true, checkInId: created.checkIn.id, helpRequestId: created.helpRequest?.id || null }, { status: 201 });
}
