/**
 * GRUP 360 — saf domain mantığı.
 *
 * Veritabanına dokunmaz. Operasyon sinyalleri açıklanabilir kurallardan üretilir;
 * "Bu grupla ilgili şu an çözülmesi gereken bir sorun var mı?" sorusu
 * `whyAttention` alanında cevaplanır.
 */

export const GROUP_360_TABS = [
  "genel",
  "ogrenciler",
  "program",
  "gecmis",
  "operasyon",
] as const;

export type Group360Tab = (typeof GROUP_360_TABS)[number];

export const GROUP_360_TAB_LABELS: Record<Group360Tab, string> = {
  genel: "Genel",
  ogrenciler: "Öğrenciler",
  program: "Program",
  gecmis: "Geçmiş",
  operasyon: "Operasyon",
};

export type Group360IssueCode =
  | "TEACHER_MISSING"
  | "CAPACITY_FULL"
  | "NO_SCHEDULED_LESSON"
  | "STALE_GROUP"
  | "SCHEDULE_CONFLICT"
  | "GROUP_INACTIVE"
  | "EMPTY_ACTIVE_GROUP";

export type Group360IssueSeverity = "info" | "warning" | "critical";

export type Group360Issue = {
  code: Group360IssueCode;
  title: string;
  description: string;
  severity: Group360IssueSeverity;
};

export type Group360OpsStatus = "ok" | "attention" | "critical" | "archived";

export type Group360OpsSummary = {
  status: Group360OpsStatus;
  label: string;
  whyAttention: string[];
  issues: Group360Issue[];
};

export type Group360ActionId =
  | "ADD_STUDENT"
  | "TRANSFER_STUDENT"
  | "CHANGE_TEACHER"
  | "CREATE_LESSON"
  | "EDIT_SERIES"
  | "ARCHIVE_GROUP";

export type Group360Action = {
  id: Group360ActionId;
  label: string;
  href: string;
};

export type Group360MemberRisk = "none" | "low" | "medium" | "high";

export type ScheduleConflictKind = "TEACHER" | "GROUP" | "STUDENT";

export type ScheduleConflictSignal = {
  kind: ScheduleConflictKind;
  lessonId: string;
  lessonTitle: string;
  startsAt: Date;
  otherLessonId: string;
  otherLessonTitle: string;
  otherStartsAt: Date;
  studentId?: string;
  studentName?: string;
};

export type TransferBlockerCode =
  | "TARGET_INACTIVE"
  | "TARGET_CAPACITY"
  | "STUDENT_INACTIVE"
  | "NOT_ENROLLED"
  | "ALREADY_IN_TARGET"
  | "SAME_GROUP"
  | "STUDENT_SCHEDULE_CONFLICT"
  | "SOURCE_INACTIVE";

export type TransferPreviewItem = {
  studentId: string;
  studentName: string;
  blockers: Array<{ code: TransferBlockerCode; message: string }>;
  warnings: string[];
  affectedSourceLessons: Array<{ id: string; title: string; startsAt: Date }>;
  affectedTargetLessons: Array<{ id: string; title: string; startsAt: Date }>;
  conflicts: ScheduleConflictSignal[];
};

export type TransferPreviewSummary = {
  targetGroupId: string;
  targetGroupName: string;
  capacity: { active: number; capacity: number; available: number };
  canExecute: boolean;
  items: TransferPreviewItem[];
  seatDemand: number;
};

export const STALE_GROUP_DAYS = 21;

export function parseGroup360Tab(
  raw: string | string[] | undefined,
  allowed: readonly Group360Tab[] = GROUP_360_TABS,
): Group360Tab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && (allowed as readonly string[]).includes(value)) {
    return value as Group360Tab;
  }
  return allowed[0] ?? "genel";
}

export function group360TabHref(basePath: string, tab: Group360Tab): string {
  const sep = basePath.includes("?") ? "&" : "?";
  return `${basePath}${sep}sekme=${tab}`;
}

