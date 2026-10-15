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

export type ResultSubtestRow = { code: string; title: string; questionCount: number; correct: number; wrong: number; blank: number; net: number };
export type ResultSectionRow = { sectionId?: string; code?: string; title?: string; net?: number; rawNet?: number; correct?: number; wrong?: number; blank?: number; questionCount?: number; subtests?: ResultSubtestRow[] };

/**
 * Saklı `sectionBreakdown` satırlarını okunur hâle getirir. Eski puanlamalar
 * bölüm kodunu yazmıyordu (P0-11): AYT "Benim alanım" görünümü bu yüzden boş
 * kalıyordu. Kod, sürümün bölüm kimliğinden tamamlanır; satırdaki kod yoksa.
 */
export function normalizeSectionBreakdown(raw: unknown, codeBySectionId: ReadonlyMap<string, string>): ResultSectionRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as ResultSectionRow;
    const code = typeof row.code === "string" && row.code ? row.code : row.sectionId ? codeBySectionId.get(row.sectionId) : undefined;
    return [{ ...row, ...(code ? { code } : {}) }];
  });
}

/** Alanın beklenen bölümlerinden D/Y/B/net; alan görünümü yoksa null. Beklenmeyen bölümün boşları sayılmaz. */
export function trackTotals(rows: readonly ResultSectionRow[], view: ResultTrackView): { correct: number; wrong: number; blank: number; net: number } | null {
  if (!view.sectionCodes) return null;
  const inTrackRows = rows.filter((row) => inTrack(view, row.code));
  const sum = (key: "correct" | "wrong" | "blank" | "net") => inTrackRows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  return { correct: sum("correct"), wrong: sum("wrong"), blank: sum("blank"), net: Math.round(sum("net") * 100) / 100 };
}

/** Bir kazanımı güvenilir yorumlamak için en az soru sayısı; altı "sınırlı kanıt" (P2-3). */
export const OUTCOME_EVIDENCE_MIN_QUESTIONS = 3;

export function outcomeEvidence(questionCount: number): { limited: boolean; label: string } {
  const limited = questionCount < OUTCOME_EVIDENCE_MIN_QUESTIONS;
  return { limited, label: `${questionCount} soru${limited ? " · sınırlı kanıt" : ""}` };
}

/** Güçlü alan sıralaması: yeterli kanıtlı kazanımlar önce, sonra doğruluk. */
export function compareStrongOutcomes(a: { accuracy: number; questionCount: number }, b: { accuracy: number; questionCount: number }): number {
  const limited = Number(outcomeEvidence(a.questionCount).limited) - Number(outcomeEvidence(b.questionCount).limited);
  return limited || b.accuracy - a.accuracy;
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
