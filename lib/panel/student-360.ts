import type { OdkExamStatus, ProductCode } from "@prisma/client";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";

/**
 * ÖĞRENCİ 360 — saf domain mantığı.
 *
 * Veritabanına dokunmaz. Risk puanları açıklanabilir kurallardan üretilir;
 * "neden riskli?" sorusu her sinyalin `reason` alanında cevaplanır.
 */

export type Student360LessonSignal = {
  id: string;
  startsAt: Date;
  title: string;
};

export type Student360ExamSignal = {
  id: string;
  title: string;
  status: OdkExamStatus;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type Student360IssueCode =
  | "PROVISIONING_BLOCKED"
  | "GROUP_MISSING"
  | "PARENT_MISSING"
  | "COACH_MISSING";

export type Student360Issue = {
  code: Student360IssueCode;
  title: string;
  description: string;
  severity: "warning" | "critical";
};

export const STUDENT_360_TABS = [
  "genel",
  "akademik",
  "dersler",
  "kocluk",
  "denemeler",
  "risk",
  "veli",
  "paket",
] as const;

export type Student360Tab = (typeof STUDENT_360_TABS)[number];

export const STUDENT_360_TAB_LABELS: Record<Student360Tab, string> = {
  genel: "Genel bakış",
  akademik: "Akademik",
  dersler: "Dersler",
  kocluk: "Koçluk",
  denemeler: "Denemeler",
  risk: "Risk & müdahale",
  veli: "Veli & iletişim",
  paket: "Paket & ticari",
};

export type Student360ViewerRole = "ADMIN" | "TEACHER";

export type Student360ActionId =
  | "SCHEDULE_LESSON"
  | "MANAGE_GROUP"
  | "CREATE_ASSIGNMENT"
  | "ADD_COACHING_NOTE"
  | "VIEW_PARENT"
  | "CREATE_INTERVENTION"
  | "MANAGE_ACCOUNT_PACKAGE";

export type Student360Action = {
  id: Student360ActionId;
  label: string;
  href: string;
};

export type Student360RiskCode =
  | "ABSENCE"
  | "OVERDUE_ASSIGNMENT"
  | "PLAN_UNDERPERFORMING"
  | "EXAM_DROP"
  | "HELP_REQUEST"
  | "INACTIVE_LOGIN"
  | "REVIEW_QUEUE_GROWTH"
  | "PROVISIONING_BLOCKED"
  | "GROUP_MISSING"
  | "PARENT_MISSING"
  | "COACH_MISSING";

export type Student360RiskSeverity = "low" | "medium" | "high";

export type Student360RiskLevel = "none" | "low" | "medium" | "high";

export type Student360RiskItem = {
  code: Student360RiskCode;
  points: number;
  severity: Student360RiskSeverity;
  reason: string;
  suggestedAction: string;
  detectedAt: Date | null;
  status: string | null;
  ownerName: string | null;
};

export type Student360RiskSummary = {
  level: Student360RiskLevel;
  totalPoints: number;
  whyRisky: string[];
  items: Student360RiskItem[];
};

export const STUDENT_360_RISK_LEVEL_LABELS: Record<Student360RiskLevel, string> = {
  none: "Risk yok",
  low: "Düşük risk",
  medium: "Orta risk",
  high: "Yüksek risk",
};

/** Platform rollerinden hangileri Student 360 izleyebilir? Veli/öğrenci → hayır. */
export function isStudent360ViewerRole(role: string): role is Student360ViewerRole {
  return role === "ADMIN" || role === "TEACHER";
}

/** Ticari / paket sekmesi yalnız platform yöneticisine açıktır. */
export function canViewStudent360Commerce(role: Student360ViewerRole): boolean {
  return role === "ADMIN";
}

export function visibleStudent360Tabs(input: {
  role: Student360ViewerRole;
  canViewCommerce: boolean;
  flags: Pick<
    PanelFeatureFlags,
    "adaptivePlan" | "mockExamAnalysis" | "interventionInbox" | "parentWeeklyDigest"
  >;
}): Student360Tab[] {
  const tabs: Student360Tab[] = ["genel", "akademik", "dersler"];
  if (input.flags.adaptivePlan) tabs.push("kocluk");
  if (input.flags.mockExamAnalysis) tabs.push("denemeler");
  if (input.flags.interventionInbox) tabs.push("risk");
  tabs.push("veli");
  if (input.canViewCommerce) tabs.push("paket");
  return tabs;
}

export function parseStudent360Tab(
  raw: string | string[] | undefined,
  allowed: readonly Student360Tab[],
): Student360Tab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && (allowed as readonly string[]).includes(value)) {
    return value as Student360Tab;
  }
  return allowed[0] ?? "genel";
}

