/**
 * Admin Operasyon Merkezi — saf türetim.
 *
 * Ana sayfa veriyi buradan alır; Prisma / Next bu modüle girmez.
 * Öncelik sırası: aksiyon → problem → bağlam → KPI (grafik yok).
 */

export type OpsSeverity = "BLOCKING" | "ACTION_REQUIRED" | "WATCH";
export type OpsRiskBucket = "CRITICAL" | "WATCH" | "NORMAL";
export type OpsHealthStatus = "ok" | "degraded" | "down" | "unknown";

export type OpsActionCode =
  | "PROVISIONING_FAILED"
  | "PROVISIONING_PENDING"
  | "PROVISIONING_RETRY"
  | "INVITE_PENDING"
  | "STUDENT_NO_GROUP"
  | "GROUP_TEACHER_INACTIVE"
  | "LESSON_MISSING_PLAN"
  | "PAID_NO_ACCOUNT"
  | "HELP_REQUEST_OPEN"
  | "HIGH_RISK_STUDENT"
  | "UNIFIED_OPS_OPEN"
  | "MOCK_EXAM_FAILED"
  | "SYSTEM_CRON"
  | "SYSTEM_PARTIAL_DATA"
  | "ACCOUNT_INTEGRITY"
  | "LESSON_CANCELLED"
  | "STALE_PLAN"
  | "UNNOTED_LESSON";

export type OpsActionItem = {
  id: string;
  code: OpsActionCode;
  severity: OpsSeverity;
  title: string;
  subject: string;
  ageLabel: string;
  owner: string | null;
  href: string;
  ctaLabel: string;
  createdAt: Date | null;
};

export type OpsSummaryTileId =
  | "today_lessons"
  | "active_students"
  | "pending_jobs"
  | "open_interventions"
  | "new_orders"
  | "provisioning_pending"
  | "today_exams";

export type OpsSummaryTile = {
  id: OpsSummaryTileId;
  label: string;
  value: number | null;
  hint: string;
  href: string;
  tone: "neutral" | "warning" | "critical" | "success";
  available: boolean;
};

export type OpsActivityItem = {
  id: string;
  text: string;
  href: string | null;
  occurredAt: Date;
  actorLabel: string;
};

export type OpsRiskDistribution = {
  critical: number;
  watch: number;
  normal: number;
  total: number;
  criticalHref: string;
  watchHref: string;
  normalHref: string;
};

export type OpsHealthCheckId =
  | "database"
  | "background_jobs"
  | "email"
  | "payment_callback"
  | "meta"
  | "backup";

export type OpsHealthCheck = {
  id: OpsHealthCheckId;
  label: string;
  status: OpsHealthStatus;
  detail: string;
  href: string;
};

export type AdminOperationsCenterSnapshot = {
  generatedAt: Date;
  partialData: boolean;
  actions: OpsActionItem[];
  summary: OpsSummaryTile[];
  activities: OpsActivityItem[];
  risk: OpsRiskDistribution;
  health: OpsHealthCheck[];
  openActionCount: number;
  blockingCount: number;
};

export type OpsOrderSample = {
  id: string;
  packageName: string;
  updatedAt: Date;
  ownerLabel: string;
};

export type OpsInviteSample = {
  id: string;
  label: string;
  role: string;
  inviteSentAt: Date | null;
  createdAt: Date;
};

export type OpsStudentSample = {
  profileId: string;
  label: string;
  since: Date;
};

export type OpsGroupSample = {
  id: string;
  name: string;
  teacherLabel: string;
  updatedAt: Date;
};

export type OpsLessonSample = {
  id: string;
  title: string;
  groupName: string;
  startsAt: Date;
  reason: string;
};

export type OpsHelpSample = {
  id: string;
  studentLabel: string;
  groupName: string;
  createdAt: Date;
  dueAt: Date;
  ownerLabel: string | null;
};

export type OpsInterventionSample = {
  id: string;
  studentLabel: string;
  explanation: string;
  createdAt: Date;
  dueAt: Date;
  ownerLabel: string | null;
  overdue: boolean;
};

export type OpsExamIssueSample = {
  id: string;
  title: string;
  detail: string;
  updatedAt: Date;
};

export type OpsAuditSample = {
  id: string;
  action: string;
  summary: string | null;
  entityType: string;
  entityId: string;
  createdAt: Date;
  actorLabel: string;
};

