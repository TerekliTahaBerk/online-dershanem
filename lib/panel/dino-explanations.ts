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

