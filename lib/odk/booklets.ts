/**
 * Çoklu kitapçık (A/B/C/D/E) — saf kurallar.
 *
 * - A kitapçığı KANONİKTİR: soru kayıtlarının bölüm içi numarası A numarasıdır.
 * - B–E kitapçıkları, her bölümde kanonik soruların bir permütasyonudur
 *   (`OdkBookletQuestionOrder`). Cevaplar ve puanlar kanonik soru kimliğiyle
 *   saklanır; kitapçık yalnız sırayı, numarayı ve PDF'i değiştirir.
 * - Öğrenciye kitapçık deneme + öğrenci kimliğinden deterministik atanır:
 *   dengeli dağılır, yarış durumu yoktur, yeniden başlatmada değişmez.
 * İstemci ve sunucuda çalışır (Node'a özgü bağımlılık yok).
 */

import { normalizeToken, splitRow, type TableIssue } from "./table-import";

export const BOOKLET_CODES = ["A", "B", "C", "D", "E"] as const;
export const CANONICAL_BOOKLET = "A";

type CanonicalQuestion = { id: string; sectionId: string; sectionCode: string; questionNumber: number };
export type BookletOrderInput = { bookletCode: string; sectionCode: string; bookletQuestionNumber: number; canonicalQuestionNumber: number; bookletPage: number | null };
export type BookletOrder = { bookletCode: string; questionId: string; sectionId: string; bookletQuestionNumber: number; bookletPage: number | null };
export type BookletIssue = { code: string; message: string; bookletCode?: string; sectionCode?: string; bookletQuestionNumber?: number };

/** Kullanılabilir kitapçıklar: A + sırası tanımlı olanlar (alfabetik). */
export function bookletCodesOf(orders: ReadonlyArray<{ bookletCode: string }>): string[] {
  return [CANONICAL_BOOKLET, ...[...new Set(orders.map((row) => row.bookletCode))].filter((code) => code !== CANONICAL_BOOKLET).sort()];
}

/** FNV-1a 32 bit: kısa, platformdan bağımsız, dağılımı yeterli. */
function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function assignBookletCode(examId: string, studentUserId: string, codes: readonly string[]): string {
  if (codes.length <= 1) return codes[0] ?? CANONICAL_BOOKLET;
  return codes[fnv1a(`${examId}:${studentUserId}`) % codes.length];
}

/** Sıra tablosunu doğrular: her kitapçık her bölümde kanonik soruların tam permütasyonu olmalı. */
export function validateBookletOrders(questions: readonly CanonicalQuestion[], rows: readonly BookletOrderInput[]): { orders: BookletOrder[]; issues: BookletIssue[] } {
  const issues: BookletIssue[] = [];
  const bySection = new Map<string, CanonicalQuestion[]>();
  for (const question of questions) bySection.set(question.sectionCode, [...(bySection.get(question.sectionCode) ?? []), question]);
  const orders: BookletOrder[] = [];
  const seenNumber = new Set<string>();
  const seenCanonical = new Set<string>();
  for (const row of rows) {
    const where = { bookletCode: row.bookletCode, sectionCode: row.sectionCode, bookletQuestionNumber: row.bookletQuestionNumber };
    if (row.bookletCode === CANONICAL_BOOKLET) {
      issues.push({ code: "CANONICAL_BOOKLET", message: "A kitapçığı kanoniktir; sırası soru numaralarıdır, eşleme satırı girilmez.", ...where });
      continue;
    }
    if (!(BOOKLET_CODES as readonly string[]).includes(row.bookletCode)) {
      issues.push({ code: "INVALID_BOOKLET", message: `Geçersiz kitapçık: ${row.bookletCode} (B–E).`, ...where });
      continue;
    }
    const sectionQuestions = bySection.get(row.sectionCode);
    if (!sectionQuestions) {
      issues.push({ code: "UNKNOWN_SECTION", message: `Bilinmeyen bölüm: ${row.sectionCode}.`, ...where });
      continue;
    }
    const canonical = sectionQuestions.find((question) => question.questionNumber === row.canonicalQuestionNumber);
    if (!canonical || row.bookletQuestionNumber < 1 || row.bookletQuestionNumber > sectionQuestions.length) {
      issues.push({ code: "OUT_OF_RANGE", message: "Soru numarası bölüm aralığının dışında.", ...where });
      continue;
    }
    const numberKey = `${row.bookletCode}:${row.sectionCode}:${row.bookletQuestionNumber}`;
    const canonicalKey = `${row.bookletCode}:${canonical.id}`;
    if (seenNumber.has(numberKey)) {
      issues.push({ code: "DUPLICATE_BOOKLET_NUMBER", message: "Kitapçıkta aynı soru numarası iki kez kullanıldı.", ...where });
      continue;
    }
    if (seenCanonical.has(canonicalKey)) {
      issues.push({ code: "DUPLICATE_CANONICAL", message: `A kitapçığındaki ${row.canonicalQuestionNumber}. soru bu kitapçıkta iki kez eşlendi.`, ...where });
      continue;
    }
    seenNumber.add(numberKey);
    seenCanonical.add(canonicalKey);
    orders.push({ bookletCode: row.bookletCode, questionId: canonical.id, sectionId: canonical.sectionId, bookletQuestionNumber: row.bookletQuestionNumber, bookletPage: row.bookletPage });
  }
  for (const code of new Set(orders.map((row) => row.bookletCode))) {
    for (const [sectionCode, sectionQuestions] of bySection) {
      const mapped = orders.filter((row) => row.bookletCode === code && sectionQuestions.some((question) => question.id === row.questionId)).length;
      if (mapped !== sectionQuestions.length) issues.push({ code: "INCOMPLETE_BOOKLET", message: `${code} kitapçığında ${sectionCode} bölümünün ${sectionQuestions.length - mapped} sorusu eşlenmedi.`, bookletCode: code, sectionCode });
    }
  }
  return { orders: issues.length ? [] : orders, issues };
}

