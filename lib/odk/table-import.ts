/**
 * Cevap anahtarı / kazanım TABLO içe aktarma (Faz 4 / P1-10). İstemcide çalışır:
 * CSV, TSV (Excel/Sheets'ten kopyala-yapıştır) ve optik satır biçimini, sunucunun
 * zaten doğruladığı sürümlü JSON belgesine çevirir. Satır numaralı hatalar
 * önizlemeden ÖNCE gösterilir; geçerli belge mevcut önizle → onayla akışından
 * (sürüm/hash/idempotency korumalı) geçer. Sunucuya yeni bir yazma yolu açılmaz.
 *
 * Desteklenen satırlar (boş satır ve `#` ile başlayan satırlar yok sayılır;
 * başlık satırı otomatik atlanır):
 *   - Cevap:   BÖLÜM ; SORU ; CEVAP           (ör. MAT	12	C)
 *   - Optik:   BÖLÜM ; HARFLER  ya da  BÖLÜM: HARFLER  (boşluk yok sayılır, "-" boş)
 *   - Kazanım: BÖLÜM ; SORU ; KOD [; ana|yan]  (aynı soru için birden çok satır)
 * Bölüm kodu ya da adı (Türkçe karakter ve büyük/küçük harf duyarsız) kabul edilir.
 */

import { ANSWER_KEY_SCHEMA_VERSION } from "./answer-key-import";

export type TableIssue = { line: number; code: string; message: string };
type SectionRef = { code: string; title: string };
type Option = "A" | "B" | "C" | "D" | "E";

const OPTIONS = new Set(["A", "B", "C", "D", "E"]);
const BLANK_MARKS = new Set(["-", "_", "."]);
const MAX_OUTCOMES_PER_QUESTION = 5;

