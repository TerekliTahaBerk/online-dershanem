/**
 * Gidişat analizleri — paylaşılan tip modeli.
 *
 * Akademik (deneme) + davranışsal (katılım / çalışma / plan) tek bundle.
 * Rol anlatımı ve veli gizlilik strip'i bu tipler üzerinden yapılır.
 */

export const PROGRESS_INSIGHT_SERIES_COLORS = [
  "#14976B",
  "#E0A34A",
  "#5C7BA6",
  "#9C5340",
  "#6B7A73",
] as const;

export type InsightAudience = "student" | "parent_calm" | "teacher" | "admin";

export type TrendDirection = "up" | "down" | "steady" | "limited";

export type NetTrendPoint = { label: string; net: number; takenAt?: string };

export type SubjectTrendSeries = {
  name: string;
  color: string;
  nets: Array<number | null>;
  direction: TrendDirection;
};

export type AreaHighlight = {
  subject: string;
  direction: TrendDirection;
  sentence: string;
};

export type RateStat = {
  /** 0–100 veya null (veri yok). */
  percent: number | null;
  numerator: number;
  denominator: number;
};

export type AcademicInsights = {
  examCount: number;
  netTrend: NetTrendPoint[];
  netDelta: number | null;
  subjectSeries: SubjectTrendSeries[];
  labels: string[];
  strengths: AreaHighlight[];
  supportAreas: AreaHighlight[];
  subjectCaption: string | undefined;
};

export type BehavioralInsights = {
  attendance: RateStat;
  assignments: RateStat;
  plan: RateStat;
};

export type ProgressInsightPeriod = {
  /** İnsan okunur dönem etiketi, örn. "Son 30 gün · son 6 deneme". */
  label: string;
  fromIso: string;
  toIso: string;
};

export type ProgressInsightBundle = {
  studentId: string;
  studentName: string;
  period: ProgressInsightPeriod;
  academic: AcademicInsights;
  behavioral: BehavioralInsights;
  /** Rol filtresi uygulanmış durum cümleleri. */
  narrative: string[];
  /** Veri hiç yoksa true — UI empty state gösterir. */
  isEmpty: boolean;
  /**
   * Öğretmen/admin için opsiyonel risk sinyali.
   * Veli `parent_calm` strip sonrası her zaman undefined.
   */
  riskHint?: string | null;
};

export type TeacherStudentGidisatRow = {
  studentId: string;
  studentName: string;
  classLevel: string | null;
  attendancePercent: number | null;
  assignmentPercent: number | null;
  planPercent: number | null;
  netDelta: number | null;
  declining: boolean;
  href: string;
  riskHint: string | null;
};

export type TeacherGidisatOverview = {
  period: ProgressInsightPeriod;
  studentCount: number;
  averages: {
    attendancePercent: number | null;
    assignmentPercent: number | null;
    planPercent: number | null;
    medianNetDelta: number | null;
  };
  declining: TeacherStudentGidisatRow[];
  rows: TeacherStudentGidisatRow[];
  narrative: string[];
};

export type AdminGidisatPanel = {
  attendancePercent: number | null;
  assignmentPercent: number | null;
  planPercent: number | null;
  /** Kohort medyan net değişimi; n < suppressMin ise null + suppressed. */
  medianNetDelta: number | null;
  pairedStudents: number;
  suppressed: boolean;
  sparkline: NetTrendPoint[];
  narrative: string[];
};
