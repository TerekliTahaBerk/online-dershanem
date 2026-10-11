import "server-only";

import { prisma } from "@/lib/prisma";
import { evaluateCronHeartbeats } from "@/lib/jobs/health";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";
import { OD_ONBOARDING_NEXT_ACTION } from "@/lib/od/onboarding-state";
import { calculateOdPlacementMetrics } from "@/lib/od/placement";
import { deriveUnifiedOperationItems } from "@/lib/panel/operations-inbox";
import { loadFirstLessonMetrics } from "@/lib/business/first-lesson-metrics-server";

/**
 * AKTİVASYON MASASI verisi (`/panel/yonetim/isler`). Web sayfası ve mobil
 * yönetim ucu (`/api/panel/admin/activation-desk`) AYNI yükleyiciyi
 * kullanır; sorgular ve türetilmiş hesaplar sayfadan değişmeden taşındı.
 */
export async function loadActivationDesk(now: Date = new Date()) {
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const firstLessonMetrics = await loadFirstLessonMetrics(now);
  const [
    orders,
    onboardingQueue,
    leads,
    studentsRaw,
    staffRaw,
    emailQueue,
    cronHeartbeats,
    placementTransitions,
    cancelledLessons,
  ] = await Promise.all([
    prisma.odOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.odOnboarding.findMany({
      where: { order: { status: "PAID" }, state: { not: "ACTIVE" } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      include: {
        owner: { select: { fullName: true, email: true } },
        transitions: {
          orderBy: { occurredAt: "desc" },
          take: 3,
          include: { actor: { select: { fullName: true, email: true } } },
        },
        order: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                id: true,
                studentProfile: {
                  select: {
                    id: true,
                    parents: { select: { id: true }, take: 1 },
                    enrollments: {
                      where: { endedAt: null },
                      select: {
                        group: {
                          select: {
                            name: true,
                            lessons: {
                              where: { status: "PLANNED" },
                              select: { id: true },
                              take: 1,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.leadSubmission.findMany({
      orderBy: { submittedAt: "desc" },
      take: 30,
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "TEACHER"] }, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true, role: true },
    }),
    prisma.emailOutbox.findMany({
      where: { status: { not: "SENT" } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        subject: true,
        status: true,
        attempts: true,
        createdAt: true,
      },
    }),
    prisma.cronHeartbeat.findMany(),
    prisma.odOnboardingTransition.findMany({
      where: {
        occurredAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      select: { onboardingId: true, toState: true, occurredAt: true },
    }),
    prisma.lesson.findMany({
      where: { status: "CANCELLED", startsAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startsAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        startsAt: true,
        group: {
          select: {
            name: true,
            lessons: {
              where: { status: "PLANNED", startsAt: { gt: now } },
              select: { id: true },
              take: 1,
            },
            teacher: { select: { fullName: true, email: true } },
          },
        },
      },
    }),
  ]);

  const students = studentsRaw.map((student) => ({
    id: student.id,
    name: student.fullName || student.email,
  }));
  const staff = staffRaw.map((person) => ({
    id: person.id,
    name: person.fullName || person.email,
  }));
  const activeTeacherCount = staffRaw.filter(
    (person) => person.role === "TEACHER",
  ).length;
  const readinessRows = [
    {
      task: "Filtrelenmiş kişilere davet tekrar gönderme",
      coverage: "Kişiler ekranı / Toplu operasyon",
      status: "GO" as const,
      note: "Panel içinde çalışır; SQL/Prisma müdahalesi gerekmez.",
    },
    {
      task: "Filtrelenmiş öğrencileri güvenli grup transferi",
      coverage: "Kişiler ekranı / Toplu operasyon",
      status: staffRaw.length > 0 ? ("GO" as const) : ("GAP" as const),
      note:
        staffRaw.length > 0
          ? "Panel içinde çalışır; satır bazlı hata görünür."
          : "Aktif personel yok; panelde hedef atanamadığı için operasyon açılamaz.",
    },
    {
      task: "Öğretmen güvenli devir ve askıya alma",
      coverage: "Kişi detayı + Kişiler / Toplu operasyon",
      status: activeTeacherCount > 1 ? ("GO" as const) : ("GAP" as const),
      note:
        activeTeacherCount > 1
          ? "Panel içinde sorumluluk devriyle tamamlanır."
          : "Devralacak ikinci aktif öğretmen yok; önce öğretmen hesabı açılması gerekir.",
    },
    {
      task: "paid-order → active aktivasyon",
      coverage: "İşler / Aktivasyon masası",
      status: "GO" as const,
      note: "Onboarding akışı panelde tamamlanır; dışarıdan SQL müdahalesi beklenmez.",
    },
  ];
  const readinessStatus: "GO" | "GAP" = readinessRows.every((row) => row.status === "GO")
    ? "GO"
    : "GAP";
  const cronHealth = evaluateCronHeartbeats(cronHeartbeats);
  const placementMetrics = calculateOdPlacementMetrics(placementTransitions);
  const unifiedOperations = deriveUnifiedOperationItems({
    now,
    onboardings: onboardingQueue.map((item) => {
      const profile = item.order.user?.studentProfile;
      const hasParent = Boolean(profile?.parents.length);
      const hasGroup = Boolean(profile?.enrollments.length);
      const hasFirstLesson = Boolean(
        profile?.enrollments.some(
          (enrollment) => enrollment.group.lessons.length,
        ),
      );
      return {
        id: item.id,
        orderId: item.orderId,
        packageName: item.order.packageName,
        state: item.state,
        blockerReason: item.blockerReason,
        ownerName: item.owner?.fullName || item.owner?.email || null,
        dueAt: item.dueAt,
        stateEnteredAt: item.stateEnteredAt,
        studentLabel:
          item.order.user?.fullName ||
          item.order.user?.email ||
          "hesap bağlantısı bekleniyor",
        hasAccount: Boolean(profile),
        hasParent,
        hasGroup,
        hasFirstLesson,
        studentProfileId: profile?.id || null,
        nextAction: OD_ONBOARDING_NEXT_ACTION[item.state],
      };
    }),
    cancelledLessons: cancelledLessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      startsAt: lesson.startsAt,
      groupName: lesson.group.name,
      teacherName: lesson.group.teacher.fullName || lesson.group.teacher.email,
      hasFollowUpLesson: lesson.group.lessons.length > 0,
    })),
  });
  const openUnifiedOperations = unifiedOperations.filter(
    (item) => item.resolution === "OPEN",
  );
  return {
    now,
    firstLessonMetrics,
    orders,
    onboardingQueue,
    leads,
    students,
    staff,
    emailQueue,
    readinessRows,
    readinessStatus,
    cronHealth,
    placementMetrics,
    unifiedOperations,
    openUnifiedOperations,
  };
}

export type ActivationDesk = Awaited<ReturnType<typeof loadActivationDesk>>;
