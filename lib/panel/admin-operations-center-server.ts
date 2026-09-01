import "server-only";

import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { evaluateCronHeartbeats } from "@/lib/jobs/health";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";
import { OD_ONBOARDING_NEXT_ACTION } from "@/lib/od/onboarding-state";
import { deriveUnifiedOperationItems } from "@/lib/panel/operations-inbox";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { RESTORE_DRILL_MAX_AGE_DAYS } from "@/lib/env-contract";
import {
  buildAdminOperationsCenter,
  countBand,
  type AdminOperationsCenterSnapshot,
  type OpsFlags,
  type OpsHealthStatus,
} from "@/lib/panel/admin-operations-center";

const SAMPLE = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function ownerLabel(user: { fullName: string | null; email: string } | null | undefined): string {
  if (!user) return "hesap bağlantısı bekleniyor";
  return user.fullName || user.email;
}

function paytrConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.PAYTR_MERCHANT_ID?.trim() && env.PAYTR_MERCHANT_KEY?.trim() && env.PAYTR_MERCHANT_SALT?.trim());
}

function metaConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.INSTAGRAM_INTEGRATION_ENABLED !== "true" && env.META_ADS_INTEGRATION_ENABLED !== "true") {
    return false;
  }
  return Boolean(env.META_APP_SECRET?.trim() || env.META_INSTAGRAM_ACCESS_TOKEN?.trim());
}

function restoreStatus(now: Date, env: NodeJS.ProcessEnv = process.env): { status: OpsHealthStatus; detail: string } {
  const raw = env.ODK_LAST_RESTORE_DRILL_AT?.trim();
  if (!raw) return { status: "unknown", detail: "Yedek kanıtı tanımlı değil" };
  const restoredAt = new Date(raw);
  if (!Number.isFinite(restoredAt.getTime()) || restoredAt > now) {
    return { status: "degraded", detail: "Yedek kanıtı geçersiz" };
  }
  const ageMs = now.getTime() - restoredAt.getTime();
  if (ageMs > RESTORE_DRILL_MAX_AGE_DAYS * DAY_MS) {
    return { status: "degraded", detail: `Son drill ${RESTORE_DRILL_MAX_AGE_DAYS}+ gün önce` };
  }
  return { status: "ok", detail: "Restore drill güncel" };
}

