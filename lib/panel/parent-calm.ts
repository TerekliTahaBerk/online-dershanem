/**
 * SAKİN VELİ PANELİ — saf domain mantığı.
 *
 * Ana soru: "Çocuğum nasıl gidiyor ve benim şu anda yapmam gereken bir şey var mı?"
 * Bu dosya veritabanına dokunmaz; cümleler ve aksiyon seçimi deterministiktir.
 * Risk skoru, teşhis veya soğuk sistem etiketi üretilmez.
 */

export type ParentCalmStatusCode = "ON_TRACK" | "NEEDS_SUPPORT" | "LIMITED_DATA";

export type ParentCalmActionKind =
  | "PACKAGE_RENEWAL"
  | "CONTACT_UPDATE"
  | "DIGEST_REVIEW"
  | "IMPORTANT_NOTICE";

export type ParentCalmAction = {
  id: string;
  kind: ParentCalmActionKind;
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
};

export type ParentSubjectTrend = {
  subject: string;
  direction: "up" | "down" | "steady" | "limited";
  sentence: string;
};

export type ParentCalmHome = {
  studentName: string;
  studentId: string;
  statusCode: ParentCalmStatusCode;
  statusLabel: string;
  statusSentence: string;
  weekSummary: string;
  thisWeek: {
    planLabel: string | null;
    attendanceLabel: string | null;
    assignmentsLabel: string | null;
    upcoming: Array<{ id: string; title: string; detail: string; href: string }>;
  };
  academic: {
    subjectTrends: ParentSubjectTrend[];
    examTrendSentence: string | null;
    strengths: string[];
    supportAreas: string[];
  };
  coaching: {
    available: boolean;
    weeklyGoal: string | null;
    planRealization: string | null;
    sharedNote: string | null;
    coachName: string | null;
    href: string;
  } | null;
  actions: ParentCalmAction[];
  digest: {
    available: boolean;
    href: string;
    preview: string | null;
    published: boolean;
  };
  dinoEnabled: boolean;
};

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function pct(numerator: number, denominator: number): number | null {
  const value = ratio(numerator, denominator);
  return value === null ? null : Math.round(value * 100);
}

export function subjectTrendDirection(nets: number[]): ParentSubjectTrend["direction"] {
  if (nets.length < 2) return "limited";
  const first = nets[0]!;
  const last = nets[nets.length - 1]!;
  const delta = last - first;
  if (delta >= 1.5) return "up";
  if (delta <= -1.5) return "down";
  return "steady";
}

export function buildSubjectTrendSentence(subject: string, nets: number[]): ParentSubjectTrend {
  const direction = subjectTrendDirection(nets);
  if (direction === "limited") {
    return {
      subject,
      direction,
      sentence: `${subject} için henüz yeterli deneme ölçümü yok.`,
    };
  }
  if (direction === "up") {
    return {
      subject,
      direction,
      sentence: `${subject} performansı yükseliyor.`,
    };
  }
  if (direction === "down") {
    return {
      subject,
      direction,
      sentence: `${subject} tarafında tekrar öneriliyor.`,
    };
  }
  return {
    subject,
    direction,
    sentence: `${subject} performansı dengeli ilerliyor.`,
  };
}

export function buildParentWeekSummary(input: {
  planDone: number;
  planTotal: number;
  subjectTrends: ParentSubjectTrend[];
  attendanceAttended: number;
  attendanceTotal: number;
  hasPlan: boolean;
  hasAttendance: boolean;
}): string {
  const parts: string[] = [];
  const planPct = pct(input.planDone, input.planTotal);

  if (input.hasPlan && planPct !== null) {
    parts.push(`Bu hafta planın %${planPct}'si tamamlandı.`);
  } else if (input.hasPlan) {
    parts.push("Bu hafta için plan henüz yayınlanmadı.");
  }

  const rising = input.subjectTrends.filter((item) => item.direction === "up").slice(0, 1);
  const needing = input.subjectTrends.filter((item) => item.direction === "down").slice(0, 1);
  for (const item of rising) parts.push(item.sentence);
  for (const item of needing) parts.push(item.sentence);

  if (!rising.length && !needing.length && input.hasAttendance && input.attendanceTotal > 0) {
    const attendancePct = pct(input.attendanceAttended, input.attendanceTotal);
    if (attendancePct !== null && attendancePct >= 80) {
      parts.push("Ders katılımı düzenli görünüyor.");
    } else if (attendancePct !== null && attendancePct < 70) {
      parts.push("Son iki haftada çalışma düzeninde düşüş var.");
    } else {
      parts.push("Katılım ritmi oluşmaya devam ediyor.");
    }
  }

  if (!parts.length) {
    return "Bu hafta için henüz yeterli veri oluşmadı; yeni kayıtlar geldikçe özet netleşecek.";
  }
  return parts.join(" ");
}

