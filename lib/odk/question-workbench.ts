/**
 * Soru tablosu yardımcıları (Faz 4): bölüm sekmesi + eksik filtresi + arama,
 * bölüm ilerlemesi, optik giriş klavyesi ve toplu PDF sayfası ataması. Saf;
 * yönetici editörü (istemci) kullanır.
 */

import { questionMatchesFilter, type QuestionFilter } from "./staff-workspace";

type WorkbenchQuestion = {
  id: string;
  sectionCode: string;
  questionNumber: number;
  correctOption: string | null;
  outcomeIds: string[];
  primaryOutcomeId: string | null;
  contentText?: string | null;
};

export type WorkbenchView = { filter: QuestionFilter; section: string | null; search: string };

/** Türkçe karakter ve büyük/küçük harf duyarsız karşılaştırma için. */
function fold(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function questionVisible(question: WorkbenchQuestion, view: WorkbenchView, outcomeLabels: ReadonlyMap<string, string>): boolean {
  if (view.section && question.sectionCode !== view.section) return false;
  if (!questionMatchesFilter(question, view.filter)) return false;
  const terms = fold(view.search).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = fold([question.sectionCode, String(question.questionNumber), question.contentText ?? "", ...question.outcomeIds.map((id) => outcomeLabels.get(id) ?? "")].join(" "));
  const tokens = new Set(haystack.split(/[^a-z0-9.]+/).filter(Boolean));
  // Sayı terimi soru numarasıyla TAM eşleşir ("12" → 112 değil); diğer terimler alt dizgi.
  return terms.every((term) => (/^\d+$/.test(term) ? String(question.questionNumber) === term : haystack.includes(term) || tokens.has(term)));
}

export function sectionProgress(questions: readonly WorkbenchQuestion[]) {
  const rows = new Map<string, { sectionCode: string; total: number; answered: number; withOutcome: number }>();
  for (const question of questions) {
    const row = rows.get(question.sectionCode) ?? { sectionCode: question.sectionCode, total: 0, answered: 0, withOutcome: 0 };
    row.total += 1;
    if (question.correctOption) row.answered += 1;
    if (question.primaryOutcomeId) row.withOutcome += 1;
    rows.set(question.sectionCode, row);
  }
  return [...rows.values()];
}

export type AnswerKeyAction = { type: "set"; option: "A" | "B" | "C" | "D" | "E"; advance: true } | { type: "clear" } | { type: "move"; delta: 1 | -1 };

/** Optik giriş satırında basılan tuşun anlamı; ilgisiz tuşlar için null (tarayıcıya bırakılır). */
export function keyToAnswerAction(key: string): AnswerKeyAction | null {
  const upper = key.length === 1 ? key.toUpperCase() : key;
  if (["A", "B", "C", "D", "E"].includes(upper)) return { type: "set", option: upper as "A" | "B" | "C" | "D" | "E", advance: true };
  if (key === "Backspace" || key === "Delete") return { type: "clear" };
  if (key === "ArrowDown") return { type: "move", delta: 1 };
  if (key === "ArrowUp") return { type: "move", delta: -1 };
  return null;
}

/** Seçili soruları (liste sırasıyla) başlangıç sayfasından itibaren, sayfa başına `perPage` soru olacak şekilde sayfalara dağıtır. */
export function fillBookletPages(orderedIds: readonly string[], selected: ReadonlySet<string>, startPage: number, perPage: number): Map<string, number> {
  const pages = new Map<string, number>();
  if (!Number.isInteger(startPage) || startPage < 1 || !Number.isInteger(perPage) || perPage < 1) return pages;
  let position = 0;
  for (const id of orderedIds) {
    if (!selected.has(id)) continue;
    pages.set(id, startPage + Math.floor(position / perPage));
    position += 1;
  }
  return pages;
}