export function visibleGroup360Actions(input: {
  groupId: string;
  isActive: boolean;
}): Group360Action[] {
  const base = `/panel/yonetim/gruplar/${input.groupId}`;
  const actions: Group360Action[] = [
    {
      id: "ADD_STUDENT",
      label: "Öğrenci ekle",
      href: group360TabHref(base, "ogrenciler"),
    },
    {
      id: "TRANSFER_STUDENT",
      label: "Öğrenci transfer et",
      href: group360TabHref(base, "ogrenciler"),
    },
    {
      id: "CHANGE_TEACHER",
      label: "Öğretmen değiştir",
      href: group360TabHref(base, "operasyon"),
    },
    {
      id: "CREATE_LESSON",
      label: "Ders oluştur",
      href: `/panel/yonetim/takvim?groupId=${input.groupId}`,
    },
    {
      id: "EDIT_SERIES",
      label: "Ders serisi düzenle",
      href: group360TabHref(base, "program"),
    },
  ];
  actions.push({
    id: "ARCHIVE_GROUP",
    label: input.isActive ? "Grubu arşivle" : "Grubu tekrar aç",
    href: group360TabHref(base, "operasyon"),
  });
  return actions;
}

export function deriveGroup360Issues(input: {
  isActive: boolean;
  teacherActive: boolean;
  activeStudentCount: number;
  capacity: number;
  upcomingPlannedCount: number;
  daysSinceLastCompletedLesson: number | null;
  openScheduleConflictCount: number;
  now?: Date;
}): Group360Issue[] {
  const issues: Group360Issue[] = [];

  if (!input.isActive) {
    issues.push({
      code: "GROUP_INACTIVE",
      title: "Grup arşivlenmiş",
      description: "Kapalı grupta öğrenci ve program işlemi yapılamaz.",
      severity: "info",
    });
    return issues;
  }

  if (!input.teacherActive) {
    issues.push({
      code: "TEACHER_MISSING",
      title: "Öğretmen eksik veya pasif",
      description: "Grubun ana öğretmeni aktif değil; ders ve yoklama operasyonu riskli.",
      severity: "critical",
    });
  }

  if (input.activeStudentCount >= input.capacity) {
    issues.push({
      code: "CAPACITY_FULL",
      title: "Kapasite dolu",
      description: `${input.activeStudentCount}/${input.capacity} koltuk dolu; yeni öğrenci eklenemez.`,
      severity: "warning",
    });
  }

  if (input.activeStudentCount === 0) {
    issues.push({
      code: "EMPTY_ACTIVE_GROUP",
      title: "Boş aktif grup",
      description: "Aktif grupta öğrenci yok; kapasite boşa ayrılmış olabilir.",
      severity: "info",
    });
  }

  if (input.upcomingPlannedCount === 0) {
    issues.push({
      code: "NO_SCHEDULED_LESSON",
      title: "Plansız ders",
      description: "Yaklaşan planlı ders yok; grup programı boş görünüyor.",
      severity: "warning",
    });
  }

  if (
    input.daysSinceLastCompletedLesson != null &&
    input.daysSinceLastCompletedLesson >= STALE_GROUP_DAYS
  ) {
    issues.push({
      code: "STALE_GROUP",
      title: "Uzun süredir ders yapılmayan grup",
      description: `Son tamamlanan dersten bu yana ${input.daysSinceLastCompletedLesson} gün geçti.`,
      severity: "warning",
    });
  }

  if (input.openScheduleConflictCount > 0) {
    issues.push({
      code: "SCHEDULE_CONFLICT",
      title: "Çözülmemiş program çakışması",
      description: `${input.openScheduleConflictCount} yaklaşan ders çakışması tespit edildi.`,
      severity: "critical",
    });
  }

  return issues;
}

export function summarizeGroup360Ops(issues: Group360Issue[]): Group360OpsSummary {
  if (issues.some((issue) => issue.code === "GROUP_INACTIVE")) {
    return {
      status: "archived",
      label: "Arşiv",
      whyAttention: issues.map((issue) => issue.description),
      issues,
    };
  }
  if (issues.some((issue) => issue.severity === "critical")) {
    return {
      status: "critical",
      label: "Kritik",
      whyAttention: issues
        .filter((issue) => issue.severity === "critical" || issue.severity === "warning")
        .map((issue) => issue.description),
      issues,
    };
  }
  if (issues.some((issue) => issue.severity === "warning")) {
    return {
      status: "attention",
      label: "Dikkat",
      whyAttention: issues
        .filter((issue) => issue.severity !== "info")
        .map((issue) => issue.description),
      issues,
    };
  }
  return {
    status: "ok",
    label: "Sorun yok",
    whyAttention: [],
    issues,
  };
}

