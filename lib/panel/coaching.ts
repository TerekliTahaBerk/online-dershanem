import "server-only";

import { prisma } from "@/lib/prisma";
import { coachingOverdue } from "@/lib/coaching";

/**
 * ONLINE KOÇUM — koçluk alanı sorguları.
 *
 * Ürün sayfasının sattığı şey: atanmış bir koç, birebir görüşmeler ve düzenli
 * takip. Bu modül o alanın okuma tarafını TEK yerde toplar ki her ekran
 * "gecikmiş görüşme" gibi kuralları kendi başına yeniden uydurmasın.
 *
 * GİZLİLİK: `privateNote` bu modülün döndürdüğü hiçbir tipte YOKTUR. Veliye
 * ve öğrenciye giden yollarda yanlışlıkla sızmasın diye alan seçimi burada
 * kapatılır; koçun kendi ekranı notu ayrıca ve açıkça sorgular.
 */

export type CoachingSnapshot = {
  coachName: string;
  /** Görüşme sıklığı (gün). Ön görüşmede belirlenir; yoksa gecikme hesaplanmaz. */
  cadenceDays: number | null;
  lastCompletedAt: Date | null;
  nextScheduledAt: Date | null;
  /** Koçun öğrenciyle paylaştığı son not — veliye de açıktır. */
  sharedNote: string | null;
  focus: string | null;
  /** Görüşme gecikti mi? `cadenceDays` yoksa daima false. */
  overdue: boolean;
  overdueDays: number | null;
};

/** Öğrencinin aktif koçluk durumu. Aktif atama yoksa `null`. */
export async function getStudentCoaching(
  studentProfileId: string,
): Promise<CoachingSnapshot | null> {
  const assignment = await prisma.coachAssignment.findFirst({
    where: { studentId: studentProfileId, endedAt: null },
    select: {
      cadenceDays: true,
      coach: { select: { user: { select: { fullName: true, email: true } } } },
      sessions: {
        orderBy: { scheduledAt: "desc" },
        select: {
          status: true,
          scheduledAt: true,
          completedAt: true,
          focus: true,
          sharedNote: true,
          // privateNote BİLEREK seçilmiyor.
        },
      },
    },
  });
  if (!assignment) return null;

  const completed = assignment.sessions.filter((s) => s.status === "COMPLETED");
  const lastCompleted = completed[0] ?? null;
  const planned = assignment.sessions
    .filter((s) => s.status === "PLANNED")
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null;

  const { overdue, overdueDays } = coachingOverdue(
    lastCompleted?.completedAt ?? null,
    planned?.scheduledAt ?? null,
    assignment.cadenceDays,
  );

  return {
    coachName: assignment.coach.user.fullName || assignment.coach.user.email,
    cadenceDays: assignment.cadenceDays,
    lastCompletedAt: lastCompleted?.completedAt ?? null,
    nextScheduledAt: planned?.scheduledAt ?? null,
    sharedNote: lastCompleted?.sharedNote ?? null,
    focus: lastCompleted?.focus ?? null,
    overdue,
    overdueDays,
  };
}

export type CoachStudentRow = {
  assignmentId: string;
  studentId: string;
  name: string;
  nextScheduledAt: Date | null;
  lastCompletedAt: Date | null;
  overdue: boolean;
  overdueDays: number | null;
};

/**
 * Bir koçun aktif koçluk öğrencileri.
 *
 * GÜVENLİK: kapsam `coach.userId = <giriş yapan>` üzerinden kurulur; koç
 * yalnız kendi atandığı öğrencileri görür.
 */
export async function getCoachStudents(coachUserId: string): Promise<CoachStudentRow[]> {
  const assignments = await prisma.coachAssignment.findMany({
    where: { endedAt: null, coach: { userId: coachUserId } },
    select: {
      id: true,
      cadenceDays: true,
      student: {
        select: { id: true, user: { select: { fullName: true, email: true } } },
      },
      sessions: {
        orderBy: { scheduledAt: "desc" },
        select: { status: true, scheduledAt: true, completedAt: true },
      },
    },
  });

  return assignments
    .map((a) => {
      const lastCompleted =
        a.sessions.filter((s) => s.status === "COMPLETED")[0]?.completedAt ?? null;
      const next =
        a.sessions
          .filter((s) => s.status === "PLANNED")
          .sort((x, y) => x.scheduledAt.getTime() - y.scheduledAt.getTime())[0]
          ?.scheduledAt ?? null;
      const { overdue, overdueDays } = coachingOverdue(lastCompleted, next, a.cadenceDays);
      return {
        assignmentId: a.id,
        studentId: a.student.id,
        name: a.student.user.fullName || a.student.user.email,
        nextScheduledAt: next,
        lastCompletedAt: lastCompleted,
        overdue,
        overdueDays,
      };
    })
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.name.localeCompare(b.name, "tr"));
}

/** Koçun bu öğrenciye atanmış olduğunu doğrular; değilse `null`. */
export async function findCoachAssignmentForCoach(
  coachUserId: string,
  studentProfileId: string,
) {
  return prisma.coachAssignment.findFirst({
    where: { studentId: studentProfileId, endedAt: null, coach: { userId: coachUserId } },
    select: { id: true, cadenceDays: true },
  });
}
