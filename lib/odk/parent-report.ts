/**
 * DENEME LİGİ SADE RAPOR ÖZETİ (docs/panel-design-roadmap.md §11.7) — veli ve
 * personel rapor ekranının düz dil cümleleri. Karşılaştırma yalnız öğrencinin
 * KENDİ önceki denemesiyle yapılır (aynı tür varsa onunla); sıralama yok.
 */

export type ReportExam = { id: string; title: string; family: string; takenAt: Date; totalNet: number };
export type ReportTrend = { latestAccuracy: number; delta: number | null; questionCount: number };

export const WEAK_ACCURACY = 50;

const NET = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Son denemeyle aynı türdeki bir önceki deneme; yoksa herhangi bir önceki deneme. */
export function previousComparable(exams: readonly ReportExam[]): { latest: ReportExam; previous: ReportExam | null } | null {
  const sorted = [...exams].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const latest = sorted.at(-1);
  if (!latest) return null;
  const earlier = sorted.slice(0, -1);
  const sameFamily = earlier.filter((exam) => exam.family === latest.family).at(-1);
  return { latest, previous: sameFamily ?? earlier.at(-1) ?? null };
}

export function netChange(latest: ReportExam, previous: ReportExam | null): number | null {
  return previous ? Math.round((latest.totalNet - previous.totalNet) * 100) / 100 : null;
}

/** 1–3 kısa, yargılamayan cümle. */
export function reportSummarySentences(exams: readonly ReportExam[], trends: readonly ReportTrend[]): string[] {
  const pair = previousComparable(exams);
  if (!pair) return [];
  const { latest, previous } = pair;
  const sentences = [`Son denemede (${latest.title}) ${NET.format(latest.totalNet)} net yaptı.`];
  const change = netChange(latest, previous);
  if (previous && change !== null) {
    const sameFamily = previous.family === latest.family;
    const ref = sameFamily ? "aynı türdeki bir önceki denemesine" : "bir önceki denemesine";
    if (Math.abs(change) < 0.5) sentences.push(`Bu, ${ref} göre benzer bir düzey.`);
    else sentences.push(`Bu, ${ref} göre ${NET.format(Math.abs(change))} net ${change > 0 ? "daha yüksek" : "daha düşük"}.`);
  } else {
    sentences.push("Karşılaştırma için bir sonraki deneme beklenecek.");
  }
  const weak = trends.filter((trend) => trend.latestAccuracy < WEAK_ACCURACY).length;
  const improving = trends.filter((trend) => trend.delta !== null && trend.delta >= 10).length;
  if (weak) sentences.push(`${weak} kazanımda daha fazla çalışma faydalı olabilir${improving ? `; ${improving} kazanımda belirgin ilerleme var` : ""}.`);
  else if (improving) sentences.push(`${improving} kazanımda belirgin ilerleme var.`);
  return sentences;
}