export function student360TabHref(basePath: string, tab: Student360Tab): string {
  const sep = basePath.includes("?") ? "&" : "?";
  return `${basePath}${sep}sekme=${tab}`;
}

export function visibleStudent360Actions(input: {
  role: Student360ViewerRole;
  studentProfileId: string;
  studentUserId: string;
  canViewCommerce: boolean;
  hasCoachAccess: boolean;
  flags: Pick<PanelFeatureFlags, "adaptivePlan" | "interventionInbox">;
}): Student360Action[] {
  const actions: Student360Action[] = [];
  const teacherBase = "/panel/ogretmen";
  const adminBase = "/panel/yonetim";

  if (input.role === "ADMIN") {
    actions.push({
      id: "SCHEDULE_LESSON",
      label: "Ders planla",
      href: `${adminBase}/takvim`,
    });
    actions.push({
      id: "MANAGE_GROUP",
      label: "Gruba ekle / değiştir",
      href: `${adminBase}/egitim`,
    });
    actions.push({
      id: "CREATE_ASSIGNMENT",
      label: "Ödev oluştur",
      href: `${adminBase}/egitim`,
    });
    if (input.flags.adaptivePlan) {
      actions.push({
        id: "ADD_COACHING_NOTE",
        label: "Koçluk notu ekle",
        href: `${adminBase}/kocluk`,
      });
    }
    actions.push({
      id: "VIEW_PARENT",
      label: "Veli bilgisine git",
      href: student360TabHref(`${adminBase}/ogrenciler/${input.studentProfileId}`, "veli"),
    });
    if (input.flags.interventionInbox) {
      actions.push({
        id: "CREATE_INTERVENTION",
        label: "Müdahale oluştur",
        href: `${adminBase}/mudahale?ogrenci=${input.studentProfileId}`,
      });
    }
    if (input.canViewCommerce) {
      actions.push({
        id: "MANAGE_ACCOUNT_PACKAGE",
        label: "Hesap / paket işlemleri",
        href: `${adminBase}/kullanicilar/${input.studentUserId}`,
      });
    }
    return actions;
  }

  actions.push({
    id: "SCHEDULE_LESSON",
    label: "Ders planla",
    href: `${teacherBase}/takvim`,
  });
  actions.push({
    id: "CREATE_ASSIGNMENT",
    label: "Ödev oluştur",
    href: `${teacherBase}/odevler`,
  });
  if (input.hasCoachAccess && input.flags.adaptivePlan) {
    actions.push({
      id: "ADD_COACHING_NOTE",
      label: "Koçluk notu ekle",
      href: `${teacherBase}/hazirlik/${input.studentProfileId}`,
    });
  }
  actions.push({
    id: "VIEW_PARENT",
    label: "Veli bilgisine git",
    href: student360TabHref(`${teacherBase}/ogrenci/${input.studentProfileId}`, "veli"),
  });
  if (input.flags.interventionInbox) {
    actions.push({
      id: "CREATE_INTERVENTION",
      label: "Müdahale oluştur",
      href: `${teacherBase}/mudahale?ogrenci=${input.studentProfileId}`,
    });
  }
  return actions;
}

export function pickNearestUpcomingLesson(
  lessons: Student360LessonSignal[],
  now: Date,
): Student360LessonSignal | null {
  return (
    lessons
      .filter((lesson) => lesson.startsAt.getTime() >= now.getTime())
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())[0] ?? null
  );
}

export function pickNearestUpcomingExam(
  exams: Student360ExamSignal[],
  now: Date,
): Student360ExamSignal | null {
  const live =
    exams
      .filter((exam) => exam.status === "LIVE" && (!exam.endsAt || exam.endsAt.getTime() > now.getTime()))
      .sort(
        (left, right) =>
          (left.startsAt?.getTime() ?? Number.MIN_SAFE_INTEGER) -
          (right.startsAt?.getTime() ?? Number.MIN_SAFE_INTEGER),
      )[0] ?? null;
  if (live) return live;
  return (
    exams
      .filter(
        (exam) =>
          exam.status === "SCHEDULED" &&
          Boolean(exam.startsAt) &&
          (exam.startsAt?.getTime() ?? 0) >= now.getTime() &&
          (!exam.endsAt || exam.endsAt.getTime() > now.getTime()),
      )
      .sort((left, right) => (left.startsAt?.getTime() ?? 0) - (right.startsAt?.getTime() ?? 0))[0] ?? null
  );
}

