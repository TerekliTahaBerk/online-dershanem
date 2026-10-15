import assert from "node:assert/strict";
import test from "node:test";
import { assignBookletCode, bookletCodesOf, canonicalizeBookletAnswerKey, orderQuestionsForBooklet, parseBookletOrderTable, validateBookletOrders } from "./booklets";

/** Çoklu kitapçık (A kanonik; B–E sıra eşlemesi). */

const sections = [{ code: "MAT", title: "Matematik" }, { code: "FEN", title: "Fen Bilimleri" }];
const questions = [
  ...[1, 2, 3].map((n) => ({ id: `m${n}`, sectionId: "s-mat", sectionCode: "MAT", questionNumber: n })),
  ...[1, 2].map((n) => ({ id: `f${n}`, sectionId: "s-fen", sectionCode: "FEN", questionNumber: n })),
];
// B: MAT ters sıra (B1=A3, B2=A2, B3=A1), FEN yer değiştirmiş (B1=A2, B2=A1).
const bRows = [
  { bookletCode: "B", sectionCode: "MAT", bookletQuestionNumber: 1, canonicalQuestionNumber: 3, bookletPage: 2 },
  { bookletCode: "B", sectionCode: "MAT", bookletQuestionNumber: 2, canonicalQuestionNumber: 2, bookletPage: 2 },
  { bookletCode: "B", sectionCode: "MAT", bookletQuestionNumber: 3, canonicalQuestionNumber: 1, bookletPage: 3 },
  { bookletCode: "B", sectionCode: "FEN", bookletQuestionNumber: 1, canonicalQuestionNumber: 2, bookletPage: null },
  { bookletCode: "B", sectionCode: "FEN", bookletQuestionNumber: 2, canonicalQuestionNumber: 1, bookletPage: null },
];

test("geçerli B kitapçığı eşlemesi soru kimliklerine çözülür", () => {
  const result = validateBookletOrders(questions, bRows);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.orders.map((row) => [row.bookletCode, row.questionId, row.bookletQuestionNumber]), [["B", "m3", 1], ["B", "m2", 2], ["B", "m1", 3], ["B", "f2", 1], ["B", "f1", 2]]);
});

test("eksik, çift, aralık dışı, bilinmeyen bölüm ve A kitapçığı satırı hata verir", () => {
  const rows = [
    { bookletCode: "A", sectionCode: "MAT", bookletQuestionNumber: 1, canonicalQuestionNumber: 1, bookletPage: null },
    { bookletCode: "C", sectionCode: "MAT", bookletQuestionNumber: 1, canonicalQuestionNumber: 1, bookletPage: null },
    { bookletCode: "C", sectionCode: "MAT", bookletQuestionNumber: 2, canonicalQuestionNumber: 1, bookletPage: null },
    { bookletCode: "C", sectionCode: "MAT", bookletQuestionNumber: 9, canonicalQuestionNumber: 2, bookletPage: null },
    { bookletCode: "C", sectionCode: "TURKCE", bookletQuestionNumber: 1, canonicalQuestionNumber: 1, bookletPage: null },
  ];
  const codes = validateBookletOrders(questions, rows).issues.map((issue) => issue.code);
  for (const code of ["CANONICAL_BOOKLET", "DUPLICATE_CANONICAL", "OUT_OF_RANGE", "UNKNOWN_SECTION", "INCOMPLETE_BOOKLET"]) assert.ok(codes.includes(code), code);
});

test("kitapçık kodları A + eşlenmiş kitapçıklar; atama deterministik ve dengeli", () => {
  assert.deepEqual(bookletCodesOf([]), ["A"]);
  assert.deepEqual(bookletCodesOf([{ bookletCode: "C" }, { bookletCode: "B" }, { bookletCode: "B" }]), ["A", "B", "C"]);
  assert.equal(assignBookletCode("exam-1", "student-1", ["A"]), "A");
  const codes = ["A", "B", "C", "D"];
  assert.equal(assignBookletCode("exam-1", "student-1", codes), assignBookletCode("exam-1", "student-1", codes));
  const counts = new Map<string, number>();
  for (let index = 0; index < 400; index += 1) {
    const code = assignBookletCode("exam-1", `student-${index}`, codes);
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  for (const code of codes) assert.ok((counts.get(code) ?? 0) > 60, `${code}: ${counts.get(code)}`);
});

test("çözücü sırası: B kitapçığında bölüm içi sıra ve numara kitapçıktan, sayfa varsa kitapçıktan", () => {
  const { orders } = validateBookletOrders(questions, bRows);
  const ordered = orderQuestionsForBooklet(questions.map((question) => ({ ...question, bookletPage: 9 })), orders, "B");
  assert.deepEqual(ordered.map((row) => [row.id, row.displayNumber, row.bookletPage]), [["m3", 1, 2], ["m2", 2, 2], ["m1", 3, 3], ["f2", 1, null], ["f1", 2, null]]);
  const canonical = orderQuestionsForBooklet(questions.map((question) => ({ ...question, bookletPage: 9 })), orders, "A");
  assert.deepEqual(canonical.map((row) => [row.id, row.displayNumber, row.bookletPage]), [["m1", 1, 9], ["m2", 2, 9], ["m3", 3, 9], ["f1", 1, 9], ["f2", 2, 9]]);
});

test("B kitapçığına göre girilen cevap anahtarı kanonik numaraya çevrilir", () => {
  const { orders } = validateBookletOrders(questions, bRows);
  const result = canonicalizeBookletAnswerKey({ schemaVersion: "1.0", sections: [{ code: "MAT", answers: { "1": "C", "2": "B", "3": "A" } }] }, "B", questions, orders);
  assert.deepEqual(result, { ok: true, document: { schemaVersion: "1.0", sections: [{ code: "MAT", answers: { "3": "C", "2": "B", "1": "A" } }] } });
  assert.deepEqual(canonicalizeBookletAnswerKey({ sections: [{ code: "MAT", answers: { "1": "C" } }] }, "D", questions, orders), { ok: false, error: "D kitapçığının soru sırası tanımlı değil." });
});

test("kitapçık sıra tablosu: KİTAPÇIK;BÖLÜM;KİTAPÇIK NO;A NO[;SAYFA], başlık atlanır, satır hataları", () => {
  const parsed = parseBookletOrderTable("Kitapçık\tBölüm\tKitapçık no\tA no\tSayfa\nB\tMatematik\t1\t3\t2\nb\tMAT\t2\t2\nC\tFEN\tx\t1\nZ\tFEN\t1\t1", sections);
  assert.deepEqual(parsed.rows, [
    { bookletCode: "B", sectionCode: "MAT", bookletQuestionNumber: 1, canonicalQuestionNumber: 3, bookletPage: 2 },
    { bookletCode: "B", sectionCode: "MAT", bookletQuestionNumber: 2, canonicalQuestionNumber: 2, bookletPage: null },
  ]);
  assert.deepEqual(parsed.issues.map((issue) => [issue.line, issue.code]), [[4, "INVALID_NUMBER"], [5, "INVALID_BOOKLET"]]);
});

test("kitapçıkta karşılığı olmayan numara açık hata verir", () => {
  const { orders } = validateBookletOrders(questions, bRows);
  assert.deepEqual(canonicalizeBookletAnswerKey({ sections: [{ code: "MAT", answers: { "9": "A" } }] }, "B", questions, orders), { ok: false, error: "B kitapçığında karşılığı olmayan soru: MAT 9." });
});