export async function getAdminOperationsCenterSnapshot(options?: {
  now?: Date;
  recordViewEvent?: boolean;
}): Promise<AdminOperationsCenterSnapshot> {
  const now = options?.now ?? new Date();
  const flags = getPanelFeatureFlags();
  const opsFlags: OpsFlags = {
    interventionInbox: flags.interventionInbox,
    studentCheckIn: flags.studentCheckIn,
    mockExamAnalysis: flags.mockExamAnalysis,
    baselineMetrics: flags.baselineMetrics,
  };

  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const soonEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const dbStarted = Date.now();
  let dbOk = true;
  let dbLatency: number | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStarted;
  } catch {
    dbOk = false;
    dbLatency = Date.now() - dbStarted;
  }

  const critical = await Promise.all([
    prisma.odOrder.count({ where: { status: "PAID", provisioningStatus: "MANUAL_REVIEW" } }),
    prisma.odOrder.findMany({
      where: { status: "PAID", provisioningStatus: "MANUAL_REVIEW" },
      orderBy: { updatedAt: "asc" },
      take: SAMPLE,
      select: {
        id: true,
        packageName: true,
        updatedAt: true,
        userId: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.odOrder.count({
      where: { status: "PAID", provisioningStatus: { in: ["PENDING", "RUNNING"] } },
    }),
    prisma.odOrder.findMany({
      where: { status: "PAID", provisioningStatus: { in: ["PENDING", "RUNNING"] } },
      orderBy: { updatedAt: "asc" },
      take: SAMPLE,
      select: {
        id: true,
        packageName: true,
        updatedAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.odOrder.count({ where: { status: "PAID", provisioningStatus: "RETRY_PENDING" } }),
    prisma.odOrder.findMany({
      where: { status: "PAID", provisioningStatus: "RETRY_PENDING" },
      orderBy: { updatedAt: "asc" },
      take: SAMPLE,
      select: {
        id: true,
        packageName: true,
        updatedAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.odOnboarding.findMany({
      where: { order: { status: "PAID" }, state: { not: "ACTIVE" } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 60,
      select: {
        id: true,
        orderId: true,
        state: true,
        dueAt: true,
        blockerReason: true,
        stateEnteredAt: true,
        owner: { select: { fullName: true, email: true } },
        order: {
          select: {
            packageName: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                studentProfile: {
                  select: {
                    id: true,
                    parents: { select: { id: true }, take: 1 },
                    enrollments: {
                      where: { endedAt: null },
                      select: {
                        group: {
                          select: {
                            lessons: { where: { status: "PLANNED" }, select: { id: true }, take: 1 },
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

  const [
    manualReviewCount,
    manualReviewOrders,
    ,
    pendingProvisioningOrders,
    ,
    retryPendingOrders,
    onboardingSignals,
    cancelledLessonsForInbox,
  ] = critical;

  const optional = await Promise.allSettled([
    prisma.lesson.count({ where: { startsAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.odOrder.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.odOrder.count({
      where: {
        status: "PAID",
        provisioningStatus: { in: ["PENDING", "RUNNING", "RETRY_PENDING", "MANUAL_REVIEW"] },
      },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", inviteAcceptedAt: null },
      orderBy: { inviteSentAt: "asc" },
      take: SAMPLE,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        inviteSentAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: { status: "ACTIVE", inviteAcceptedAt: null } }),
    prisma.studentProfile.findMany({
      where: {
        enrollments: { none: { endedAt: null } },
        user: {
          status: "ACTIVE",
          role: "STUDENT",
          productMemberships: { some: { product: "OD", revokedAt: null } },
        },
      },
      orderBy: { createdAt: "asc" },
      take: SAMPLE,
      select: {
        id: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.studentProfile.count({
      where: {
        enrollments: { none: { endedAt: null } },
        user: {
          status: "ACTIVE",
          role: "STUDENT",
          productMemberships: { some: { product: "OD", revokedAt: null } },
        },
      },
    }),
    prisma.group.findMany({
      where: { isActive: true, teacher: { status: { in: ["SUSPENDED", "ARCHIVED"] } } },
      orderBy: { updatedAt: "asc" },
      take: SAMPLE,
      select: {
        id: true,
        name: true,
        updatedAt: true,
        teacher: { select: { fullName: true, email: true, status: true } },
      },
    }),
    prisma.group.count({
      where: { isActive: true, teacher: { status: { in: ["SUSPENDED", "ARCHIVED"] } } },
    }),
    prisma.lesson.findMany({
      where: {
        status: "PLANNED",
        startsAt: { gte: now, lt: soonEnd },
        OR: [{ meetingUrl: null }, { teacher: { status: { in: ["SUSPENDED", "ARCHIVED"] } } }],
      },
      orderBy: { startsAt: "asc" },
      take: SAMPLE,
      select: {
        id: true,
        title: true,
        startsAt: true,
        meetingUrl: true,
        group: { select: { name: true } },
        teacher: { select: { status: true, fullName: true, email: true } },
      },
    }),
    prisma.lesson.count({
      where: {
        status: "PLANNED",
        startsAt: { gte: now, lt: soonEnd },
        OR: [{ meetingUrl: null }, { teacher: { status: { in: ["SUSPENDED", "ARCHIVED"] } } }],
      },
    }),
    prisma.lesson.count({
      where: { startsAt: { lt: now, gte: weekAgo }, notes: { none: { studentId: null } } },
    }),
    prisma.weeklyPlan.count({ where: { status: "DRAFT", weekStart: { lt: weekAgo } } }),
    prisma.cronHeartbeat.findMany(),
    prisma.emailOutbox.count({ where: { status: { in: ["FAILED", "ABANDONED"] } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 16,
      select: {
        id: true,
        action: true,
        summary: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actorUserId: true,
      },
    }),
    prisma.odkExam.count({
      where: {
        OR: [
          { status: "LIVE" },
          { status: "SCHEDULED", startsAt: { gte: dayStart, lt: dayEnd } },
          { status: "ENDED", endsAt: { gte: dayStart, lt: dayEnd } },
        ],
      },
    }),
    prisma.odkExam.findMany({
      where: {
        status: { in: ["LIVE", "SCHEDULED"] },
        meetRequired: true,
        meetUrl: null,
        OR: [{ startsAt: { gte: now, lt: soonEnd } }, { status: "LIVE" }],
      },
      orderBy: { updatedAt: "asc" },
      take: SAMPLE,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    flags.interventionInbox
      ? prisma.interventionCase.findMany({
          where: { status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] } },
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
          take: 40,
          select: {
            id: true,
            studentId: true,
            explanation: true,
            createdAt: true,
            dueAt: true,
            status: true,
            student: { select: { user: { select: { fullName: true, email: true } } } },
            owner: { select: { fullName: true, email: true } },
          },
        })
      : Promise.resolve([]),
    flags.studentCheckIn
      ? prisma.studentHelpRequest.findMany({
          where: { status: "OPEN" },
          orderBy: { createdAt: "asc" },
          take: SAMPLE,
          select: {
            id: true,
            studentId: true,
            createdAt: true,
            dueAt: true,
            student: { select: { user: { select: { fullName: true, email: true } } } },
            group: { select: { name: true, teacher: { select: { fullName: true, email: true } } } },
          },
        })
      : Promise.resolve([]),
    flags.studentCheckIn
      ? prisma.studentHelpRequest.count({ where: { status: "OPEN" } })
      : Promise.resolve(0),
    prisma.$transaction([
      prisma.user.count({ where: { role: "STUDENT", studentProfile: null } }),
      prisma.user.count({ where: { role: "TEACHER", teacherProfile: null } }),
    ]),
  ]);

  const partialData = optional.some((result) => result.status === "rejected");

  const todayLessons = settled(optional[0], null as number | null);
  const activeStudents = settled(optional[1], null as number | null);
  const newOrdersToday = settled(optional[2], null as number | null);
  const provisioningPending = settled(optional[3], null as number | null);
  const inviteSamples = settled(optional[4], [] as Array<{
    id: string;
    fullName: string | null;
    email: string;
    role: string;
    inviteSentAt: Date | null;
    createdAt: Date;
  }>);
  const invitePendingCount = settled(optional[5], 0);
  const noGroupSamples = settled(optional[6], [] as Array<{ id: string; createdAt: Date; user: { fullName: string | null; email: string } }>);
  const noGroupCount = settled(optional[7], 0);
  const inactiveTeacherGroups = settled(optional[8], [] as Array<{
    id: string;
    name: string;
    updatedAt: Date;
    teacher: { fullName: string | null; email: string; status: string };
  }>);
  const inactiveTeacherGroupCount = settled(optional[9], 0);
  const missingPlanLessons = settled(optional[10], [] as Array<{
    id: string;
    title: string;
    startsAt: Date;
    meetingUrl: string | null;
    group: { name: string };
    teacher: { status: string; fullName: string | null; email: string };
  }>);
  const missingPlanCount = settled(optional[11], 0);
  const unnotedLessons = settled(optional[12], null as number | null);
  const stalePlans = settled(optional[13], null as number | null);
  const cronRows = settled(optional[14], [] as Array<{
    name: string;
    lastStartedAt: Date | null;
    lastSucceededAt: Date | null;
    lastFailedAt: Date | null;
    lastDurationMs: number | null;
    processedCount: number;
    failedCount: number;
    lastErrorCode: string | null;
    lastAlertedAt?: Date | null;
  }>);
  const failedEmails = settled(optional[15], 0);
  const audits = settled(optional[16], [] as Array<{
    id: string;
    action: string;
    summary: string | null;
    entityType: string;
    entityId: string;
    createdAt: Date;
    actorUserId: string | null;
  }>);
  const todayExams = settled(optional[17], null as number | null);
  const failedExams = settled(optional[18], [] as Array<{ id: string; title: string; status: string; updatedAt: Date }>);
  const interventions = settled(optional[19], [] as Array<{
    id: string;
    studentId: string;
    explanation: string;
    createdAt: Date;
    dueAt: Date;
    status: string;
    student: { user: { fullName: string | null; email: string } };
    owner: { fullName: string | null; email: string } | null;
  }>);
  const helpRequests = settled(optional[20], [] as Array<{
    id: string;
    studentId: string;
    createdAt: Date;
    dueAt: Date;
    student: { user: { fullName: string | null; email: string } };
    group: { name: string; teacher: { fullName: string | null; email: string } };
  }>);
  const openHelpCount = settled(optional[21], 0);
  const profileMismatch = settled(optional[22], [0, 0] as [number, number]);
  const profileMismatchCount = profileMismatch[0] + profileMismatch[1];

  const actorIds = [...new Set(audits.map((row) => row.actorUserId).filter((id): id is string => Boolean(id)))];
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
  const actorNames = new Map(actors.map((actor) => [actor.id, actor.fullName || actor.email]));

  const unifiedOpenItems = deriveUnifiedOperationItems({
    now,
    onboardings: onboardingSignals.map((item) => {
      const profile = item.order.user?.studentProfile;
      const hasParent = Boolean(profile?.parents.length);
      const hasGroup = Boolean(profile?.enrollments.length);
      const hasFirstLesson = Boolean(profile?.enrollments.some((enrollment) => enrollment.group.lessons.length));
      return {
        id: item.id,
        orderId: item.orderId,
        packageName: item.order.packageName,
        state: item.state,
        blockerReason: item.blockerReason,
        ownerName: item.owner?.fullName || item.owner?.email || null,
        dueAt: item.dueAt,
        stateEnteredAt: item.stateEnteredAt,
        studentLabel: item.order.user?.fullName || item.order.user?.email || "hesap bağlantısı bekleniyor",
        hasAccount: Boolean(profile),
        hasParent,
        hasGroup,
        hasFirstLesson,
        studentProfileId: profile?.id || null,
        nextAction: OD_ONBOARDING_NEXT_ACTION[item.state],
      };
    }),
    cancelledLessons: cancelledLessonsForInbox.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      startsAt: lesson.startsAt,
      groupName: lesson.group.name,
      teacherName: lesson.group.teacher.fullName || lesson.group.teacher.email,
      hasFollowUpLesson: lesson.group.lessons.length > 0,
    })),
  }).filter((item) => item.resolution === "OPEN");

  const paidNoAccountOrders = onboardingSignals
    .filter((item) => !item.order.user?.studentProfile)
    .slice(0, SAMPLE)
    .map((item) => ({
      id: item.orderId,
      packageName: item.order.packageName,
      updatedAt: item.stateEnteredAt,
      ownerLabel: item.order.user?.fullName || item.order.user?.email || "hesap bağlantısı bekleniyor",
    }));

  const openInterventions = interventions.filter((row) => row.status !== "SNOOZED" || row.dueAt < now);
  const interventionSamples = interventions
    .filter((row) => row.status !== "SNOOZED")
    .slice(0, SAMPLE)
    .map((row) => ({
      id: row.id,
      studentLabel: row.student.user.fullName || row.student.user.email,
      explanation: row.explanation,
      createdAt: row.createdAt,
      dueAt: row.dueAt,
      ownerLabel: row.owner ? row.owner.fullName || row.owner.email : null,
      overdue: row.dueAt.getTime() < now.getTime() && row.status !== "SNOOZED",
    }));

  const criticalRiskIds = new Set<string>();
  const watchRiskIds = new Set<string>();

  for (const row of interventions) {
    if (row.status === "SNOOZED") {
      watchRiskIds.add(row.studentId);
      continue;
    }
    if (row.dueAt.getTime() < now.getTime()) criticalRiskIds.add(row.studentId);
    else watchRiskIds.add(row.studentId);
  }
  for (const row of helpRequests) {
    if (row.dueAt.getTime() < now.getTime()) criticalRiskIds.add(row.studentId);
    else watchRiskIds.add(row.studentId);
  }
  for (const profile of noGroupSamples) {
    watchRiskIds.add(profile.id);
  }
  for (const item of onboardingSignals) {
    const profileId = item.order.user?.studentProfile?.id;
    if (!profileId) continue;
    if (["MANUAL_REVIEW", "BLOCKED", "REFUND_PENDING"].includes(item.state)) {
      criticalRiskIds.add(profileId);
    } else {
      watchRiskIds.add(profileId);
    }
  }

  const cronHealth = evaluateCronHeartbeats(cronRows, now);
  const unhealthyJobs = cronHealth.jobs.filter((job) => job.status !== "healthy");
  const failedJobs = cronHealth.jobs.filter((job) => job.status === "failed" || job.status === "missing");
  const emailCron = cronHealth.jobs.find((job) => job.name === "email-retry");
  const businessCron = cronHealth.jobs.find((job) => job.name === "business-jobs");

  let jobsStatus: OpsHealthStatus = "ok";
  let jobsDetail = "Kritik cron'lar sağlıklı";
  if (failedJobs.length > 0) {
    jobsStatus = "down";
    jobsDetail = failedJobs.map((job) => job.label).slice(0, 2).join(", ");
  } else if (unhealthyJobs.length > 0) {
    jobsStatus = "degraded";
    jobsDetail = unhealthyJobs.map((job) => job.label).slice(0, 2).join(", ");
  }

  let emailStatus: OpsHealthStatus = "ok";
  let emailDetail = "Outbox temiz";
  if (emailCron && emailCron.status !== "healthy") {
    emailStatus = emailCron.status === "failed" || emailCron.status === "missing" ? "down" : "degraded";
    emailDetail = `email-retry ${emailCron.status}`;
  } else if (failedEmails > 0) {
    emailStatus = "degraded";
    emailDetail = `${failedEmails} başarısız e-posta`;
  }

  const paymentOk = paytrConfigured();
  const paymentStatus: OpsHealthStatus =
    !paymentOk ? "degraded" : manualReviewCount > 0 ? "degraded" : "ok";
  const paymentDetail = !paymentOk
    ? "PayTR yapılandırması eksik"
    : manualReviewCount > 0
      ? `${manualReviewCount} manuel inceleme`
      : "Callback yolu hazır";

  const metaEnabled =
    process.env.INSTAGRAM_INTEGRATION_ENABLED === "true" || process.env.META_ADS_INTEGRATION_ENABLED === "true";
  let metaStatus: OpsHealthStatus = metaEnabled ? "ok" : "unknown";
  let metaDetail = metaEnabled ? "Meta entegrasyonu açık" : "Meta entegrasyonu kapalı";
  if (metaEnabled) {
    if (!metaConfigured()) {
      metaStatus = "degraded";
      metaDetail = "Meta kimlik bilgileri eksik";
    } else if (businessCron && businessCron.status !== "healthy") {
      metaStatus = businessCron.status === "failed" ? "down" : "degraded";
      metaDetail = `business-jobs ${businessCron.status}`;
    }
  }

  const restore = restoreStatus(now);
  const pendingJobs =
    unifiedOpenItems.length +
    (provisioningPending ?? 0) +
    (flags.interventionInbox ? openInterventions.length : 0) +
    (flags.studentCheckIn ? openHelpCount : 0);

  const snapshot = buildAdminOperationsCenter({
    now,
    flags: opsFlags,
    partialData: partialData || !dbOk,
    counts: {
      todayLessons,
      activeStudents,
      pendingJobs,
      openInterventions: flags.interventionInbox ? openInterventions.length : null,
      newOrdersToday,
      provisioningPending,
      todayExams,
      manualReview: manualReviewCount,
      retryPending: retryPendingCount,
      invitePending: invitePendingCount,
      studentsWithoutGroup: noGroupCount,
      groupsWithInactiveTeacher: inactiveTeacherGroupCount,
      lessonsMissingPlan: missingPlanCount,
      openHelpRequests: openHelpCount,
      cancelledLessonsToday: cancelledLessonsForInbox.length,
      unnotedLessons,
      stalePlans,
      unifiedOpenOps: unifiedOpenItems.length,
      unifiedBlockingOps: unifiedOpenItems.filter((item) => item.severity === "BLOCKING").length,
      failedExams: failedExams.length,
      profileMismatch: profileMismatchCount,
    },
    samples: {
      manualReviewOrders: manualReviewOrders.map((order) => ({
        id: order.id,
        packageName: order.packageName,
        updatedAt: order.updatedAt,
        ownerLabel: ownerLabel(order.user),
      })),
      pendingOrders: pendingProvisioningOrders.map((order) => ({
        id: order.id,
        packageName: order.packageName,
        updatedAt: order.updatedAt,
        ownerLabel: ownerLabel(order.user),
      })),
      retryOrders: retryPendingOrders.map((order) => ({
        id: order.id,
        packageName: order.packageName,
        updatedAt: order.updatedAt,
        ownerLabel: ownerLabel(order.user),
      })),
      invites: inviteSamples.map((user) => ({
        id: user.id,
        label: user.fullName || user.email,
        role: user.role,
        inviteSentAt: user.inviteSentAt,
        createdAt: user.createdAt,
      })),
      studentsWithoutGroup: noGroupSamples.map((profile) => ({
        profileId: profile.id,
        label: profile.user.fullName || profile.user.email,
        since: profile.createdAt,
      })),
      groupsWithInactiveTeacher: inactiveTeacherGroups.map((group) => ({
        id: group.id,
        name: group.name,
        teacherLabel: group.teacher.fullName || group.teacher.email,
        updatedAt: group.updatedAt,
      })),
      lessonsMissingPlan: missingPlanLessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        groupName: lesson.group.name,
        startsAt: lesson.startsAt,
        reason:
          lesson.teacher.status !== "ACTIVE"
            ? "öğretmen aktif değil"
            : !lesson.meetingUrl
              ? "toplantı linki yok"
              : "plan eksik",
      })),
      helpRequests: helpRequests.map((row) => ({
        id: row.id,
        studentLabel: row.student.user.fullName || row.student.user.email,
        groupName: row.group.name,
        createdAt: row.createdAt,
        dueAt: row.dueAt,
        ownerLabel: row.group.teacher.fullName || row.group.teacher.email,
      })),
      interventions: interventionSamples,
      paidNoAccount: paidNoAccountOrders,
      failedExams: failedExams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        detail: exam.status === "LIVE" ? "Canlı denemede Meet linki yok" : "Yaklaşan denemede Meet linki yok",
        updatedAt: exam.updatedAt,
      })),
      audits: audits.map((log) => ({
        id: log.id,
        action: log.action,
        summary: log.summary,
        entityType: log.entityType,
        entityId: log.entityId,
        createdAt: log.createdAt,
        actorLabel: log.actorUserId ? actorNames.get(log.actorUserId) || "Kullanıcı" : "Sistem",
      })),
    },
    riskStudentIds: {
      critical: [...criticalRiskIds],
      watch: [...watchRiskIds],
    },
    health: {
      database: dbOk ? "ok" : "down",
      databaseDetail: dbOk ? (dbLatency != null ? `${dbLatency} ms` : "Bağlantı açık") : "Veritabanı yanıt vermiyor",
      jobs: jobsStatus,
      jobsDetail,
      email: emailStatus,
      emailDetail,
      payment: paymentStatus,
      paymentDetail,
      meta: metaStatus,
      metaDetail,
      backup: restore.status,
      backupDetail: restore.detail,
    },
  });

  if (options?.recordViewEvent !== false) {
    await recordPanelProductEvent(
      {
        name: "admin_ops_center_viewed",
        properties: {
          openActionBand: countBand(snapshot.openActionCount),
          blockingBand: countBand(snapshot.blockingCount),
          partialData: snapshot.partialData,
          interventionFlag: flags.interventionInbox,
        },
      },
      "ADMIN",
    );
  }

  return snapshot;
}
