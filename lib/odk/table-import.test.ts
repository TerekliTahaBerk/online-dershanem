import assert from "node:assert/strict";
import test from "node:test";
import { parseAnswerKeyTable, parseOutcomeTable, splitRow } from "./table-import";
import { previewAnswerKeyImport } from "./answer-key-import";

/** Faz 4 / P1-10 — CSV, TSV (Excel'den yapıştırma) ve optik satır biçimleri. */

const sections = [
  { code: "TURKCE", title: "Türkçe" },
  { code: "MAT", title: "Temel Matematik" },
];

test("satır bölücü: sekme, noktalı virgül, virgül ve tırnaklı alan", () => {
  assert.deepEqual(splitRow("MAT\t1\tA"), ["MAT", "1", "A"]);
  assert.deepEqual(splitRow("MAT;1;A"), ["MAT", "1", "A"]);
  assert.deepEqual(splitRow('MAT,1,"K.1, ek"'), ["MAT", "1", "K.1, ek"]);
});

test("Excel'den yapıştırılan bölüm/soru/cevap tablosu (başlık satırıyla) belgeye dönüşür", () => {
  const result = parseAnswerKeyTable("Bölüm\tSoru\tCevap\nTürkçe\t1\ta\nTURKCE\t2\tB\nmat\t1\tE\n", sections);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.document, { schemaVersion: "1.0", sections: [{ code: "TURKCE", answers: { "1": "A", "2": "B" } }, { code: "MAT", answers: { "1": "E" } }] });
});

test("optik satır: bölüm ve harf dizisi; boşluk yok sayılır, '-' boş bırakır", () => {
  const result = parseAnswerKeyTable("TURKCE: ABCDE ABCDE\nMAT;AB-DE", sections);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.document?.sections, [
    { code: "TURKCE", answers: { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "A", "7": "B", "8": "C", "9": "D", "10": "E" } },
    { code: "MAT", answers: { "1": "A", "2": "B", "4": "D", "5": "E" } },
  ]);
});

test("satır bazlı hatalar: bilinmeyen bölüm, geçersiz soru/cevap, çift kayıt (satır numarasıyla)", () => {
  const result = parseAnswerKeyTable("FEN\t1\tA\nMAT\tx\tA\nMAT\t2\tF\nMAT\t3\tA\nMAT\t3\tB\nMAT: ABZ", sections);
  assert.deepEqual(result.issues.map((issue) => [issue.line, issue.code]), [
    [1, "UNKNOWN_SECTION"],
    [2, "INVALID_QUESTION_NUMBER"],
    [3, "INVALID_OPTION"],
    [5, "DUPLICATE_ANSWER"],
    [6, "INVALID_OPTION"],
  ]);
  assert.equal(result.document, null);
});

test("ayrıştırılan belge sunucu önizlemesiyle uyumludur (eksik soru sunucuda raporlanır)", () => {
  const result = parseAnswerKeyTable("MAT\t1\tA", sections);
  const preview = previewAnswerKeyImport(result.document, [{ sectionCode: "MAT", questionNumber: 1 }, { sectionCode: "MAT", questionNumber: 2 }]);
  assert.deepEqual(preview.issues.map((issue) => [issue.code, issue.questionNumber]), [["MISSING_ANSWER", 2]]);
});

test("boş girdi belge üretmez", () => {
  const result = parseAnswerKeyTable("\n  \n# not\n", sections);
  assert.equal(result.document, null);
  assert.equal(result.issues[0]?.code, "EMPTY");
});

test("kazanım tablosu: bir soruya birden çok satır; ilk satır ya da 'ana' işaretli satır ana kazanım", () => {
  const result = parseOutcomeTable("bölüm;soru;kazanım;tür\nMAT;1;K.1\nMAT;1;K.2\nMAT;2;K.3;yan\nMAT;2;K.4;ana\nTürkçe;1;T.1", sections);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.document, {
    schemaVersion: "1.0",
    questions: [
      { section: "MAT", question: 1, outcomes: [{ code: "K.1", isPrimary: true }, { code: "K.2", isPrimary: false }] },
      { section: "MAT", question: 2, outcomes: [{ code: "K.3", isPrimary: false }, { code: "K.4", isPrimary: true }] },
      { section: "TURKCE", question: 1, outcomes: [{ code: "T.1", isPrimary: true }] },
    ],
  });
});

test("kazanım tablosu hataları: eksik kod, iki ana kazanım, 5'ten fazla kazanım", () => {
  const rows = ["MAT;1;", "MAT;2;A;ana", "MAT;2;B;ana", ...Array.from({ length: 6 }, (_, index) => `MAT;3;C${index}`)];
  const result = parseOutcomeTable(rows.join("\n"), sections);
  assert.deepEqual(result.issues.map((issue) => [issue.line, issue.code]), [[1, "OUTCOME_CODE_MISSING"], [3, "MULTIPLE_PRIMARY"], [9, "TOO_MANY_OUTCOMES"]]);
  assert.equal(result.document, null);
});
