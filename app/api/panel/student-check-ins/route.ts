import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";
import { STUDENT_CHECK_IN_WEEKLY_LIMIT, studentCheckInWeekEnd, studentCheckInWeekStart, studentHelpDueAt } from "@/lib/student-check-in";

const schema = z.object({
  groupId: z.string().min(1).optional(),
  coachAssignmentId: z.string().min(1).optional(),
  energy: z.enum(["LOW", "STEADY", "GOOD"]),
  confidence: z.enum(["NEED_GUIDANCE", "BUILDING", "CONFIDENT"]),
  barrier: z.enum(["NONE", "NOT_UNDERSTANDING", "TIME_LOAD", "ACCESS_TECH", "NEED_EXAMPLE", "OTHER"]),
  shareWithTeacher: z.boolean(),
  helpRequested: z.boolean(),
}).strict().refine((value) => Boolean(value.groupId) !== Boolean(value.coachAssignmentId), { message: "Tek bir destek alanı seçilmeli." }).refine((value) => !value.helpRequested || value.shareWithTeacher, { message: "Yardım isteği öğretmenle paylaşılmalıdır." });

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const product = raw && typeof raw === "object" && "coachAssignmentId" in raw ? "OK" : "OD";
  const auth = await requireApiProductRole(product, "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().studentCheckIn) return NextResponse.json({ error: "Check-in henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.student_check_in.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:student-check-in:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Check-in seçeneklerini kontrol et." }, { status: 400 });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 });
  const enrollment = parsed.data.groupId ? await prisma.enrollment.findFirst({ where: { studentId: profile.id, groupId: parsed.data.groupId, endedAt: null, group: { isActive: true } }, include: { group: { select: { teacherId: true, name: true } } } }) : null;
  const coach = parsed.data.coachAssignmentId ? await prisma.coachAssignment.findFirst({ where: { id: parsed.data.coachAssignmentId, studentId: profile.id, endedAt: null, coach: { user: { status: "ACTIVE" } }, student: { enrollments: { none: { endedAt: null, group: { isActive: true } } } } }, select: { id: true, coach: { select: { userId: true } } } }) : null;
  if (!enrollment && !coach) return NextResponse.json({ error: "Destek alanı bulunamadı." }, { status: 404 });
  const target = enrollment ? { groupId: parsed.data.groupId!, coachAssignmentId: null } : { groupId: null, coachAssignmentId: coach!.id };
  const recipientId = enrollment?.group.teacherId ?? coach!.coach.userId;
  const now = new Date();
  let result: { kind: "CREATED"; checkIn: { id: string; createdAt: Date }; helpRequest: { id: string; status: string; version: number } | null; weeklyCount: number } | { kind: "LIMIT" } | { kind: "OPEN" };
  try {
    result = await prisma.$transaction(async (tx) => {
      if (coach && !(await tx.coachAssignment.findFirst({ where: { id: coach.id, studentId: profile.id, endedAt: null, coach: { user: { status: "ACTIVE" } }, student: { enrollments: { none: { endedAt: null, group: { isActive: true } } } } }, select: { id: true } }))) throw new Error("COACH_TARGET_CHANGED");
      const weeklyCount = await tx.studentCheckIn.count({ where: { studentId: profile.id, createdAt: { gte: studentCheckInWeekStart(now), lt: studentCheckInWeekEnd(now) } } });
      if (weeklyCount >= STUDENT_CHECK_IN_WEEKLY_LIMIT) return { kind: "LIMIT" as const };
      if (parsed.data.helpRequested) {
        const open = await tx.studentHelpRequest.findFirst({ where: { studentId: profile.id, ...target, status: { in: ["OPEN", "RESPONDED"] } }, select: { id: true } });
        if (open) return { kind: "OPEN" as const };
      }
      const checkIn = await tx.studentCheckIn.create({ data: { studentId: profile.id, ...target, energy: parsed.data.energy, confidence: parsed.data.confidence, barrier: parsed.data.barrier, shareWithTeacher: parsed.data.shareWithTeacher } });
      const helpRequest = parsed.data.helpRequested ? await tx.studentHelpRequest.create({ data: { checkInId: checkIn.id, studentId: profile.id, ...target, dueAt: studentHelpDueAt(now) } }) : null;
      if (parsed.data.helpRequested) await tx.notification.create({ data: { userId: recipientId, type: "SYSTEM", title: "Yeni yardım isteği", body: "Bir öğrencin kontrollü check-in üzerinden yardım istedi.", href: "/panel/ogretmen/yardim" } });
      return { kind: "CREATED" as const, checkIn, helpRequest, weeklyCount: weeklyCount + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "COACH_TARGET_CHANGED") return NextResponse.json({ error: "Destek alanı bulunamadı." }, { status: 404 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Aynı anda başka bir check-in kaydedildi. Sayfayı yenileyip tekrar kontrol et." }, { status: 409 });
    throw error;
  }
  if (result.kind === "LIMIT") return NextResponse.json({ error: "Bu hafta iki check-in tamamladın. Yeni hafta başladığında tekrar uğrayabilirsin." }, { status: 409 });
  if (result.kind === "OPEN") return NextResponse.json({ error: "Bu destek alanı için açık bir yardım isteğin zaten var." }, { status: 409 });
  const created = result;
  await logAudit({ actorUserId: auth.session.userId, entityType: "StudentCheckIn", entityId: created.checkIn.id, action: "student_check_in.created", summary: "Kontrollü öğrenci check-in'i kaydedildi", payload: { sharedWithTeacher: parsed.data.shareWithTeacher, helpRequested: parsed.data.helpRequested } });
  await recordPanelProductEvent({ name: "student_check_in_submitted", properties: { energy: parsed.data.energy, confidence: parsed.data.confidence, barrier: parsed.data.barrier, sharedWithTeacher: parsed.data.shareWithTeacher, helpRequested: parsed.data.helpRequested, weeklyCount: created.weeklyCount } }, auth.session.role);
  if (created.helpRequest) {
    await recordPanelProductEvent({
      name: "student_help_requested",
      properties: {
        product: "HELP",
        actionKind: "REQUEST_HELP",
        reasonCode: parsed.data.barrier,
        ageBand: "NA",
        evidenceBand: "NA",
        role: "STUDENT",
      },
    }, auth.session.role);
  }
  return NextResponse.json({ created: true, checkIn: { id: created.checkIn.id, createdAt: created.checkIn.createdAt, groupName: enrollment?.group.name ?? "onlinekoçum.", energy: parsed.data.energy, confidence: parsed.data.confidence, barrier: parsed.data.barrier, shared: parsed.data.shareWithTeacher, request: created.helpRequest ? { id: created.helpRequest.id, status: created.helpRequest.status, version: created.helpRequest.version, helpful: null, action: null } : null }, remaining: STUDENT_CHECK_IN_WEEKLY_LIMIT - created.weeklyCount }, { status: 201 });
}