/** Türkçe karakterleri sadeleştirip büyük harfe çevirir (Türkçe → TURKCE). */
export function normalizeToken(value: string): string {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function delimiterOf(line: string): string | null {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  if (line.includes(",")) return ",";
  return null;
}

/** Tek satırı alanlara böler; çift tırnaklı alanlarda ayırıcı ve "" kaçışı desteklenir. */
export function splitRow(line: string): string[] {
  const delimiter = delimiterOf(line);
  if (!delimiter) return [line.trim()];
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"' && current.trim() === "") {
      quoted = true;
      current = "";
    } else if (char === delimiter) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function sectionResolver(sections: readonly SectionRef[]) {
  const byToken = new Map<string, string>();
  for (const section of sections) {
    byToken.set(normalizeToken(section.code), section.code);
    byToken.set(normalizeToken(section.title), section.code);
  }
  return (value: string) => byToken.get(normalizeToken(value)) ?? null;
}

function lines(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((raw, index) => ({ raw, line: index + 1, trimmed: raw.trim() }))
    .filter((row) => row.trimmed && !row.trimmed.startsWith("#"));
}

const isQuestionNumber = (value: string) => /^\d{1,3}$/.test(value) && Number(value) >= 1;

export function parseAnswerKeyTable(text: string, sections: readonly SectionRef[]) {
  const resolve = sectionResolver(sections);
  const issues: TableIssue[] = [];
  const answers = new Map<string, Record<string, Option>>();
  const seenAt = new Map<string, number>();
  const rows = lines(text);
  const put = (code: string, questionNumber: number, option: Option, line: number) => {
    const key = `${code}:${questionNumber}`;
    if (seenAt.has(key)) {
      issues.push({ line, code: "DUPLICATE_ANSWER", message: `${code} ${questionNumber}. soru ${seenAt.get(key)}. satırda zaten girildi.` });
      return;
    }
    seenAt.set(key, line);
    const bucket = answers.get(code) ?? {};
    bucket[String(questionNumber)] = option;
    answers.set(code, bucket);
  };

  rows.forEach((row, index) => {
    const colon = /^([^:;\t,]+):\s*(.+)$/.exec(row.trimmed);
    const cells = colon ? [colon[1], colon[2]] : splitRow(row.raw);
    const code = resolve(cells[0] ?? "");
    // Başlık satırı: ilk satır, bölüm tanınmıyor ve ikinci alan sayı değil.
    if (index === 0 && !code && cells.length >= 2 && !isQuestionNumber(cells[1])) return;
    if (!code) {
      issues.push({ line: row.line, code: "UNKNOWN_SECTION", message: `Bilinmeyen bölüm: "${cells[0] ?? ""}".` });
      return;
    }
    if (cells.length >= 3) {
      if (!isQuestionNumber(cells[1])) {
        issues.push({ line: row.line, code: "INVALID_QUESTION_NUMBER", message: `Geçersiz soru numarası: "${cells[1]}".` });
        return;
      }
      const option = normalizeToken(cells[2]);
      if (!OPTIONS.has(option)) {
        issues.push({ line: row.line, code: "INVALID_OPTION", message: `Geçersiz cevap: "${cells[2]}" (A–E).` });
        return;
      }
      put(code, Number(cells[1]), option as Option, row.line);
      return;
    }
    // Optik satır: harf dizisi.
    const letters = (cells[1] ?? "").replace(/\s+/g, "");
    if (!letters) {
      issues.push({ line: row.line, code: "INVALID_OPTION", message: "Cevap dizisi boş." });
      return;
    }
    const invalid = [...letters].map((char, position) => ({ char, position })).filter(({ char }) => !OPTIONS.has(normalizeToken(char)) && !BLANK_MARKS.has(char));
    if (invalid.length) {
      issues.push({ line: row.line, code: "INVALID_OPTION", message: `Geçersiz karakter: ${invalid.map(({ char, position }) => `"${char}" (${position + 1}. soru)`).join(", ")}.` });
      return;
    }
    [...letters].forEach((char, position) => {
      if (!BLANK_MARKS.has(char)) put(code, position + 1, normalizeToken(char) as Option, row.line);
    });
  });

  if (!rows.length) issues.push({ line: 0, code: "EMPTY", message: "Yapıştırılan içerik boş." });
  const document = issues.length || !answers.size
    ? null
    : { schemaVersion: ANSWER_KEY_SCHEMA_VERSION, sections: [...answers].map(([code, map]) => ({ code, answers: map })) };
  return { document, issues, rowCount: rows.length };
}

export function parseOutcomeTable(text: string, sections: readonly SectionRef[]) {
  const resolve = sectionResolver(sections);
  const issues: TableIssue[] = [];
  const questions = new Map<string, { section: string; question: number; outcomes: Array<{ code: string; flag: "ana" | "yan" | null; line: number }> }>();
  const rows = lines(text);

  rows.forEach((row, index) => {
    const cells = splitRow(row.raw);
    const code = resolve(cells[0] ?? "");
    if (index === 0 && !code && !isQuestionNumber(cells[1] ?? "")) return;
    if (!code) {
      issues.push({ line: row.line, code: "UNKNOWN_SECTION", message: `Bilinmeyen bölüm: "${cells[0] ?? ""}".` });
      return;
    }
    if (!isQuestionNumber(cells[1] ?? "")) {
      issues.push({ line: row.line, code: "INVALID_QUESTION_NUMBER", message: `Geçersiz soru numarası: "${cells[1] ?? ""}".` });
      return;
    }
    const outcomeCode = (cells[2] ?? "").trim();
    if (!outcomeCode) {
      issues.push({ line: row.line, code: "OUTCOME_CODE_MISSING", message: "Kazanım kodu boş." });
      return;
    }
    const flagToken = normalizeToken(cells[3] ?? "");
    const flag = ["ANA", "1", "PRIMARY", "EVET"].includes(flagToken) ? "ana" : ["YAN", "0", "SECONDARY", "HAYIR"].includes(flagToken) ? "yan" : null;
    const key = `${code}:${Number(cells[1])}`;
    const bucket = questions.get(key) ?? { section: code, question: Number(cells[1]), outcomes: [] };
    if (bucket.outcomes.length >= MAX_OUTCOMES_PER_QUESTION) {
      issues.push({ line: row.line, code: "TOO_MANY_OUTCOMES", message: `Bir soruya en çok ${MAX_OUTCOMES_PER_QUESTION} kazanım bağlanabilir.` });
      return;
    }
    if (flag === "ana" && bucket.outcomes.some((outcome) => outcome.flag === "ana")) {
      issues.push({ line: row.line, code: "MULTIPLE_PRIMARY", message: `${code} ${bucket.question}. soruda birden çok ana kazanım işaretli.` });
      return;
    }
    bucket.outcomes.push({ code: outcomeCode, flag, line: row.line });
    questions.set(key, bucket);
  });

  if (!rows.length) issues.push({ line: 0, code: "EMPTY", message: "Yapıştırılan içerik boş." });
  const document = issues.length || !questions.size
    ? null
    : {
        schemaVersion: "1.0",
        questions: [...questions.values()].map((entry) => {
          const explicit = entry.outcomes.findIndex((outcome) => outcome.flag === "ana");
          const primaryIndex = explicit >= 0 ? explicit : 0;
          return { section: entry.section, question: entry.question, outcomes: entry.outcomes.map((outcome, position) => ({ code: outcome.code, isPrimary: position === primaryIndex })) };
        }),
      };
  return { document, issues, rowCount: rows.length };
}