export function deriveStudent360Issues(input: {
  products: readonly ProductCode[];
  blockedProvisioningCount: number;
  hasActiveGroup: boolean;
  hasParentLink: boolean;
  hasCoachAssignment: boolean;
}): Student360Issue[] {
  const issues: Student360Issue[] = [];
  if (input.blockedProvisioningCount > 0) {
    issues.push({
      code: "PROVISIONING_BLOCKED",
      title: "Ödeme alındı, ürün erişimi açılmadı",
      description: `${input.blockedProvisioningCount} siparişte provisioning tamamlanmamış görünüyor.`,
      severity: "critical",
    });
  }
  if (input.products.includes("OD") && !input.hasActiveGroup) {
    issues.push({
      code: "GROUP_MISSING",
      title: "Grup ataması eksik",
      description: "Online Dershanem erişimi var ama aktif grup kaydı yok.",
      severity: "warning",
    });
  }
  if (input.products.includes("OD") && !input.hasParentLink) {
    issues.push({
      code: "PARENT_MISSING",
      title: "Veli bağlantısı eksik",
      description: "Öğrencinin aktif veli bağlantısı bulunmuyor.",
      severity: "warning",
    });
  }
  if (input.products.includes("OK") && !input.hasCoachAssignment) {
    issues.push({
      code: "COACH_MISSING",
      title: "Koç ataması eksik",
      description: "Online Koçum erişimi var ama aktif koç ataması yok.",
      severity: "warning",
    });
  }
  return issues;
}

/**
 * Açıklanabilir risk sinyalleri.
 *
 * Her kuralın `reason` alanı "Bu öğrenci neden riskli?" sorusuna düz Türkçe
 * cevap verir. Puanlar sabit ve belgelidir — kara kutu model yoktur.
 */
export function deriveStudent360RiskSignals(input: {
  attendanceAbsentCount14d: number;
  attendanceTotalCount14d: number;
  overdueAssignmentCount: number;
  planCompletionPercent: number | null;
  planTaskTotal: number;
  examNetDrop: number | null;
  openHelpRequestCount: number;
  daysSinceLastLogin: number | null;
  reviewDueCount: number;
  blockedProvisioningCount: number;
  products: readonly ProductCode[];
  hasActiveGroup: boolean;
  hasParentLink: boolean;
  hasCoachAssignment: boolean;
  now?: Date;
}): Student360RiskItem[] {
  const now = input.now ?? new Date();
  const items: Student360RiskItem[] = [];

  if (input.attendanceTotalCount14d >= 2 && input.attendanceAbsentCount14d >= 2) {
    items.push({
      code: "ABSENCE",
      points: 25,
      severity: input.attendanceAbsentCount14d >= 3 ? "high" : "medium",
      reason: `Son 14 günde ${input.attendanceAbsentCount14d} ders kaçırdı (${input.attendanceTotalCount14d} kayıtlı dersten).`,
      suggestedAction: "Devamsızlık nedenini doğrulayıp telafi veya erişim engelini netleştirin.",
      detectedAt: now,
      status: "OPEN",
      ownerName: null,
    });
  }

  if (input.overdueAssignmentCount >= 1) {
    items.push({
      code: "OVERDUE_ASSIGNMENT",
      points: Math.min(30, 10 * input.overdueAssignmentCount),
      severity: input.overdueAssignmentCount >= 3 ? "high" : input.overdueAssignmentCount >= 2 ? "medium" : "low",
      reason: `${input.overdueAssignmentCount} ödev gecikmiş durumda.`,
      suggestedAction: "En kritik tek ödevi seçip engeli öğrenciyle birlikte konuşun.",
      detectedAt: now,
      status: "OPEN",
      ownerName: null,
    });
  }

  if (
    input.planTaskTotal >= 3 &&
    input.planCompletionPercent != null &&
    input.planCompletionPercent < 50
  ) {
    items.push({
      code: "PLAN_UNDERPERFORMING",
      points: 20,
      severity: input.planCompletionPercent < 30 ? "high" : "medium",
      reason: `Haftalık plan %${input.planCompletionPercent} tamamlandı (${input.planTaskTotal} görev).`,
      suggestedAction: "Plan kapasitesini düşürüp bugüne tek küçük öncelik bırakın.",
      detectedAt: now,
      status: "OPEN",
      ownerName: null,
    });
  }

  if (input.examNetDrop != null && input.examNetDrop >= 3) {
    items.push({
      code: "EXAM_DROP",
      points: 20,
      severity: input.examNetDrop >= 6 ? "high" : "medium",
      reason: `Son denemede toplam net ${input.examNetDrop.toFixed(1).replace(".", ",")} puan düştü.`,
      suggestedAction: "Düşüşün yoğunlaştığı dersi ayıklayıp kısa bir telafi seti planlayın.",
      detectedAt: now,
      status: "OPEN",
      ownerName: null,
    });
  }

  if (input.openHelpRequestCount >= 1) {
    items.push({
      code: "HELP_REQUEST",
      points: 15,
      severity: "medium",
      reason: `${input.openHelpRequestCount} açık yardım talebi var.`,
      suggestedAction: "Yardım talebine aynı gün kısa bir yanıt verin.",
      detectedAt: now,
      status: "OPEN",
      ownerName: null,
    });
  }

  if (input.daysSinceLastLogin != null && input.daysSinceLastLogin >= 14) {
    items.push({
      code: "INACTIVE_LOGIN",
      points: input.daysSinceLastLogin >= 21 ? 25 : 15,
      severity: input.daysSinceLastLogin >= 21 ? "high" : "medium",
      reason: `Sisteme ${input.daysSinceLastLogin} gündür giriş yapmadı.`,
      suggestedAction: "Erişim veya motivasyon engelini veli/öğrenciyle doğrulayın.",
      detectedAt: now,
      status: "OPEN",
      ownerName: null,
    });
  }

  if (input.reviewDueCount >= 8) {
    items.push({
      code: "REVIEW_QUEUE_GROWTH",
      points: 15,
      severity: input.reviewDueCount >= 15 ? "high" : "medium",
      reason: `Tekrar kuyruğunda ${input.reviewDueCount} vadesi gelmiş öğe birikti.`,
      suggestedAction: "Kuyruğu 2–3 kritik maddeye indirip diğerlerini erteleyin.",
      detectedAt: now,
      status: "OPEN",
      ownerName: null,
    });
  }

  for (const issue of deriveStudent360Issues({
    products: input.products,
    blockedProvisioningCount: input.blockedProvisioningCount,
    hasActiveGroup: input.hasActiveGroup,
    hasParentLink: input.hasParentLink,
    hasCoachAssignment: input.hasCoachAssignment,
  })) {
    items.push({
      code: issue.code,
      points: issue.severity === "critical" ? 30 : 10,
      severity: issue.severity === "critical" ? "high" : "low",
      reason: issue.description,
      suggestedAction: issue.title,
      detectedAt: now,
      status: "OPEN",
      ownerName: null,
    });
  }

  return items.sort(
    (left, right) =>
      right.points - left.points || left.code.localeCompare(right.code, "tr"),
  );
}

