/**
 * Deneme Ligi öğrenci deneme durumu — tek kaynak (docs/panel-design-roadmap.md
 * §5.6, §11.1–11.2). Liste, Bugün ve ayrıntı sayfası aynı etiketi, tonu ve
 * hedef bağlantıyı buradan alır. Saf hesap: sunucunun `startDecision` ve
 * `resultAvailable` kararını yorumlar; yetki kararı vermez.
 */

export type StudentExamStateKey =
  | "IN_PROGRESS"
  | "AVAILABLE"
  | "UPCOMING"
  | "WAITING_RESULT"
  | "RESULT_RELEASED"
  | "MISSED"
  | "CLOSED";

export type StudentExamTab = "yaklasan" | "acik" | "tamamlanan";

export type StudentExamStateInput = {
  id: string;
  attempts: Array<{ status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "VOID" | "REVIEW_REQUIRED" }>;
  startDecision: { ok: true } | { ok: false; code: string };
  resultAvailable: boolean;
};

export type StudentExamState = {
  key: StudentExamStateKey;
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "critical";
  actionLabel: string;
  href: string;
  tab: StudentExamTab;
};

export function studentExamState(exam: StudentExamStateInput): StudentExamState {
  const base = `/panel/odk/ogrenci/denemeler/${exam.id}`;
  const attempt = exam.attempts[0];
  if (attempt?.status === "IN_PROGRESS") {
    return { key: "IN_PROGRESS", label: "Devam ediyor", tone: "warning", actionLabel: "Denemeye devam et", href: `${base}/coz`, tab: "acik" };
  }
  if (attempt && attempt.status !== "VOID") {
    return exam.resultAvailable
      ? { key: "RESULT_RELEASED", label: "Sonuç açıklandı", tone: "success", actionLabel: "Sonucu gör", href: `${base}/sonuc`, tab: "tamamlanan" }
      : { key: "WAITING_RESULT", label: "Sonuç bekleniyor", tone: "neutral", actionLabel: "Ayrıntı", href: base, tab: "tamamlanan" };
  }
  if (exam.startDecision.ok) {
    return { key: "AVAILABLE", label: "Başlayabilirsin", tone: "critical", actionLabel: "Denemeye git", href: base, tab: "acik" };
  }
  if (exam.startDecision.code === "NOT_STARTED") {
    return { key: "UPCOMING", label: "Yaklaşan", tone: "info", actionLabel: "Ayrıntı", href: base, tab: "yaklasan" };
  }
  // Pencere kapandı ve hiç (geçerli) deneme yok: kaçırıldı. Planlanmamış/iptal
  // durumları "Kapandı" olarak kalır.
  if (exam.startDecision.code === "EXAM_ENDED" || exam.startDecision.code === "ENTRY_CLOSED") {
    return { key: "MISSED", label: "Kaçırıldı", tone: "neutral", actionLabel: "Ayrıntı", href: base, tab: "tamamlanan" };
  }
  return { key: "CLOSED", label: "Kapandı", tone: "neutral", actionLabel: "Ayrıntı", href: base, tab: "tamamlanan" };
}

export type ReleasedResultRow = { examId: string; title: string; family: string; at: Date; net: number };

/**
 * Açıklanan sonuçlar, en yeni önce, her biri AYNI aileden (LGS/TYT/AYT) bir
 * önceki sonuca göre net farkıyla. Farklı aileler karşılaştırılmaz.
 */
export function releasedResultsWithDelta(rows: ReleasedResultRow[]): Array<ReleasedResultRow & { delta: number | null }> {
  const ascending = [...rows].sort((a, b) => a.at.getTime() - b.at.getTime());
  const lastByFamily = new Map<string, number>();
  const withDelta = ascending.map((row) => {
    const previous = lastByFamily.get(row.family);
    lastByFamily.set(row.family, row.net);
    return { ...row, delta: previous === undefined ? null : Math.round((row.net - previous) * 100) / 100 };
  });
  return withDelta.reverse();
}

/** AYT alanı → bölüm kodları (roadmap §11.5). DIL ve bilinmeyen alan için null: tüm bölümler. */
const AYT_TRACK_SECTIONS: Record<string, readonly string[]> = {
  SAY: ["MAT", "FEN"],
  EA: ["MAT", "EDB_SOS1"],
  SOZ: ["EDB_SOS1", "SOS2"],
};

export const AYT_TRACK_LABEL: Record<string, string> = { SAY: "Sayısal", EA: "Eşit ağırlık", SOZ: "Sözel" };

export function aytTrackSections(fieldTrack: string | null | undefined): readonly string[] | null {
  if (!fieldTrack) return null;
  return AYT_TRACK_SECTIONS[fieldTrack.toUpperCase()] ?? null;
}
