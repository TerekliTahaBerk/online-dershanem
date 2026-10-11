import "server-only";

import { prisma } from "@/lib/prisma";
import { accessState } from "@/lib/panel/access-objects";
import { listStaffAssignmentHistory } from "@/lib/products/staff-assignment-server";
import { hasPrivilegedStaffRole } from "@/lib/products/staff-permission-matrix";
import { adminHasMfa } from "@/lib/auth/mfa";
import { getTeacherLifecycleSummary } from "@/lib/panel/teacher-lifecycle-server";

/**
 * KİŞİ DETAYI verisi (`/panel/yonetim/kullanicilar/[id]`). Web sayfası ve
 * mobil yönetim ucu (`/api/panel/admin/people/[id]`) AYNI yükleyiciyi
 * kullanır (sorgular ve türetilmiş değerler sayfadan değişmeden taşındı).
 * `security` / `history`: yalnız ilgili sekme açıkken okunan bölümler.
 */
export async function loadPersonDetail(id: string, options: { security: boolean; history: boolean }) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      teacherProfile: true,
      studentProfile: {
        include: {
          parents: {
            include: {
              parent: { select: { id: true, fullName: true, email: true } },
            },
          },
          enrollments: {
            where: { endedAt: null },
            include: {
              group: {
                include: {
                  teacher: {
                    select: { id: true, fullName: true, email: true },
                  },
                },
              },
            },
          },
          attendances: { orderBy: { createdAt: "desc" }, take: 20 },
          coachAssignments: {
            where: { endedAt: null },
            take: 1,
            select: {
              cadenceDays: true,
              coach: {
                select: { user: { select: { fullName: true, email: true } } },
              },
            },
          },
          notes: {
            orderBy: { updatedAt: "desc" },
            take: 10,
            include: {
              lesson: {
                include: { group: { select: { name: true, subject: true } } },
              },
            },
          },
        },
      },
      parentStudents: {
        include: {
          student: {
            include: {
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      },
      taughtGroups: {
        orderBy: { name: "asc" },
        include: { enrollments: { where: { endedAt: null } } },
      },
      taughtLessons: {
        orderBy: { startsAt: "desc" },
        take: 12,
        include: { group: { select: { id: true, name: true } } },
      },
      studentTeacherAssignments: {
        where: { active: true, endedAt: null },
        orderBy: { subject: "asc" },
        include: {
          student: {
            select: {
              id: true,
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      },
      odOrders: { orderBy: { createdAt: "desc" }, take: 10 },
      accessibilityPreference: true,
      productMemberships: {
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          product: true,
          source: true,
          startsAt: true,
          expiresAt: true,
          revokedAt: true,
          productRef: { select: { name: true } },
          grantedBy: { select: { fullName: true, email: true } },
          sourceOdOrder: { select: { id: true, packageName: true } },
        },
      },
    },
  });
  if (!user) return null;

  const student = user.studentProfile;
  const attendance = student?.attendances ?? [];
  const attended = attendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;
  const now = new Date();
  const activeMemberships = user.productMemberships.filter((m) => accessState(m, now).label === "Aktif");
  const activeProducts = new Set(activeMemberships.map((m) => m.product));
  const [hasMfa, pendingResets, auditRows] = await Promise.all([
    options.security && (user.role === "ADMIN" || user.role === "TEACHER") ? adminHasMfa(user.id) : Promise.resolve(null),
    options.security
      ? prisma.mfaResetRequest.findMany({
          where: { targetUserId: user.id, status: "PENDING", expiresAt: { gt: now } },
          orderBy: { createdAt: "desc" },
          select: { id: true, reason: true, createdAt: true, expiresAt: true, requestedById: true, requestedBy: { select: { fullName: true, email: true } } },
        })
      : Promise.resolve([]),
    options.history
      ? prisma.auditLog.findMany({
          where: { entityId: user.id },
          orderBy: { createdAt: "desc" },
          take: 60,
          select: { id: true, action: true, summary: true, createdAt: true, actorUserId: true },
        })
      : Promise.resolve([]),
  ]);
  const auditActors = auditRows.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { id: { in: [...new Set(auditRows.flatMap((row) => (row.actorUserId ? [row.actorUserId] : [])))] } },
            select: { id: true, fullName: true, email: true },
          })
        ).map((actor) => [actor.id, actor.fullName || actor.email]),
      )
    : new Map<string, string>();
  const coach = student?.coachAssignments[0] ?? null;
  const teacherLifecycle =
    user.role === "TEACHER" ? await getTeacherLifecycleSummary(user.id) : null;
  const staffHistory = user.role === "TEACHER" ? await listStaffAssignmentHistory(user.id) : [];
  const staffMfaPending =
    user.role === "TEACHER" &&
    hasPrivilegedStaffRole(staffHistory.filter((row) => !row.revokedAt)) &&
    !(await adminHasMfa(user.id));
  const teacherStudentLinks =
    user.role === "TEACHER"
      ? user.studentTeacherAssignments.map((link) => ({
          id: link.id,
          subject: link.subject,
          studentId: link.student.id,
          studentName: link.student.user.fullName || link.student.user.email,
        }))
      : [];
  // Aynı öğrenci farklı branşlarla bağlanabilir; listeyi tüm aktif öğrencilerden tut.
  const linkableStudents =
    user.role === "TEACHER"
      ? (
          await prisma.studentProfile.findMany({
            where: { user: { status: "ACTIVE", role: "STUDENT" } },
            orderBy: { user: { fullName: "asc" } },
            take: 80,
            select: {
              id: true,
              user: { select: { fullName: true, email: true } },
            },
          })
        ).map((profile) => ({
          id: profile.id,
          name: profile.user.fullName || profile.user.email,
        }))
      : [];

  /* Tasarımın kırmızı uyarısı: ödendi ama erişim açılmadı. */
  const blockedOrders = user.odOrders.filter(
    (o) => o.status === "PAID" && o.provisioningStatus !== "SUCCEEDED",
  );
  const blocked = blockedOrders[0] ?? null;
  return {
    user,
    student,
    attendance,
    attended,
    now,
    activeMemberships,
    activeProducts,
    hasMfa,
    pendingResets,
    auditRows,
    auditActors,
    coach,
    teacherLifecycle,
    staffHistory,
    staffMfaPending,
    teacherStudentLinks,
    linkableStudents,
    blockedOrders,
    blocked,
  };
}

export type PersonDetail = NonNullable<Awaited<ReturnType<typeof loadPersonDetail>>>;
