import { istanbulWeekStart } from "./istanbul-time";

export const CALM_DIGEST_RULE_VERSION = "calm-digest-v1";
export type DigestTrendBand = "IMPROVING" | "STEADY" | "BUILDING" | "LIMITED_DATA";

export function digestWeekStart(now = new Date()): Date {
  return istanbulWeekStart(now);
}

export function digestWeekWindow(now = new Date()) {
  const weekStart = digestWeekStart(now);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  return { weekStart, previousWeekStart, weekEnd };
}

export function buildCalmWeeklyDigest(input: {
  currentAttendance: { attended: number; total: number };
  previousAttendance: { attended: number; total: number };
  completedTaskCount: number;
  evidenceTitles: string[];
  reviewTitle?: string | null;
  dataThrough: Date;
  upcomingHint?: string | null;
}) {
  const currentRate = input.currentAttendance.total ? input.currentAttendance.attended / input.currentAttendance.total : null;
  const previousRate = input.previousAttendance.total ? input.previousAttendance.attended / input.previousAttendance.total : null;
  const trendBand: DigestTrendBand = currentRate === null ? "LIMITED_DATA" : previousRate !== null && currentRate > previousRate + 0.1 ? "IMPROVING" : currentRate >= 0.75 ? "STEADY" : "BUILDING";
  const goodThingOne = trendBand === "IMPROVING" ? "Derslere katılım ritmi geçen haftaya göre güçlendi." : trendBand === "STEADY" ? "Derslere katılım ritmini bu hafta büyük ölçüde korudu." : trendBand === "BUILDING" ? "Katıldığı derslerde öğrenme akışını sürdürdü; ritim adım adım kuruluyor." : "Bu haftanın verisi henüz sınırlı; yeni kayıtlar geldikçe eğilim netleşecek.";
  const uniqueEvidence = [...new Set(input.evidenceTitles)].slice(0, 2);
  const goodThingTwo = input.completedTaskCount > 0 ? `Planındaki ${input.completedTaskCount} küçük adımı tamamladı.` : uniqueEvidence.length ? `${uniqueEvidence.join(" ve ")} üzerinde çalıştı.` : "Yeni hafta için küçük ve uygulanabilir adımlar hazırlanıyor.";
  const supportArea = input.reviewTitle ? `${input.reviewTitle} için kısa bir tekrar, önümüzdeki haftanın yararlı küçük adımı olabilir.` : "Önümüzdeki hafta düzenli ve kısa çalışma aralıklarını korumak yeterli bir sonraki adım olabilir.";
  const homeQuestion = input.upcomingHint?.trim()
    ? input.upcomingHint.trim()
    : input.reviewTitle
      ? `“${input.reviewTitle} konusunda sana en çok hangi örnek yardımcı olur?” diye sorabilirsiniz.`
      : "“Bu hafta en rahat ilerlediğin küçük adım hangisiydi?” diye sorabilirsiniz.";
  return { trendBand, goodThingOne, goodThingTwo, supportArea, homeQuestion, dataThrough: input.dataThrough };
}