export function buildParentCalmStatus(input: {
  hasOD: boolean;
  hasOK: boolean;
  hasExamAccess: boolean;
  attendanceTotal: number;
  attendanceAttended: number;
  planDone: number;
  planTotal: number;
  hasExamData: boolean;
}): {
  code: ParentCalmStatusCode;
  label: string;
  sentence: string;
} {
  const attendanceRatio = ratio(input.attendanceAttended, input.attendanceTotal);
  const planRatio = ratio(input.planDone, input.planTotal);
  const hasAttendanceData = input.hasOD && input.attendanceTotal > 0;
  const hasPlanData = input.hasOK && input.planTotal > 0;
  const expected = Number(input.hasOD) + Number(input.hasOK) + Number(input.hasExamAccess);
  const available =
    Number(hasAttendanceData) + Number(hasPlanData) + Number(input.hasExamData);
  const enough = expected <= 1 ? available >= 1 : available >= 2;

  if (!enough) {
    return {
      code: "LIMITED_DATA",
      label: "Veri oluşuyor",
      sentence: "Genel durum için henüz yeterli sinyal yok; bu haftanın kayıtları tamamlandıkça netleşecek.",
    };
  }

  const attendanceIssue =
    hasAttendanceData && input.attendanceTotal >= 6 && (attendanceRatio ?? 1) < 0.8;
  const planIssue = hasPlanData && input.planTotal >= 4 && (planRatio ?? 1) < 0.6;

  if (attendanceIssue || planIssue) {
    let sentence = "Bu hafta birkaç noktaya birlikte bakmak faydalı olabilir.";
    if (attendanceIssue && !planIssue) {
      sentence = "Ders katılımında düşüş görünüyor; haftalık plan tarafı daha dengeli ilerliyor.";
    } else if (planIssue && !attendanceIssue) {
      sentence = "Ders katılımı düzenli; haftalık planda bekleyen çalışmalar var.";
    } else if (attendanceIssue && planIssue) {
      sentence = "Son iki haftada çalışma düzeninde düşüş var; kısa bir birlikte gözden geçirme yardımcı olabilir.";
    }
    return { code: "NEEDS_SUPPORT", label: "Biraz destek", sentence };
  }

  let sentence = "Bu hafta görünen sinyaller dengeli ilerliyor.";
  if (hasAttendanceData && hasPlanData) {
    sentence = "Ders katılımı ve haftalık plan düzenli ilerliyor.";
  } else if (hasAttendanceData) {
    sentence = "Ders katılımı düzenli görünüyor.";
  } else if (hasPlanData) {
    sentence = "Haftalık plan adımları düzenli ilerliyor.";
  } else if (input.hasExamData) {
    sentence = "Son deneme sonuçları izlenebilir durumda.";
  }
  return { code: "ON_TRACK", label: "Yolunda", sentence };
}

export function buildParentActions(input: {
  studentId: string;
  packageExpiring: { productLabel: string; daysLeft: number } | null;
  missingPhone: boolean;
  unreadDigest: boolean;
  importantNotice: { title: string; href: string } | null;
}): ParentCalmAction[] {
  const actions: ParentCalmAction[] = [];

  if (input.packageExpiring) {
    actions.push({
      id: "package-renewal",
      kind: "PACKAGE_RENEWAL",
      title: "Paket yenileme zamanı yaklaşıyor",
      body: `${input.packageExpiring.productLabel} erişimi yaklaşık ${input.packageExpiring.daysLeft} gün içinde sona erecek. Devam için hesap sayfasından görüşme talep edebilirsiniz.`,
      href: `/panel/veli/hesap?studentId=${encodeURIComponent(input.studentId)}`,
      ctaLabel: "Hesap ve paketi aç",
    });
  }

  if (input.missingPhone) {
    actions.push({
      id: "contact-update",
      kind: "CONTACT_UPDATE",
      title: "İletişim bilginizi güncelleyin",
      body: "Telefon numaranız kayıtlı değil. Önemli duyurularda size ulaşabilmemiz için güncellemeniz yeterli.",
      href: "/panel/veli/hesap",
      ctaLabel: "Hesabı aç",
    });
  }

  if (input.unreadDigest) {
    actions.push({
      id: "digest-review",
      kind: "DIGEST_REVIEW",
      title: "Yayınlanan haftalık özeti inceleyin",
      body: "Öğretmen bu haftanın sakin özetini yayınladı. Aynı metni öğrenciyle birlikte görebilirsiniz.",
      href: `/panel/veli/haftalik?studentId=${encodeURIComponent(input.studentId)}`,
      ctaLabel: "Haftalık özeti aç",
    });
  }

  if (input.importantNotice) {
    actions.push({
      id: "important-notice",
      kind: "IMPORTANT_NOTICE",
      title: "Önemli duyuru",
      body: input.importantNotice.title,
      href: input.importantNotice.href,
      ctaLabel: "Duyuruyu aç",
    });
  }

  return actions.slice(0, 3);
}

/** Veliye asla gösterilmeyen içerik kategorileri — dokümantasyon ve test için. */
export const PARENT_HIDDEN_CATEGORIES = [
  "teacher_private_lesson_notes",
  "coach_private_session_notes",
  "other_students",
  "internal_risk_scores",
  "intervention_case_notes",
  "commercial_internal_notes",
  "audit_logs",
  "student_check_in",
  "peer_comparisons",
] as const;

export type ParentHiddenCategory = (typeof PARENT_HIDDEN_CATEGORIES)[number];

export function withParentStudentContext(href: string, studentId: string | null): string {
  if (!studentId) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}studentId=${encodeURIComponent(studentId)}`;
}
