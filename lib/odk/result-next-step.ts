import type { WeakOutcomeSignal } from "@/lib/odk/reporting";

export type ResultRecommendation = {
  tone: "primary" | "secondary";
  title: string;
  detail: string;
  actionLabel?: string;
  href?: string;
};

export function buildResultNextStepRecommendations(input: {
  weakOutcomeSignals: WeakOutcomeSignal[];
  hasOK: boolean;
  hasOD: boolean;
  hasPlan: boolean;
  answerKeyAvailable: boolean;
  answerKeyHref: string;
  reviewHref?: string;
  recoveryHref?: string;
}): ResultRecommendation[] {
  const topSignal = input.weakOutcomeSignals.find((signal) => signal.needsReview) || input.weakOutcomeSignals[0] || null;
  const recommendations: ResultRecommendation[] = [];
  if (topSignal && input.hasOK) {
    recommendations.push({
      tone: "primary",
      title: topSignal.title,
      detail: `${topSignal.previousAccuracy === null ? "İlk ölçümde tekrar gerektiriyor" : "Son ölçümlerde tekrar gerektiriyor"} · ${topSignal.questionCount} soru kanıtı${topSignal.confidence === "LOW" ? " · Az kanıt, yeni ölçümle netleşir" : ""}`,
      actionLabel: input.hasPlan ? "Planımı güncelle" : "Planıma ekle",
      href: "/panel/ogrenci/plan",
    });
  } else if (topSignal) {
    recommendations.push({
      tone: "primary",
      title: topSignal.title,
      detail: `${topSignal.previousAccuracy === null ? "İlk ölçüm sonucu" : "Son ölçüm eğilimi"} · ${topSignal.questionCount} soru kanıtı${topSignal.confidence === "LOW" ? " · Az kanıt" : ""}`,
      actionLabel: input.answerKeyAvailable ? "Cevap anahtarını aç" : undefined,
      href: input.answerKeyAvailable ? input.answerKeyHref : undefined,
    });
  }
  if (topSignal && input.hasOD && input.reviewHref && recommendations.length < 3) {
    recommendations.push({
      tone: "secondary",
      title: `${topSignal.title} tekrarı`,
      detail: "Hazır tekrar kuyruğuna dön",
      actionLabel: "Tekrarı aç",
      href: input.reviewHref,
    });
  }
  if (topSignal && input.hasOD && input.recoveryHref && recommendations.length < 3) {
    recommendations.push({
      tone: "secondary",
      title: "İlgili ders telafisi",
      detail: "Kazanıma bağlı ders özeti ve kaynaklar",
      actionLabel: "Telafiyi aç",
      href: input.recoveryHref,
    });
  }
  return recommendations.slice(0, 3);
}