/**
 * Çözücü / sonuç için soruları kitapçığın sırasına dizer. Bölüm sırası korunur;
 * bölüm içinde kitapçık numarasına göre sıralanır. A (ya da sırası olmayan)
 * kitapçıkta kanonik sıra ve numara.
 */
export function orderQuestionsForBooklet<Q extends CanonicalQuestion & { bookletPage?: number | null }>(questions: readonly Q[], orders: readonly BookletOrder[], bookletCode: string): Array<Q & { displayNumber: number; bookletPage: number | null }> {
  const own = new Map(orders.filter((row) => row.bookletCode === bookletCode).map((row) => [row.questionId, row]));
  const sectionOrder = [...new Set(questions.map((question) => question.sectionCode))];
  return sectionOrder.flatMap((sectionCode) =>
    questions
      .filter((question) => question.sectionCode === sectionCode)
      .map((question) => {
        const order = own.get(question.id);
        return { ...question, displayNumber: order ? order.bookletQuestionNumber : question.questionNumber, bookletPage: order ? order.bookletPage : (question.bookletPage ?? null) };
      })
      .sort((a, b) => a.displayNumber - b.displayNumber),
  );
}

type AnswerKeyDoc = { schemaVersion?: string; examType?: string; sections: Array<{ code: string; answers: Record<string, string> }> };

/** Kitapçık numarasıyla girilmiş cevap anahtarını kanonik (A) numaraya çevirir. */
export function canonicalizeBookletAnswerKey(document: unknown, bookletCode: string, questions: readonly CanonicalQuestion[], orders: readonly BookletOrder[]): { ok: true; document: unknown } | { ok: false; error: string } {
  if (bookletCode === CANONICAL_BOOKLET) return { ok: true, document };
  const own = orders.filter((row) => row.bookletCode === bookletCode);
  if (!own.length) return { ok: false, error: `${bookletCode} kitapçığının soru sırası tanımlı değil.` };
  const doc = document as AnswerKeyDoc;
  if (!doc || !Array.isArray(doc.sections)) return { ok: true, document }; // biçim hatasını sunucu önizlemesi raporlar
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const canonicalBy = new Map(own.map((row) => [`${questionById.get(row.questionId)?.sectionCode}:${row.bookletQuestionNumber}`, questionById.get(row.questionId)?.questionNumber]));
  const unmapped = doc.sections.flatMap((section) => Object.keys(section.answers ?? {}).filter((number) => !canonicalBy.has(`${section.code}:${Number(number)}`)).map((number) => `${section.code} ${number}`));
  if (unmapped.length) return { ok: false, error: `${bookletCode} kitapçığında karşılığı olmayan soru: ${unmapped.slice(0, 10).join(", ")}.` };
  return {
    ok: true,
    document: {
      ...doc,
      sections: doc.sections.map((section) => ({
        ...section,
        answers: Object.fromEntries(Object.entries(section.answers ?? {}).map(([number, option]) => [String(canonicalBy.get(`${section.code}:${Number(number)}`)), option])),
      })),
    },
  };
}

/** Sıra tablosu: KİTAPÇIK ; BÖLÜM ; KİTAPÇIK SORU NO ; A SORU NO [; PDF SAYFA]. */
export function parseBookletOrderTable(text: string, sections: ReadonlyArray<{ code: string; title: string }>): { rows: BookletOrderInput[]; issues: TableIssue[] } {
  const sectionBy = new Map<string, string>();
  for (const section of sections) {
    sectionBy.set(normalizeToken(section.code), section.code);
    sectionBy.set(normalizeToken(section.title), section.code);
  }
  const rows: BookletOrderInput[] = [];
  const issues: TableIssue[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((raw, index) => ({ raw, line: index + 1 })).filter((row) => row.raw.trim() && !row.raw.trim().startsWith("#"));
  lines.forEach((row, index) => {
    const cells = splitRow(row.raw);
    const booklet = normalizeToken(cells[0] ?? "");
    const isNumber = (value: string | undefined) => /^\d{1,3}$/.test((value ?? "").trim()) && Number(value) >= 1;
    if (index === 0 && !(BOOKLET_CODES as readonly string[]).includes(booklet) && !isNumber(cells[2])) return; // başlık
    if (!(BOOKLET_CODES as readonly string[]).includes(booklet)) {
      issues.push({ line: row.line, code: "INVALID_BOOKLET", message: `Geçersiz kitapçık: "${cells[0] ?? ""}" (A–E).` });
      return;
    }
    const sectionCode = sectionBy.get(normalizeToken(cells[1] ?? ""));
    if (!sectionCode) {
      issues.push({ line: row.line, code: "UNKNOWN_SECTION", message: `Bilinmeyen bölüm: "${cells[1] ?? ""}".` });
      return;
    }
    if (!isNumber(cells[2]) || !isNumber(cells[3]) || (cells[4]?.trim() && !isNumber(cells[4]))) {
      issues.push({ line: row.line, code: "INVALID_NUMBER", message: "Kitapçık no, A no ve (varsa) sayfa pozitif tam sayı olmalı." });
      return;
    }
    rows.push({ bookletCode: booklet, sectionCode, bookletQuestionNumber: Number(cells[2]), canonicalQuestionNumber: Number(cells[3]), bookletPage: cells[4]?.trim() ? Number(cells[4]) : null });
  });
  if (!lines.length) issues.push({ line: 0, code: "EMPTY", message: "Yapıştırılan içerik boş." });
  return { rows, issues };
}
