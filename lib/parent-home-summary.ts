/**
 * Geriye dönük uyumluluk: eski import yolları `lib/panel/parent-calm` mantığına
 * yönlendirilir. Yeni kod doğrudan parent-calm kullanmalıdır.
 */

import {
  buildParentCalmStatus,
  withParentStudentContext,
} from "@/lib/panel/parent-calm";

export { withParentStudentContext };

export type ParentHomeStatusCode = "ON_TRACK" | "NEEDS_ATTENTION" | "LOW_DATA";

export type ParentHomeStatusSummary = {
  code: ParentHomeStatusCode;
  title: string;
  description: string;
  evidence: string[];
  hasEnoughEvidence: boolean;
  needsPlanSupport: boolean;
};

export type ParentSecondaryMetric = {
  id: "attendance" | "plan" | "exam";
  label: string;
  value: string;
  description?: string;
};

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function buildParentHomeStatus(input: {
  hasOD: boolean;
  hasOK: boolean;
  hasExamAccess: boolean;
  attendanceTotal: number;
  attendanceAttended: number;
  planDone: number;
  planTotal: number;
  latestExamNet: number | null;
  latestExamLabel?: string | null;
}): ParentHomeStatusSummary {
  const calm = buildParentCalmStatus({
    hasOD: input.hasOD,
    hasOK: input.hasOK,
    hasExamAccess: input.hasExamAccess,
    attendanceTotal: input.attendanceTotal,
    attendanceAttended: input.attendanceAttended,
    planDone: input.planDone,
    planTotal: input.planTotal,
    hasExamData: input.latestExamNet !== null,
  });

  const planRatio = ratio(input.planDone, input.planTotal);
  const hasAttendanceData = input.hasOD && input.attendanceTotal > 0;
  const hasPlanData = input.hasOK && input.planTotal > 0;
  const planIssue = hasPlanData && input.planTotal >= 4 && (planRatio ?? 1) < 0.6;

  const evidence: string[] = [];
  if (hasAttendanceData) {
    evidence.push(`Son ${input.attendanceTotal} dersin ${input.attendanceAttended}'ine katıldı.`);
  }
  if (hasPlanData) {
    evidence.push(`Bu haftaki planın ${input.planDone} / ${input.planTotal} çalışması tamamlandı.`);
  }
  if (input.latestExamNet !== null) {
    evidence.push(
      input.latestExamLabel
        ? `Son deneme (${input.latestExamLabel}) sonucu ${input.latestExamNet.toFixed(2)} net.`
        : `Son deneme sonucu ${input.latestExamNet.toFixed(2)} net.`,
    );
  }

  const code: ParentHomeStatusCode =
    calm.code === "ON_TRACK"
      ? "ON_TRACK"
      : calm.code === "NEEDS_SUPPORT"
        ? "NEEDS_ATTENTION"
        : "LOW_DATA";

  return {
    code,
    title:
      calm.code === "ON_TRACK"
        ? "Genel olarak düzenli ilerliyor."
        : calm.code === "NEEDS_SUPPORT"
          ? "Bu hafta birkaç noktaya dikkat etmek faydalı olabilir."
          : "Bu hafta genel durum için henüz yeterli veri görünmüyor.",
    description: calm.sentence,
    evidence: evidence.slice(0, 3),
    hasEnoughEvidence: calm.code !== "LIMITED_DATA",
    needsPlanSupport: planIssue,
  };
}

export function buildParentSecondaryMetrics(input: {
  hasOD: boolean;
  hasOK: boolean;
  hasExamAccess: boolean;
  attendanceTotal: number;
  attendanceAttended: number;
  planDone: number;
  planTotal: number;
  latestExamNet: number | null;
  latestExamLabel?: string | null;
}): ParentSecondaryMetric[] {
  const metrics: ParentSecondaryMetric[] = [];

  if (input.hasOD && input.attendanceTotal > 0) {
    metrics.push({
      id: "attendance",
      label: `Son ${input.attendanceTotal} derste katılım`,
      value: `${input.attendanceAttended} / ${input.attendanceTotal}`,
      description: `%${Math.round((input.attendanceAttended / input.attendanceTotal) * 100)}`,
    });
  }

  if (input.hasOK && input.planTotal > 0) {
    metrics.push({
      id: "plan",
      label: "Bu haftaki plan",
      value: `${input.planDone} / ${input.planTotal}`,
      description: "çalışma tamamlandı",
    });
  }

  if (input.hasExamAccess && input.latestExamNet !== null) {
    metrics.push({
      id: "exam",
      label: input.latestExamLabel ? `Son deneme · ${input.latestExamLabel}` : "Son deneme",
      value: `${input.latestExamNet.toFixed(2)} net`,
    });
  }

  return metrics;
}
