import type { WeakOutcomeSignal } from "@/lib/odk/reporting";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";

const TR_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const TR_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function sameIstanbulDay(left: Date, right: Date) {
  return TR_DAY.format(left) === TR_DAY.format(right);
}

export type HomeExplanationSignal =
  | { kind: "LESSON"; startsAt: Date }
  | { kind: "RECOVERY"; dueAt: Date }
  | { kind: "PLAN_TASK"; scheduledFor: Date };

export const PLAN_REASON_LABELS: Record<string, string> = {
  DUE_SOON: "yaklaşan teslim tarihi",
  REVIEW_DUE: "tekrar zamanının gelmesi",
  NEEDS_REVIEW: "kazanım tekrarı ihtiyacı",
  EXAM_APPROACHING: "yaklaşan sınav",
  CAPACITY_BALANCE: "haftalık kapasite dengesi",
  MISSED_LESSON: "kaçırılan ders telafisi",
};

export function buildHomeDeterministicReason(signal: HomeExplanationSignal, now: Date): string {
  if (signal.kind === "LESSON") {
    return `Bugün saat ${TR_TIME.format(signal.startsAt)}'te başlayacağı için.`;
  }
  if (signal.kind === "RECOVERY") {
    return sameIstanbulDay(signal.dueAt, now)
      ? "Son tarihi bugün olduğu için."
      : "Kaçırdığın dersin telafi süresi devam ettiği için.";
  }
  return `Bugün saat ${TR_TIME.format(signal.scheduledFor)} için planlandığı için.`;
}

export function buildOutcomeDeterministicReason(signal: WeakOutcomeSignal): string {
  if (signal.previousAccuracy !== null && signal.delta !== null && signal.delta < 0) {
    return `Son ölçümde doğruluk ${Math.abs(signal.delta).toLocaleString("tr-TR")} puan düştüğü için.`;
  }
  if (signal.latestAccuracy < 60) {
    return `Son ölçümde doğruluk oranı %${signal.latestAccuracy.toLocaleString("tr-TR")} olduğu için.`;
  }
  return `${signal.questionCount} soruluk kanıtta tekrar ihtiyacı göründüğü için.`;
}

export function buildPlanDeterministicReason(input: {
  taskCount: number;
  topReasonCodes: string[];
  changeRequestCategory: string | null;
  version: number;
}): string {
  if (input.changeRequestCategory) {
    return "Değişiklik talebin üzerine plan yeniden düzenlendi.";
  }
  if (input.version > 1 && input.topReasonCodes.length) {
    const labels = input.topReasonCodes
      .slice(0, 2)
      .map((code) => PLAN_REASON_LABELS[code] || code)
      .join(" ve ");
    return `Plan ${input.version}. sürüm; öncelikler ${labels} kayıtlarına dayanıyor.`;
  }
  if (input.topReasonCodes.length) {
    const labels = input.topReasonCodes
      .slice(0, 2)
      .map((code) => PLAN_REASON_LABELS[code] || code)
      .join(" ve ");
    return `Bu haftaki ${input.taskCount} görev; ${labels} kayıtlarından seçildi.`;
  }
  return input.taskCount
    ? `Bu hafta planda ${input.taskCount} görev görünüyor.`
    : "Bu hafta için henüz plan görevi yok.";
}

export function buildSubjectDeclineDeterministicReason(input: {
  subject: string;
  previousNet: number;
  latestNet: number;
}): string {
  const delta = Math.round((input.latestNet - input.previousNet) * 100) / 100;
  return `${input.subject} neti son iki denemede ${input.previousNet.toLocaleString("tr-TR")} → ${input.latestNet.toLocaleString("tr-TR")} (${delta.toLocaleString("tr-TR")}).`;
}

export function buildReviewDeterministicReason(input: {
  dueCount: number;
  titles: string[];
}): string {
  if (!input.dueCount) return "Şu an vadesi gelen tekrar maddesi yok.";
  const sample = input.titles.slice(0, 2).join(", ");
  return input.dueCount === 1
    ? `Tekrar kuyruğunda 1 madde var${sample ? `: ${sample}` : ""}.`
    : `Tekrar kuyruğunda ${input.dueCount} madde var${sample ? `; örnek: ${sample}` : ""}.`;
}

export function buildTeacherAttentionDeterministicReason(input: {
  visibleCount: number;
  topHeadlines: string[];
}): string {
  if (!input.visibleCount) {
    return "Bugün dikkat gerektiren açık bir öğrenci sinyali yok.";
  }
  const sample = input.topHeadlines.slice(0, 2).join("; ");
  return `Bugün ${input.visibleCount} dikkat maddesi var${sample ? `: ${sample}` : ""}.`;
}

export function buildTeacherStudentRiskDeterministicReason(reasons: string[]): string {
  if (!reasons.length) return "Bu öğrenci için panelde açık bir risk gerekçesi yok.";
  return reasons.slice(0, 3).join(" ");
}