export type OpsFlags = {
  interventionInbox: boolean;
  studentCheckIn: boolean;
  mockExamAnalysis: boolean;
  baselineMetrics: boolean;
};

const SEVERITY_RANK: Record<OpsSeverity, number> = {
  BLOCKING: 0,
  ACTION_REQUIRED: 1,
  WATCH: 2,
};

const MAX_ACTIONS = 12;
const MAX_ACTIVITIES = 12;

export function formatOpsAge(from: Date, now: Date): string {
  const diffMs = Math.max(0, now.getTime() - from.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  return `${days} gün`;
}

export function sortOpsActions(a: OpsActionItem, b: OpsActionItem): number {
  const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (rank !== 0) return rank;
  const aTime = a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

export function countBand(count: number): "0" | "1-5" | "6-20" | "21+" {
  if (count <= 0) return "0";
  if (count <= 5) return "1-5";
  if (count <= 20) return "6-20";
  return "21+";
}

/** Audit kaydını okunabilir aktivite cümlesine çevirir. */
export function formatAuditActivity(log: OpsAuditSample): OpsActivityItem {
  const summary = log.summary?.trim();
  const text = summary && summary.length > 0 ? summary : fallbackActivityText(log);
  return {
    id: log.id,
    text,
    href: activityHref(log),
    occurredAt: log.createdAt,
    actorLabel: log.actorLabel,
  };
}

function fallbackActivityText(log: OpsAuditSample): string {
  const entity = ENTITY_LABELS[log.entityType] || log.entityType;
  if (log.action.includes("provision")) return `${entity} provisioning güncellendi.`;
  if (log.action.includes("invite") || log.action.includes("davet")) return `${entity} için davet işlemi yapıldı.`;
  if (log.action.includes("enroll") || log.action.includes("group")) return `${entity} grup kaydı güncellendi.`;
  if (log.action.includes("lesson")) return `${entity} ders kaydı güncellendi.`;
  return `${entity} üzerinde işlem yapıldı (${log.action}).`;
}

const ENTITY_LABELS: Record<string, string> = {
  User: "Kişi",
  Group: "Grup",
  Lesson: "Ders",
  ParentStudent: "Veli bağlantısı",
  LeadSubmission: "Talep",
  OdOrder: "Sipariş",
  StudentHelpRequest: "Yardım talebi",
  InterventionCase: "Müdahale",
  OdkExam: "Deneme",
};

function activityHref(log: OpsAuditSample): string | null {
  switch (log.entityType) {
    case "OdOrder":
      return `/panel/yonetim/siparisler/${log.entityId}`;
    case "Group":
      return `/panel/yonetim/gruplar/${log.entityId}`;
    case "User":
      return `/panel/yonetim/kullanicilar`;
    case "Lesson":
      return `/panel/yonetim/takvim`;
    case "InterventionCase":
      return `/panel/yonetim/mudahale`;
    case "OdkExam":
      return `/panel/odk/yonetim/operasyon`;
    default:
      return `/panel/yonetim/kayitlar`;
  }
}

export function buildRiskDistribution(input: {
  activeStudentCount: number;
  criticalStudentIds: Iterable<string>;
  watchStudentIds: Iterable<string>;
}): OpsRiskDistribution {
  const critical = new Set([...input.criticalStudentIds].filter(Boolean));
  const watch = new Set<string>();
  for (const id of input.watchStudentIds) {
    if (!id || critical.has(id)) continue;
    watch.add(id);
  }
  const accounted = critical.size + watch.size;
  const normal = Math.max(0, input.activeStudentCount - accounted);
  return {
    critical: critical.size,
    watch: watch.size,
    normal,
    total: input.activeStudentCount,
    criticalHref: "/panel/yonetim/ogrenciler?durum=dikkat",
    watchHref: "/panel/yonetim/mudahale",
    normalHref: "/panel/yonetim/ogrenciler",
  };
}

export type AdminOperationsCenterInput = {
  now: Date;
  flags: OpsFlags;
  partialData: boolean;
  counts: {
    todayLessons: number | null;
    activeStudents: number | null;
    pendingJobs: number | null;
    openInterventions: number | null;
    newOrdersToday: number | null;
    provisioningPending: number | null;
    todayExams: number | null;
    manualReview: number;
    retryPending: number;
    invitePending: number;
    studentsWithoutGroup: number;
    groupsWithInactiveTeacher: number;
    lessonsMissingPlan: number;
    openHelpRequests: number;
    cancelledLessonsToday: number;
    unnotedLessons: number | null;
    stalePlans: number | null;
    unifiedOpenOps: number;
    unifiedBlockingOps: number;
      failedExams: number;
      profileMismatch: number;
    };
  samples: {
    manualReviewOrders: OpsOrderSample[];
    pendingOrders: OpsOrderSample[];
    retryOrders: OpsOrderSample[];
    invites: OpsInviteSample[];
    studentsWithoutGroup: OpsStudentSample[];
    groupsWithInactiveTeacher: OpsGroupSample[];
    lessonsMissingPlan: OpsLessonSample[];
    helpRequests: OpsHelpSample[];
    interventions: OpsInterventionSample[];
    paidNoAccount: OpsOrderSample[];
    failedExams: OpsExamIssueSample[];
    audits: OpsAuditSample[];
  };
  riskStudentIds: {
    critical: string[];
    watch: string[];
  };
  health: {
    database: OpsHealthStatus;
    databaseDetail: string;
    jobs: OpsHealthStatus;
    jobsDetail: string;
    email: OpsHealthStatus;
    emailDetail: string;
    payment: OpsHealthStatus;
    paymentDetail: string;
    meta: OpsHealthStatus;
    metaDetail: string;
    backup: OpsHealthStatus;
    backupDetail: string;
  };
};

export function buildAdminOperationsCenter(input: AdminOperationsCenterInput): AdminOperationsCenterSnapshot {
  const actions = collectActions(input).sort(sortOpsActions).slice(0, MAX_ACTIONS);
  const activities = input.samples.audits.map(formatAuditActivity).slice(0, MAX_ACTIVITIES);
  const risk = buildRiskDistribution({
    activeStudentCount: input.counts.activeStudents ?? 0,
    criticalStudentIds: input.riskStudentIds.critical,
    watchStudentIds: input.riskStudentIds.watch,
  });

  if (!input.flags.interventionInbox) {
    risk.watchHref = "/panel/yonetim/ogrenciler?durum=dikkat";
  }

  return {
    generatedAt: input.now,
    partialData: input.partialData,
    actions,
    summary: buildSummaryTiles(input),
    activities,
    risk,
    health: buildHealthChecks(input),
    openActionCount: actions.length,
    blockingCount: actions.filter((item) => item.severity === "BLOCKING").length,
  };
}

function collectActions(input: AdminOperationsCenterInput): OpsActionItem[] {
  const { now, flags, counts, samples, partialData } = input;
  const rows: OpsActionItem[] = [];

  if (counts.unifiedOpenOps > 0) {
    rows.push({
      id: "unified-ops",
      code: "UNIFIED_OPS_OPEN",
      severity: counts.unifiedBlockingOps > 0 ? "BLOCKING" : "ACTION_REQUIRED",
      title: `${counts.unifiedOpenOps} operasyon istisnası çözüm bekliyor`,
      subject: "Birleşik operasyon kuyruğu",
      ageLabel: "şimdi",
      owner: null,
      href: "/panel/yonetim/isler",
      ctaLabel: "Çöz",
      createdAt: now,
    });
  }

  for (const order of samples.manualReviewOrders) {
    rows.push({
      id: `manual-${order.id}`,
      code: "PROVISIONING_FAILED",
      severity: "BLOCKING",
      title: "Provisioning başarısız · manuel inceleme",
      subject: `${order.packageName} · ${order.ownerLabel}`,
      ageLabel: formatOpsAge(order.updatedAt, now),
      owner: order.ownerLabel,
      href: `/panel/yonetim/siparisler/${order.id}`,
      ctaLabel: "Çöz",
      createdAt: order.updatedAt,
    });
  }

  for (const order of samples.paidNoAccount) {
    rows.push({
      id: `no-account-${order.id}`,
      code: "PAID_NO_ACCOUNT",
      severity: "BLOCKING",
      title: "Ödeme sonrası hesap açılmamış",
      subject: `${order.packageName} · ${order.ownerLabel}`,
      ageLabel: formatOpsAge(order.updatedAt, now),
      owner: order.ownerLabel,
      href: `/panel/yonetim/siparisler/${order.id}`,
      ctaLabel: "Siparişi Aç",
      createdAt: order.updatedAt,
    });
  }

  for (const order of samples.pendingOrders) {
    rows.push({
      id: `pending-${order.id}`,
      code: "PROVISIONING_PENDING",
      severity: "ACTION_REQUIRED",
      title: "Provisioning tamamlanmadı",
      subject: `${order.packageName} · ${order.ownerLabel}`,
      ageLabel: formatOpsAge(order.updatedAt, now),
      owner: order.ownerLabel,
      href: `/panel/yonetim/siparisler/${order.id}`,
      ctaLabel: "İncele",
      createdAt: order.updatedAt,
    });
  }

  for (const order of samples.retryOrders) {
    rows.push({
      id: `retry-${order.id}`,
      code: "PROVISIONING_RETRY",
      severity: "WATCH",
      title: "Provisioning yeniden denenecek",
      subject: `${order.packageName} · ${order.ownerLabel}`,
      ageLabel: formatOpsAge(order.updatedAt, now),
      owner: order.ownerLabel,
      href: `/panel/yonetim/siparisler/${order.id}`,
      ctaLabel: "İncele",
      createdAt: order.updatedAt,
    });
  }

  for (const invite of samples.invites) {
    const since = invite.inviteSentAt ?? invite.createdAt;
    rows.push({
      id: `invite-${invite.id}`,
      code: "INVITE_PENDING",
      severity: "ACTION_REQUIRED",
      title: "Davet kabul edilmemiş",
      subject: `${invite.label} · ${invite.role}`,
      ageLabel: formatOpsAge(since, now),
      owner: null,
      href: `/panel/yonetim/ogrenciler?durum=davet`,
      ctaLabel: "Davetleri Aç",
      createdAt: since,
    });
  }

  for (const student of samples.studentsWithoutGroup) {
    rows.push({
      id: `no-group-${student.profileId}`,
      code: "STUDENT_NO_GROUP",
      severity: "ACTION_REQUIRED",
      title: "Aktif öğrenci gruba atanmamış",
      subject: student.label,
      ageLabel: formatOpsAge(student.since, now),
      owner: null,
      href: `/panel/yonetim/ogrenciler/${student.profileId}`,
      ctaLabel: "Öğrenciyi Aç",
      createdAt: student.since,
    });
  }

  for (const group of samples.groupsWithInactiveTeacher) {
    rows.push({
      id: `group-teacher-${group.id}`,
      code: "GROUP_TEACHER_INACTIVE",
      severity: "BLOCKING",
      title: "Grubun öğretmeni aktif değil",
      subject: `${group.name} · ${group.teacherLabel}`,
      ageLabel: formatOpsAge(group.updatedAt, now),
      owner: group.teacherLabel,
      href: `/panel/yonetim/gruplar/${group.id}`,
      ctaLabel: "Grubu Aç",
      createdAt: group.updatedAt,
    });
  }

  for (const lesson of samples.lessonsMissingPlan) {
    rows.push({
      id: `lesson-plan-${lesson.id}`,
      code: "LESSON_MISSING_PLAN",
      severity: "ACTION_REQUIRED",
      title: "Yaklaşan ders eksik planla",
      subject: `${lesson.groupName} · ${lesson.title} · ${lesson.reason}`,
      ageLabel: formatOpsAge(lesson.startsAt, now).startsWith("-")
        ? "yakında"
        : `başlangıç ${new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(lesson.startsAt)}`,
      owner: null,
      href: "/panel/yonetim/takvim",
      ctaLabel: "Takvimi Aç",
      createdAt: lesson.startsAt,
    });
  }

  if (flags.studentCheckIn) {
    for (const help of samples.helpRequests) {
      const overdue = help.dueAt.getTime() < now.getTime();
      rows.push({
        id: `help-${help.id}`,
        code: "HELP_REQUEST_OPEN",
        severity: overdue ? "BLOCKING" : "ACTION_REQUIRED",
        title: overdue ? "Açık yardım talebi · süresi geçti" : "Açık öğrenci yardım talebi",
        subject: `${help.studentLabel} · ${help.groupName}`,
        ageLabel: formatOpsAge(help.createdAt, now),
        owner: help.ownerLabel,
        href: "/panel/yonetim/isler",
        ctaLabel: "Takip Et",
        createdAt: help.createdAt,
      });
    }
  }

  if (flags.interventionInbox) {
    for (const item of samples.interventions) {
      rows.push({
        id: `intervention-${item.id}`,
        code: "HIGH_RISK_STUDENT",
        severity: item.overdue ? "BLOCKING" : "ACTION_REQUIRED",
        title: item.overdue ? "Yüksek riskli öğrenci · müdahale gecikti" : "Yüksek riskli öğrenci",
        subject: `${item.studentLabel} · ${item.explanation}`,
        ageLabel: formatOpsAge(item.createdAt, now),
        owner: item.ownerLabel,
        href: "/panel/yonetim/mudahale",
        ctaLabel: "Çöz",
        createdAt: item.createdAt,
      });
    }
  }

  for (const exam of samples.failedExams) {
    rows.push({
      id: `exam-${exam.id}`,
      code: "MOCK_EXAM_FAILED",
      severity: "ACTION_REQUIRED",
      title: "Başarısız deneme operasyonu",
      subject: `${exam.title} · ${exam.detail}`,
      ageLabel: formatOpsAge(exam.updatedAt, now),
      owner: null,
      href: "/panel/odk/yonetim/operasyon",
      ctaLabel: "Operasyonu Aç",
      createdAt: exam.updatedAt,
    });
  }

  if (counts.cancelledLessonsToday > 0) {
    rows.push({
      id: "cancelled-today",
      code: "LESSON_CANCELLED",
      severity: "ACTION_REQUIRED",
      title: `Bugün ${counts.cancelledLessonsToday} ders iptal edildi`,
      subject: "Takvim",
      ageLabel: "bugün",
      owner: null,
      href: "/panel/yonetim/takvim",
      ctaLabel: "Takvimi Aç",
      createdAt: now,
    });
  }

  if (counts.profileMismatch > 0) {
    rows.push({
      id: "profile-mismatch",
      code: "ACCOUNT_INTEGRITY",
      severity: "ACTION_REQUIRED",
      title: `${counts.profileMismatch} hesapta rol/profil uyumsuzluğu var`,
      subject: "Kişiler",
      ageLabel: "şimdi",
      owner: null,
      href: "/panel/yonetim/kullanicilar?durum=profil",
      ctaLabel: "Kişileri Aç",
      createdAt: now,
    });
  }

  if ((counts.unnotedLessons ?? 0) > 0) {
    rows.push({
      id: "unnoted",
      code: "UNNOTED_LESSON",
      severity: "WATCH",
      title: `${counts.unnotedLessons} derste not girişi bekleniyor`,
      subject: "Eğitim kanıtı",
      ageLabel: "7 gün",
      owner: null,
      href: "/panel/yonetim/egitim",
      ctaLabel: "Eğitimi Aç",
      createdAt: null,
    });
  }

  if ((counts.stalePlans ?? 0) > 0) {
    rows.push({
      id: "stale-plans",
      code: "STALE_PLAN",
      severity: "WATCH",
      title: `${counts.stalePlans} haftalık plan uzun süredir taslak`,
      subject: "Koçluk",
      ageLabel: "7+ gün",
      owner: null,
      href: "/panel/yonetim/kocluk",
      ctaLabel: "Koçluğu Aç",
      createdAt: null,
    });
  }

  if (input.health.jobs === "down" || input.health.database === "down") {
    rows.push({
      id: "system-critical",
      code: "SYSTEM_CRON",
      severity: "BLOCKING",
      title: "Kritik sistem hatası",
      subject: input.health.database === "down" ? "Veritabanı" : "Arka plan işleri",
      ageLabel: "şimdi",
      owner: null,
      href: "/panel/yonetim/isler#cron-durumu",
      ctaLabel: "Durumu Aç",
      createdAt: now,
    });
  } else if (input.health.jobs === "degraded" || input.health.email === "degraded") {
    rows.push({
      id: "system-degraded",
      code: "SYSTEM_CRON",
      severity: "ACTION_REQUIRED",
      title: "Sistem sağlığı bozulmuş",
      subject: input.health.jobsDetail || input.health.emailDetail,
      ageLabel: "şimdi",
      owner: null,
      href: "/panel/yonetim/isler#cron-durumu",
      ctaLabel: "Durumu Aç",
      createdAt: now,
    });
  }

  if (partialData) {
    rows.push({
      id: "partial-data",
      code: "SYSTEM_PARTIAL_DATA",
      severity: "ACTION_REQUIRED",
      title: "Bazı operasyon kaynakları okunamadı",
      subject: "Kısmi veri",
      ageLabel: "şimdi",
      owner: null,
      href: "/panel/yonetim/isler",
      ctaLabel: "Operasyonu Aç",
      createdAt: now,
    });
  }

  return rows;
}

function buildSummaryTiles(input: AdminOperationsCenterInput): OpsSummaryTile[] {
  const { counts, flags } = input;
  const tiles: OpsSummaryTile[] = [
    {
      id: "today_lessons",
      label: "Bugünkü dersler",
      value: counts.todayLessons,
      hint: counts.todayLessons === 0 ? "Bugün planlı ders yok" : "Takvimde bugünkü oturumlar",
      href: "/panel/yonetim/takvim",
      tone: (counts.todayLessons ?? 0) > 0 ? "neutral" : "success",
      available: counts.todayLessons !== null,
    },
    {
      id: "active_students",
      label: "Aktif öğrenciler",
      value: counts.activeStudents,
      hint: "Aktif öğrenci hesapları",
      href: "/panel/yonetim/ogrenciler",
      tone: "neutral",
      available: counts.activeStudents !== null,
    },
    {
      id: "pending_jobs",
      label: "Bekleyen işler",
      value: counts.pendingJobs,
      hint: "Birleşik operasyon + provisioning",
      href: "/panel/yonetim/isler",
      tone: (counts.pendingJobs ?? 0) > 0 ? "warning" : "success",
      available: counts.pendingJobs !== null,
    },
    {
      id: "open_interventions",
      label: "Açık müdahaleler",
      value: flags.interventionInbox ? counts.openInterventions : null,
      hint: flags.interventionInbox
        ? (counts.openInterventions ?? 0) > 0
          ? "Müdahale kutusunda açık kayıt"
          : "Açık müdahale yok"
        : "Özellik kapalı",
      href: flags.interventionInbox ? "/panel/yonetim/mudahale" : "/panel/yonetim/raporlar",
      tone: flags.interventionInbox && (counts.openInterventions ?? 0) > 0 ? "critical" : "neutral",
      available: flags.interventionInbox && counts.openInterventions !== null,
    },
    {
      id: "new_orders",
      label: "Yeni siparişler",
      value: counts.newOrdersToday,
      hint: "Bugün oluşturulan siparişler",
      href: "/panel/yonetim/siparisler",
      tone: "neutral",
      available: counts.newOrdersToday !== null,
    },
    {
      id: "provisioning_pending",
      label: "Provisioning bekleyenler",
      value: counts.provisioningPending,
      hint: "PENDING / RUNNING / RETRY",
      href: "/panel/yonetim/siparisler?filtre=sorun",
      tone: (counts.provisioningPending ?? 0) > 0 ? "warning" : "success",
      available: counts.provisioningPending !== null,
    },
    {
      id: "today_exams",
      label: "Bugünkü denemeler",
      value: counts.todayExams,
      hint: "Canlı veya bugün planlı ODK denemeleri",
      href: "/panel/odk/yonetim/operasyon",
      tone: (counts.todayExams ?? 0) > 0 ? "neutral" : "success",
      available: counts.todayExams !== null,
    },
  ];
  return tiles;
}

function buildHealthChecks(input: AdminOperationsCenterInput): OpsHealthCheck[] {
  const { health } = input;
  return [
    {
      id: "database",
      label: "DB",
      status: health.database,
      detail: health.databaseDetail,
      href: "/panel/yonetim/ozellikler",
    },
    {
      id: "background_jobs",
      label: "Arka plan",
      status: health.jobs,
      detail: health.jobsDetail,
      href: "/panel/yonetim/isler#cron-durumu",
    },
    {
      id: "email",
      label: "E-posta",
      status: health.email,
      detail: health.emailDetail,
      href: "/panel/yonetim/isler",
    },
    {
      id: "payment_callback",
      label: "Ödeme",
      status: health.payment,
      detail: health.paymentDetail,
      href: "/panel/yonetim/siparisler?filtre=sorun",
    },
    {
      id: "meta",
      label: "Meta",
      status: health.meta,
      detail: health.metaDetail,
      href: "/panel/yonetim/isletme",
    },
    {
      id: "backup",
      label: "Yedek",
      status: health.backup,
      detail: health.backupDetail,
      href: "/panel/yonetim/ozellikler",
    },
  ];
}

export const OPS_SEVERITY_LABEL: Record<OpsSeverity, { label: string; tone: "critical" | "warning" | "neutral" }> = {
  BLOCKING: { label: "Kritik", tone: "critical" },
  ACTION_REQUIRED: { label: "Aksiyon", tone: "warning" },
  WATCH: { label: "İzle", tone: "neutral" },
};

export const OPS_HEALTH_LABEL: Record<OpsHealthStatus, string> = {
  ok: "Sağlıklı",
  degraded: "Zayıf",
  down: "Kritik",
  unknown: "Bilinmiyor",
};