export function deriveMemberRisk(input: {
  attendanceAbsentCount14d: number;
  attendanceTotalCount14d: number;
  daysSinceLastLogin: number | null;
  openHelpRequestCount: number;
}): { level: Group360MemberRisk; label: string } {
  let points = 0;
  if (input.attendanceTotalCount14d >= 2 && input.attendanceAbsentCount14d >= 2) {
    points += input.attendanceAbsentCount14d >= 3 ? 30 : 20;
  }
  if (input.daysSinceLastLogin != null && input.daysSinceLastLogin >= 14) {
    points += input.daysSinceLastLogin >= 21 ? 25 : 15;
  }
  if (input.openHelpRequestCount >= 1) points += 10;

  if (points >= 40) return { level: "high", label: "Yüksek" };
  if (points >= 20) return { level: "medium", label: "Orta" };
  if (points > 0) return { level: "low", label: "Düşük" };
  return { level: "none", label: "Yok" };
}

export function attendanceRate(presentLike: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((presentLike / total) * 100);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function weeklyLessonCount(lessons: Array<{ startsAt: Date }>, now = new Date()): number {
  const start = new Date(now);
  // Pazartesi 00:00 Istanbul yaklaşık — UTC offset farkı için haftalık pencere kullan
  const day = start.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return lessons.filter(
    (lesson) => lesson.startsAt >= start && lesson.startsAt < end,
  ).length;
}

export function rangesOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function classifyLessonConflict(input: {
  teacherId: string;
  groupId: string;
  otherTeacherId: string;
  otherGroupId: string;
}): ScheduleConflictKind[] {
  const kinds: ScheduleConflictKind[] = [];
  if (input.teacherId === input.otherTeacherId) kinds.push("TEACHER");
  if (input.groupId === input.otherGroupId) kinds.push("GROUP");
  return kinds;
}

export function buildTransferPreviewSummary(input: {
  targetGroupId: string;
  targetGroupName: string;
  capacity: number;
  activeCount: number;
  items: TransferPreviewItem[];
}): TransferPreviewSummary {
  const seatDemand = input.items.filter((item) => item.blockers.length === 0).length;
  const available = Math.max(0, input.capacity - input.activeCount);
  const capacityBlocksAll = seatDemand > available;
  const canExecute =
    input.items.length > 0 &&
    input.items.every((item) => item.blockers.length === 0) &&
    !capacityBlocksAll;

  const items = capacityBlocksAll
    ? input.items.map((item) =>
        item.blockers.some((blocker) => blocker.code === "TARGET_CAPACITY")
          ? item
          : {
              ...item,
              blockers: [
                ...item.blockers,
                {
                  code: "TARGET_CAPACITY" as const,
                  message: `Hedef grupta ${available} koltuk var; ${seatDemand} öğrenci taşınmak isteniyor.`,
                },
              ],
            },
      )
    : input.items;

  return {
    targetGroupId: input.targetGroupId,
    targetGroupName: input.targetGroupName,
    capacity: {
      active: input.activeCount,
      capacity: input.capacity,
      available,
    },
    canExecute:
      items.length > 0 &&
      items.every((item) => item.blockers.length === 0) &&
      seatDemand <= available,
    items,
    seatDemand,
  };
}

export const GROUP_360_OPS_STATUS_LABELS: Record<Group360OpsStatus, string> = {
  ok: "Sorun yok",
  attention: "Dikkat gerekli",
  critical: "Kritik sorun",
  archived: "Arşiv",
};

export const GROUP_360_MEMBER_RISK_LABELS: Record<Group360MemberRisk, string> = {
  none: "Risk yok",
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

export const SCHEDULE_CONFLICT_KIND_LABELS: Record<ScheduleConflictKind, string> = {
  TEACHER: "Öğretmen çakışması",
  GROUP: "Aynı grup çakışması",
  STUDENT: "Öğrenci çakışması",
};