export function summarizeStudent360Risk(items: Student360RiskItem[]): Student360RiskSummary {
  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
  let level: Student360RiskLevel = "none";
  if (totalPoints >= 50 || items.some((item) => item.severity === "high" && item.points >= 25)) {
    level = "high";
  } else if (totalPoints >= 25 || items.some((item) => item.severity === "medium" || item.severity === "high")) {
    level = "medium";
  } else if (totalPoints > 0) {
    level = "low";
  }
  return {
    level,
    totalPoints,
    whyRisky: items.slice(0, 4).map((item) => item.reason),
    items,
  };
}

export function planCompletionPercent(done: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((done / total) * 100);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function examNetDelta(previousNet: number | null, latestNet: number | null): number | null {
  if (previousNet == null || latestNet == null) return null;
  return Math.round((previousNet - latestNet) * 10) / 10;
}

export type Student360PackageStatus =
  | "none"
  | "active"
  | "expiring"
  | "provisioning_blocked"
  | "paid_pending";

export function derivePackageStatus(input: {
  activeProductCount: number;
  blockedProvisioningCount: number;
  nearestExpiryAt: Date | null;
  now?: Date;
}): Student360PackageStatus {
  if (input.blockedProvisioningCount > 0) return "provisioning_blocked";
  if (input.activeProductCount === 0) return "none";
  if (input.nearestExpiryAt) {
    const now = input.now ?? new Date();
    const days = daysBetween(now, input.nearestExpiryAt);
    if (days >= 0 && days <= 30) return "expiring";
  }
  return "active";
}

export const STUDENT_360_PACKAGE_STATUS_LABELS: Record<Student360PackageStatus, string> = {
  none: "Aktif paket yok",
  active: "Aktif",
  expiring: "Yenileme yaklaşıyor",
  provisioning_blocked: "Provisioning bekliyor",
  paid_pending: "Ödeme sonrası işlem",
};
