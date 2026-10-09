/**
 * Deneme Ligi öğrenci SONUÇ görünümü — saf sunum kuralları TEK yerde. Web
 * sonuç sayfası ve mobil sonuç projeksiyonu (`lib/mobile/odk-views.ts`) aynı
 * fonksiyonları kullanır; istemci (mobil) bu kuralları yeniden yazmaz.
 */
import { AYT_TRACK_LABEL, aytTrackSections } from "@/lib/odk/student-exam-state";
import type { WeakOutcomeSignal } from "@/lib/odk/reporting";

/** "Güçlü" eşiği (web ile aynı): doğruluk ≥ %70 ve tekrar sinyali yok. */
export const STRONG_OUTCOME_ACCURACY = 70;

export type ResultTrackView = {
  /** AYT ve öğrencinin alanı biliniyorsa bölüm kodları; aksi halde null (tüm bölümler). */
  sectionCodes: readonly string[] | null;
  track: string | null;
  label: string | null;
};

export function resultTrackView(familyCode: string, fieldTrack: string | null | undefined): ResultTrackView {
  const sectionCodes = familyCode.startsWith("AYT") ? aytTrackSections(fieldTrack) : null;
  const track = sectionCodes && fieldTrack ? fieldTrack.toUpperCase() : null;
  return { sectionCodes, track, label: track ? (AYT_TRACK_LABEL[track] ?? null) : null };
}

export function inTrack(view: ResultTrackView, code: string | undefined | null): boolean {
  if (!view.sectionCodes) return true;
  return code ? view.sectionCodes.includes(code) : false;
}

export function classifyOutcome(accuracy: number, signal: Pick<WeakOutcomeSignal, "needsReview"> | null): "strong" | "improve" {
  return accuracy >= STRONG_OUTCOME_ACCURACY && !signal?.needsReview ? "strong" : "improve";
}

/** Aynı aileden bir önceki açıklanmış denemeye göre net farkı (karşılaştırma eskiden yeniye sıralı). */
export function previousComparableDelta(
  comparison: ReadonlyArray<{ examId: string; title: string; totalNet: number }>,
  examId: string,
  totalNet: number,
): { delta: number | null; previousTitle: string | null } {
  const index = comparison.findIndex((item) => item.examId === examId);
  const previous = index > 0 ? comparison[index - 1] : null;
  return previous
    ? { delta: Math.round((totalNet - previous.totalNet) * 100) / 100, previousTitle: previous.title }
    : { delta: null, previousTitle: null };
}
