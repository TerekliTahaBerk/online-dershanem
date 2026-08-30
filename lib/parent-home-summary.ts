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
  const attendanceRatio = ratio(input.attendanceAttended, input.attendanceTotal);
  const planRatio = ratio(input.planDone, input.planTotal);

  const hasAttendanceData = input.hasOD && input.attendanceTotal > 0;
  const hasPlanData = input.hasOK && input.planTotal > 0;
  const hasExamData = input.hasExamAccess && input.latestExamNet !== null;

  const expectedSignalCount = Number(input.hasOD) + Number(input.hasOK) + Number(input.hasExamAccess);
  const availableSignalCount = Number(hasAttendanceData) + Number(hasPlanData) + Number(hasExamData);
  const hasEnoughEvidence =
    expectedSignalCount <= 1 ? availableSignalCount >= 1 : availableSignalCount >= 2;

  const attendanceIssue =
    hasAttendanceData && input.attendanceTotal >= 6 && (attendanceRatio ?? 1) < 0.8;
  const planIssue = hasPlanData && input.planTotal >= 4 && (planRatio ?? 1) < 0.6;

  const evidence: string[] = [];
  if (hasAttendanceData) {
    evidence.push(`Son ${input.attendanceTotal} dersin ${input.attendanceAttended}'ine katıldı.`);
  }
  if (hasPlanData) {
    evidence.push(
      `Bu haftaki planın ${input.planDone} / ${input.planTotal} çalışması tamamlandı.`,
    );
  }
  if (hasExamData) {
    evidence.push(
      input.latestExamLabel
        ? `Son deneme (${input.latestExamLabel}) sonucu ${input.latestExamNet!.toFixed(2)} net.`
        : `Son deneme sonucu ${input.latestExamNet!.toFixed(2)} net.`,
    );
  }

  if (!hasEnoughEvidence) {
    const sourceCount = evidence.length;
    return {
      code: "LOW_DATA",
      title: "Bu hafta genel durum için henüz yeterli veri görünmüyor.",
      description:
        sourceCount === 0
          ? "Genel değerlendirme için bu hafta katılım, plan veya deneme verisi henüz oluşmadı."
          : "Şu an sınırlı sayıda sinyal var; genel değerlendirme için biraz daha veri oluşması gerekiyor.",
      evidence: evidence.slice(0, 2),
      hasEnoughEvidence: false,
      needsPlanSupport: false,
    };
  }

  if (attendanceIssue || planIssue) {
    let description = "Bu hafta birkaç noktaya dikkat etmek faydalı olabilir.";
    if (attendanceIssue && !planIssue && hasPlanData && (planRatio ?? 0) >= 0.6) {
      description = "Ders katılımında düşüş görünüyor; haftalık plan tarafı daha dengeli ilerliyor.";
    } else if (planIssue && !attendanceIssue && hasAttendanceData && (attendanceRatio ?? 0) >= 0.8) {
      description = "Ders katılımı düzenli; haftalık planda bekleyen çalışmalar var.";
    } else if (attendanceIssue && planIssue) {
      description = "Ders katılımı ve haftalık planda takip gerektiren noktalar var.";
    }
    return {
      code: "NEEDS_ATTENTION",
      title: "Bu hafta birkaç noktaya dikkat etmek faydalı olabilir.",
      description,
      evidence: evidence.slice(0, 3),
      hasEnoughEvidence: true,
      needsPlanSupport: planIssue,
    };
  }

  let description = "Bu hafta görünen sinyaller dengeli ilerliyor.";
  if (hasAttendanceData && hasPlanData) {
    description = "Ders katılımı ve haftalık plan düzenli ilerliyor.";
  } else if (hasAttendanceData) {
    description = "Ders katılımı düzenli görünüyor.";
  } else if (hasPlanData) {
    description = "Haftalık plan adımları düzenli ilerliyor.";
  } else if (hasExamData) {
    description = "Son deneme sonucu güncel ve izlenebilir durumda.";
  }

  return {
    code: "ON_TRACK",
    title: "Genel olarak düzenli ilerliyor.",
    description,
    evidence: evidence.slice(0, 3),
    hasEnoughEvidence: true,
    needsPlanSupport: false,
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

export function withParentStudentContext(href: string, studentId: string | null): string {
  if (!studentId) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}studentId=${encodeURIComponent(studentId)}`;
}
