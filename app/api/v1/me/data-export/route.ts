/**
 * KVKK / Veri Sahibi Hakları — Kişisel Veri İhraç (Data Portability).
 *
 * GET /api/v1/me/data-export
 *
 * Login olmuş kullanıcının kendi verisini JSON olarak indirir.
 * Rol bağımsız: User + linkli Student/Teacher/Parent + bağlı kayıtlar.
 *
 * AUDIT: her çağrı KVKK_DATA_EXPORT olarak loglanır.
 * Rate-limit: kullanıcı başına 5 / gün.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const rl = await checkRateLimit(`kvkk:export:${userId}`, 5, 24 * 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "rate_limited", message: "Günlük 5 ihraç hakkınızı doldurdunuz." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true,
      student: {
        select: {
          id: true, fullName: true, phone: true, email: true,
          city: true, district: true, schoolName: true, classLevel: true,
          examType: true, targetGoal: true, status: true, notes: true,
          createdAt: true, updatedAt: true,
        },
      },
      teacher: {
        select: { id: true, fullName: true, phone: true, email: true, bio: true, createdAt: true },
      },
      parent: {
        select: { id: true, fullName: true, phone: true, email: true, createdAt: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  // İlişkili veriler — student varsa
  let related: Record<string, unknown> = {};
  // ODK Attempt User-level (rol bağımsız tüm rollerde olabilir)
  const odkAttempts = await prisma.odkExamAttempt.findMany({
    where: { userId },
    select: {
      id: true, examId: true, status: true, score: true,
      correctCount: true, wrongCount: true, blankCount: true,
      submittedAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  }).catch(() => []);

  if (user.student) {
    const sid = user.student.id;
    const [attendance, submissions, packages, notifications] = await Promise.all([
      prisma.attendance.findMany({
        where: { studentId: sid },
        select: { id: true, status: true, lessonId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId: sid },
        select: { id: true, assignmentId: true, status: true, score: true, submittedAt: true, gradedAt: true },
        orderBy: { submittedAt: "desc" },
        take: 500,
      }),
      prisma.studentPackage.findMany({
        where: { studentId: sid },
        select: { packageId: true, assignedAt: true, revokedAt: true, notes: true },
      }),
      prisma.notification.findMany({
        where: { userId },
        select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);
    related = { attendance, submissions, odkAttempts, packages, notifications };
  } else {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    related = { notifications, odkAttempts };
  }

  await logAudit({
    actorUserId: userId,
    entityType: "User",
    entityId: userId,
    action: "KVKK_DATA_EXPORT",
    summary: `${user.email} — kişisel veri ihracı`,
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    note: "KVKK 11. madde kapsamında kişisel verilerinizin makine-okunabilir kopyasıdır.",
    user,
    related,
  };

  const json = JSON.stringify(payload, null, 2);
  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kvkk-veri-export-${userId}-${Date.now()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
