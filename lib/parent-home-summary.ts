type DigestSummary = {
  trendBand: string;
  goodThingOne: string;
  goodThingTwo: string;
  supportArea: string;
  homeQuestion: string;
};

export type ParentHomeHero = {
  title: string;
  description: string;
  actionLabel: string;
  actionText: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type ParentSecondaryMetrics = {
  attendance: string;
  planCompletion: string;
  lastExam: string;
};

export function buildParentHomeHero(input: {
  digest: DigestSummary | null;
  digestEnabled: boolean;
  hasCoaching: boolean;
  coachingHref: string;
}): ParentHomeHero {
  if (input.digest) {
    const supportMode = input.digest.trendBand === "BUILDING";
    if (supportMode) {
      return {
        title: "Küçük bir destek iyi olabilir",
        description: input.digest.supportArea,
        actionLabel: "Bu akşam sorabileceğiniz soru:",
        actionText: input.digest.homeQuestion,
      };
    }
    return {
      title: "Genel olarak yolunda",
      description: `${input.digest.goodThingOne} ${input.digest.goodThingTwo}`.trim(),
      actionLabel: "Durum",
      actionText: "Sizden aksiyon beklenmiyor.",
    };
  }

  if (input.hasCoaching) {
    return {
      title: input.digestEnabled ? "Haftalık özet henüz yayınlanmadı" : "Genel durum takibi",
      description: input.digestEnabled
        ? "Özet yayınlandığında burada tek bakışta görünecek."
        : "Bu hafta için sakin durum özeti mevcut değil.",
      actionLabel: "Bugün için tek adım",
      actionText: "Koçluk planındaki haftayı birlikte kontrol edin.",
      ctaLabel: "Koçluğu aç",
      ctaHref: input.coachingHref,
    };
  }

  return {
    title: input.digestEnabled ? "Haftalık özet henüz yayınlanmadı" : "Genel durum takibi",
    description: input.digestEnabled
      ? "Özet yayınlandığında burada tek bakışta görünecek."
      : "Bu hafta için sakin durum özeti mevcut değil.",
    actionLabel: "Durum",
    actionText: "Sizden aksiyon beklenmiyor.",
  };
}

export function buildParentSecondaryMetrics(input: {
  attendanceTotal: number;
  attendanceAttended: number;
  planDone: number;
  planTotal: number;
  latestExamNet: number | null;
}): ParentSecondaryMetrics {
  return {
    attendance: input.attendanceTotal
      ? `${input.attendanceAttended} / ${input.attendanceTotal}`
      : "—",
    planCompletion: input.planTotal ? `${input.planDone} / ${input.planTotal}` : "—",
    lastExam: input.latestExamNet !== null ? `${input.latestExamNet.toFixed(2)} net` : "—",
  };
}

export function withParentStudentContext(href: string, studentId: string | null): string {
  if (!studentId) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}studentId=${encodeURIComponent(studentId)}`;
}
