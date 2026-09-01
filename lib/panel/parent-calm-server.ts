import "server-only";

import { productLabel } from "@/lib/auth/roles";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import {
  addIstanbulCalendarDays,
  ISTANBUL_TIME_ZONE,
  istanbulWeekStart,
} from "@/lib/istanbul-time";
import { prisma } from "@/lib/prisma";
import { netScore } from "@/lib/goals";
import {
  buildParentActions,
  buildParentCalmStatus,
  buildParentWeekSummary,
  buildSubjectTrendSentence,
  withParentStudentContext,
  type ParentCalmHome,
  type ParentSubjectTrend,
} from "@/lib/panel/parent-calm";
import type { ParentChild } from "@/lib/panel/parent-scope";

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
  weekday: "long",
});
const TR_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function formatSchedule(date: Date): string {
  return `${TR_DATE.format(date)} · ${TR_TIME.format(date).replace(":", ".")}`;
}

const PACKAGE_WARN_DAYS = 21;

export async function loadParentCalmHome(input: {
  parentUserId: string;
  selected: ParentChild;
  now?: Date;
}): Promise<ParentCalmHome> {
  const now = input.now ?? new Date();
  const selected = input.selected;
  const flags = getPanelFeatureFlags();
  const hasOD = selected.products.includes("OD");
  const hasODK = selected.products.includes("ODK");
  const hasOK = selected.products.includes("OK");
  const hasExamAccess = hasOD || hasODK;
  const weekStart = istanbulWeekStart(now);
  const weekEnd = addIstanbulCalendarDays(weekStart, 7);

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: selected.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((row) => row.groupId);

  const [
    attendance,
    plan,
    assignments,
    exams,
    digest,
    nextLesson,
    coaching,
    odkExams,
    memberships,
    parentUser,
    importantNotice,
    profile,
  ] = await Promise.all([
    hasOD
      ? prisma.attendance.findMany({
          where: {
            studentId: selected.id,
            lesson: { startsAt: { gte: addIstanbulCalendarDays(weekStart, -7), lt: weekEnd } },
          },
          orderBy: { createdAt: "desc" },
          take: 24,
          select: { status: true, lesson: { select: { startsAt: true } } },
        })
      : Promise.resolve([]),
    hasOK
      ? prisma.weeklyPlan.findFirst({
          where: { studentId: selected.id },
          orderBy: { weekStart: "desc" },
          include: { tasks: { select: { status: true } } },
        })
      : Promise.resolve(null),
    hasOD && groupIds.length
      ? prisma.assignment.findMany({
          where: {
            isActive: true,
            groupId: { in: groupIds },
            dueAt: { gte: weekStart, lt: addIstanbulCalendarDays(weekEnd, 7) },
          },
          include: { progress: { where: { studentId: selected.id }, select: { status: true } } },
          take: 40,
        })
      : Promise.resolve(
          [] as Array<{
            progress: Array<{ status: string }>;
          }>,
        ),
    hasExamAccess
      ? prisma.mockExam.findMany({
          where: { studentId: selected.id },
          orderBy: { takenAt: "desc" },
          take: 6,
          include: { sections: { select: { subjectName: true, correctCount: true, incorrectCount: true } } },
        })
      : Promise.resolve([]),
    flags.parentWeeklyDigest
      ? prisma.weeklyDigest.findFirst({
          where: { status: "PUBLISHED", studentId: selected.id },
          orderBy: { weekStart: "desc" },
          select: {
            id: true,
            goodThingOne: true,
            goodThingTwo: true,
            supportArea: true,
            publishedAt: true,
            feedback: {
              where: { userId: input.parentUserId },
              select: { id: true },
              take: 1,
            },
          },
        })
      : Promise.resolve(null),
    hasOD
      ? prisma.lesson.findFirst({
          where: {
            status: "PLANNED",
            startsAt: { gte: now },
            attendances: { some: { studentId: selected.id } },
          },
          orderBy: { startsAt: "asc" },
          select: { id: true, title: true, startsAt: true },
        })
      : Promise.resolve(null),
    hasOK ? getStudentCoaching(selected.id) : Promise.resolve(null),
    hasODK ? listStudentExams(selected.userId) : Promise.resolve([]),
    prisma.productMembership.findMany({
      where: {
        userId: selected.userId,
        revokedAt: null,
        expiresAt: { not: null, gt: now, lte: addIstanbulCalendarDays(now, PACKAGE_WARN_DAYS) },
      },
      select: { product: true, expiresAt: true },
      orderBy: { expiresAt: "asc" },
      take: 1,
    }),
    prisma.user.findUnique({
      where: { id: input.parentUserId },
      select: { phone: true },
    }),
    prisma.notification.findFirst({
      where: {
        userId: input.parentUserId,
        readAt: null,
        type: "PAYMENT",
      },
      orderBy: { createdAt: "desc" },
      select: { title: true, href: true },
    }),
    hasOK
      ? prisma.studentProfile.findUnique({
          where: { id: selected.id },
          select: { weeklyGoal: true },
        })
      : Promise.resolve(null),
  ]);

  const weekAttendance = attendance.filter(
    (row) => row.lesson.startsAt >= weekStart && row.lesson.startsAt < weekEnd,
  );
  const attended = weekAttendance.filter(
    (row) => row.status === "PRESENT" || row.status === "LATE",
  ).length;
  const planDone = plan?.tasks.filter((task) => task.status === "DONE").length ?? 0;
  const planTotal = plan?.tasks.length ?? 0;
  const doneAssignments = assignments.filter((item) => item.progress[0]?.status === "DONE").length;

  const chronological = [...exams].reverse();
  const bySubject = new Map<string, number[]>();
  for (const exam of chronological) {
    for (const section of exam.sections) {
      const list = bySubject.get(section.subjectName) ?? [];
      list.push(Number(netScore(section.correctCount, section.incorrectCount).toFixed(2)));
      bySubject.set(section.subjectName, list);
    }
  }
  const subjectTrends: ParentSubjectTrend[] = [...bySubject.entries()]
    .map(([subject, nets]) => buildSubjectTrendSentence(subject, nets))
    .sort((a, b) => a.subject.localeCompare(b.subject, "tr"));

  const examNets = chronological.map((exam) =>
    exam.sections.reduce(
      (sum, section) => sum + netScore(section.correctCount, section.incorrectCount),
      0,
    ),
  );
  let examTrendSentence: string | null = null;
  if (examNets.length >= 2) {
    const first = examNets[0]!;
    const last = examNets[examNets.length - 1]!;
    if (last > first + 1) {
      examTrendSentence = "Son denemelerde toplam net yükseliyor.";
    } else if (last < first - 1) {
      examTrendSentence = "Son denemelerde toplam nette geri çekilme görünüyor; kısa bir tekrar faydalı olabilir.";
    } else {
      examTrendSentence = "Son denemelerde toplam net dengeli seyrediyor.";
    }
  } else if (examNets.length === 1) {
    examTrendSentence = "İlk deneme kaydı oluştu; eğilim ikinci denemeden sonra netleşecek.";
  }

  const strengths = subjectTrends
    .filter((item) => item.direction === "up" || item.direction === "steady")
    .slice(0, 2)
    .map((item) => item.sentence);
  const supportAreas = subjectTrends
    .filter((item) => item.direction === "down")
    .slice(0, 2)
    .map((item) => item.sentence);

  const status = buildParentCalmStatus({
    hasOD,
    hasOK,
    hasExamAccess,
    attendanceTotal: weekAttendance.length,
    attendanceAttended: attended,
    planDone,
    planTotal,
    hasExamData: examNets.length > 0,
  });

  const weekSummary = buildParentWeekSummary({
    planDone,
    planTotal,
    subjectTrends,
    attendanceAttended: attended,
    attendanceTotal: weekAttendance.length,
    hasPlan: hasOK,
    hasAttendance: hasOD,
  });

  const upcoming: ParentCalmHome["thisWeek"]["upcoming"] = [];
  if (nextLesson) {
    upcoming.push({
      id: "lesson",
      title: "Yaklaşan ders",
      detail: `${nextLesson.title} · ${formatSchedule(nextLesson.startsAt)}`,
      href: withParentStudentContext("/panel/veli/takvim", selected.id),
    });
  }
  if (coaching?.nextScheduledAt) {
    upcoming.push({
      id: "coaching",
      title: "Koçluk görüşmesi",
      detail: formatSchedule(coaching.nextScheduledAt),
      href: withParentStudentContext("/panel/veli/kocluk", selected.id),
    });
  }
  const nextOdkExam =
    odkExams.find(
      (exam) =>
        exam.attempts[0]?.status !== "IN_PROGRESS" &&
        exam.status !== "RELEASED" &&
        (!exam.endsAt || exam.endsAt > now),
    ) ?? null;
  if (nextOdkExam?.startsAt) {
    upcoming.push({
      id: "exam",
      title: "Yaklaşan deneme",
      detail: `${nextOdkExam.title} · ${formatSchedule(nextOdkExam.startsAt)}`,
      href: "/panel/odk/veli/raporlar",
    });
  }

  const expiring = memberships[0];
  const packageExpiring = expiring?.expiresAt
    ? {
        productLabel: productLabel(expiring.product),
        daysLeft: Math.max(
          1,
          Math.ceil((expiring.expiresAt.getTime() - now.getTime()) / 86_400_000),
        ),
      }
    : null;

  const unreadDigest =
    Boolean(digest?.publishedAt) &&
    Boolean(digest) &&
    (digest!.feedback?.length ?? 0) === 0 &&
    now.getTime() - (digest!.publishedAt?.getTime() ?? 0) < 14 * 86_400_000;

  const actions = buildParentActions({
    studentId: selected.id,
    packageExpiring,
    missingPhone: !parentUser?.phone?.trim(),
    unreadDigest: flags.parentWeeklyDigest && unreadDigest,
    importantNotice: importantNotice
      ? {
          title: importantNotice.title,
          href: importantNotice.href || withParentStudentContext("/panel/veli/bildirimler", selected.id),
        }
      : null,
  });

  const planPct = planTotal ? Math.round((planDone / planTotal) * 100) : null;

  return {
    studentName: selected.name,
    studentId: selected.id,
    statusCode: status.code,
    statusLabel: status.label,
    statusSentence: status.sentence,
    weekSummary,
    thisWeek: {
      planLabel:
        hasOK && planPct !== null
          ? `Planın %${planPct}'si tamamlandı (${planDone}/${planTotal})`
          : hasOK
            ? "Bu hafta için plan henüz yok"
            : null,
      attendanceLabel: hasOD
        ? weekAttendance.length
          ? `Ders katılımı ${attended}/${weekAttendance.length}`
          : "Bu hafta ders kaydı henüz yok"
        : null,
      assignmentsLabel: hasOD
        ? assignments.length
          ? `Tamamlanan çalışmalar ${doneAssignments}/${assignments.length}`
          : "Yaklaşan çalışma kaydı yok"
        : null,
      upcoming: upcoming.slice(0, 3),
    },
    academic: {
      subjectTrends: subjectTrends.slice(0, 4),
      examTrendSentence,
      strengths:
        strengths.length > 0
          ? strengths
          : status.code === "LIMITED_DATA"
            ? []
            : ["Görünen kayıtlarda düzenli ilerleme sinyalleri var."],
      supportAreas,
    },
    coaching: hasOK
      ? {
          available: true,
          weeklyGoal: profile?.weeklyGoal ?? coaching?.focus ?? null,
          planRealization:
            planPct !== null
              ? `Plan gerçekleşme: %${planPct}`
              : "Plan yayınlandığında gerçekleşme burada görünür.",
          sharedNote: coaching?.sharedNote ?? null,
          coachName: coaching?.coachName ?? null,
          href: withParentStudentContext("/panel/veli/kocluk", selected.id),
        }
      : null,
    actions,
    digest: {
      available: flags.parentWeeklyDigest,
      href: withParentStudentContext("/panel/veli/haftalik", selected.id),
      preview: digest
        ? `${digest.goodThingOne} ${digest.goodThingTwo}`.trim()
        : null,
      published: Boolean(digest),
    },
    dinoEnabled: flags.dinoAi,
  };
}
