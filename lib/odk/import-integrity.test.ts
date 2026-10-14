import assert from "node:assert/strict";
import test from "node:test";
import { previewAnswerKeyImport } from "./answer-key-import";
import { importTargetStateHash, previewOutcomeImport, resolveOutcomeCode, type OutcomeCatalogHit } from "./outcome-import";

/** P0-4 / P0-5 (docs/roadmaps/odk-exam-experience-overhaul.md). */

const slots = [
  { sectionCode: "MAT", questionNumber: 1 },
  { sectionCode: "FEN", questionNumber: 1 },
];

test("cevap anahtarı: desteklenmeyen şema sürümü hata verir", () => {
  const preview = previewAnswerKeyImport({ schemaVersion: "2.0", sections: [{ code: "MAT", answers: { "1": "A" } }, { code: "FEN", answers: { "1": "B" } }] }, slots);
  assert.equal(preview.issues[0]?.code, "UNSUPPORTED_SCHEMA_VERSION");
  assert.deepEqual(preview.mappings, []);
});

test("cevap anahtarı: 1.0 ve 1 şema sürümleri kabul edilir", () => {
  for (const schemaVersion of ["1.0", "1", undefined]) {
    const preview = previewAnswerKeyImport({ ...(schemaVersion ? { schemaVersion } : {}), sections: [{ code: "MAT", answers: { "1": "A" } }, { code: "FEN", answers: { "1": "B" } }] }, slots);
    assert.deepEqual(preview.issues, [], String(schemaVersion));
    assert.equal(preview.mappings.length, 2);
  }
});

test("cevap anahtarı: eksik, çift ve bilinmeyen soru satır bazlı raporlanır", () => {
  const preview = previewAnswerKeyImport({ sections: [{ code: "MAT", answers: { "1": "A", "2": "B" } }, { code: "MAT", answers: { "1": "C" } }] }, slots);
  assert.deepEqual(preview.issues.map((issue) => [issue.code, issue.sectionCode, issue.questionNumber]), [
    ["UNKNOWN_QUESTION", "MAT", 2],
    ["DUPLICATE_ANSWER", "MAT", 1],
    ["MISSING_ANSWER", "FEN", 1],
  ]);
});

const catalog: OutcomeCatalogHit[] = [
  { id: "mat-26", code: "K.1", title: "Mat 2026", subjectCode: "MAT", academicYear: 2026, versionStatus: "ACTIVE" },
  { id: "mat-25", code: "K.1", title: "Mat 2025", subjectCode: "MAT", academicYear: 2025, versionStatus: "ACTIVE" },
  { id: "fen-26", code: "K.1", title: "Fen 2026", subjectCode: "FEN", academicYear: 2026, versionStatus: "ACTIVE" },
  { id: "fen-only", code: "F.9", title: "Fen", subjectCode: "FEN", academicYear: 2026, versionStatus: "ACTIVE" },
  { id: "dup-a", code: "D.1", title: "A", subjectCode: "MAT", academicYear: 2026, versionStatus: "ACTIVE" },
  { id: "dup-b", code: "D.1", title: "B", subjectCode: "MAT", academicYear: 2026, versionStatus: "ACTIVE" },
];

test("kazanım kodu sorunun dersinden ve sınavın müfredat yılından çözülür", () => {
  assert.deepEqual(resolveOutcomeCode(catalog, "K.1", "MAT", 2025), { ok: true, hit: catalog[1] });
  assert.deepEqual(resolveOutcomeCode(catalog, "K.1", "MAT", null), { ok: true, hit: catalog[0] }); // en güncel yıl
  assert.deepEqual(resolveOutcomeCode(catalog, "K.1", "FEN", 2026), { ok: true, hit: catalog[2] });
});

test("başka dersin kazanımı reddedilir; aynı ders içinde belirsiz kod reddedilir", () => {
  assert.deepEqual(resolveOutcomeCode(catalog, "F.9", "MAT", 2026), { ok: false, code: "OUTCOME_SUBJECT_MISMATCH" });
  assert.deepEqual(resolveOutcomeCode(catalog, "D.1", "MAT", 2026), { ok: false, code: "AMBIGUOUS_OUTCOME_CODE" });
  assert.deepEqual(resolveOutcomeCode(catalog, "YOK", "MAT", 2026), { ok: false, code: "UNRESOLVED" });
});

test("ders eşlemesi bilinmeyen bölümde (katalogda o kodlu ders yok) aile kataloğu kullanılır", () => {
  assert.deepEqual(resolveOutcomeCode(catalog, "F.9", "SOSYAL", 2026), { ok: true, hit: catalog[3] });
});

test("kazanım önizlemesi ders uyuşmazlığını ve belirsizliği hata olarak raporlar", () => {
  const preview = previewOutcomeImport(
    { questions: [{ section: "MAT", question: 1, outcomes: [{ code: "F.9" }] }, { section: "FEN", question: 1, outcomes: [{ code: "K.1" }] }] },
    slots,
    catalog,
    { academicYear: 2026 },
  );
  assert.deepEqual(preview.issues.filter((issue) => issue.level === "error").map((issue) => [issue.code, issue.sectionCode]), [["OUTCOME_SUBJECT_MISMATCH", "MAT"]]);
});

test("kazanım önizlemesi geçerli satırda katalog kimliğini doğru dersten bağlar", () => {
  const preview = previewOutcomeImport({ questions: [{ section: "MAT", question: 1, outcomes: [{ code: "K.1" }] }, { section: "FEN", question: 1, outcomes: [{ code: "K.1" }, { code: "F.9", isPrimary: false }] }] }, slots, catalog, { academicYear: 2026 });
  assert.deepEqual(preview.issues.filter((issue) => issue.level === "error"), []);
  assert.deepEqual(preview.mappings.map((row) => row.outcomes.map((outcome) => outcome.catalogId)), [["mat-26"], ["fen-26", "fen-only"]]);
});

test("kazanım: desteklenmeyen şema sürümü hata verir", () => {
  const preview = previewOutcomeImport({ schemaVersion: "9", questions: [{ section: "MAT", question: 1, outcomes: [{ code: "K.1" }] }] }, slots, catalog);
  assert.equal(preview.issues[0]?.code, "UNSUPPORTED_SCHEMA_VERSION");
});

test("hedef durum hash'i soru sırası ve içeriğine duyarlıdır, kayıt sırasından bağımsızdır", () => {
  const a = importTargetStateHash([{ id: "q1", state: "A" }, { id: "q2", state: "B" }]);
  assert.equal(a, importTargetStateHash([{ id: "q2", state: "B" }, { id: "q1", state: "A" }]));
  assert.notEqual(a, importTargetStateHash([{ id: "q1", state: "A" }, { id: "q2", state: "C" }]));
  assert.notEqual(a, importTargetStateHash([{ id: "q1", state: "A" }]));
});
