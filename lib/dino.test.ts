import assert from "node:assert/strict";
import test from "node:test";

import {
  DINO_QUESTIONS,
  dinoFallbackAnswer,
  dinoQuestionsFor,
  findDinoQuestion,
  validateDinoOutput,
  type SafeDinoSource,
} from "./dino";

const sources = [
  { id: "ATTENDANCE", label: "Katılım", text: "6 dersin 5 tanesine katıldı." },
  { id: "PLAN_TASKS", label: "Plan", text: "12 görevin 8 tanesi tamamlandı." },
];
const allowed = sources.map((s) => s.id);

/* ── İzin listesi ──────────────────────────────────────────────────── */

test("soru anahtarı BAŞKA rolün sorusuysa çözülmez", () => {
  // Öğrenci, velinin sorusunu kullanamaz — rol sınırı katalogda da geçerli.
  assert.equal(findDinoQuestion("parent_week", "STUDENT"), null);
  assert.equal(findDinoQuestion("student_week", "PARENT"), null);
  assert.ok(findDinoQuestion("student_week", "STUDENT"));
});

test("tanımsız soru anahtarı çözülmez", () => {
  assert.equal(findDinoQuestion("'; DROP TABLE users; --", "STUDENT"), null);
  assert.equal(findDinoQuestion("", "TEACHER"), null);
});

test("her rolün en az bir sorusu var ve katalogda çakışan anahtar yok", () => {
  for (const audience of ["STUDENT", "PARENT", "TEACHER"] as const) {
    assert.ok(dinoQuestionsFor(audience).length > 0, audience);
  }
  const keys = DINO_QUESTIONS.map((q) => q.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("dahili explanation soruları çip listesine çıkmaz ama allowlistte kalır", () => {
  const studentChips = dinoQuestionsFor("STUDENT").map((item) => item.key);
  assert.equal(studentChips.includes("student_nba_reason"), false);
  assert.equal(studentChips.includes("student_odk_reason"), false);
  assert.ok(findDinoQuestion("student_nba_reason", "STUDENT"));
  assert.ok(findDinoQuestion("student_odk_reason", "STUDENT"));
  assert.ok(findDinoQuestion("student_plan_why", "STUDENT"));
  assert.ok(findDinoQuestion("parent_support", "PARENT"));
  assert.ok(findDinoQuestion("teacher_today", "TEACHER"));
});

/* ── Çıktı doğrulama ───────────────────────────────────────────────── */

test("geçerli yanıt kabul edilir", () => {
  const result = validateDinoOutput(
    { text: "Bu hafta derslerin çoğuna katıldın ve görevlerin çoğunu bitirdin.", citations: ["ATTENDANCE"] },
    allowed,
  );
  assert.equal(result.ok, true);
});

test("verilmeyen kaynağa atıf reddedilir", () => {
  // Modelin kaynak uydurması sessizce kabul edilmemeli.
  const result = validateDinoOutput(
    { text: "Bu hafta katılımın iyiydi ve planına uydun.", citations: ["UYDURMA_KAYNAK"] },
    allowed,
  );
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "UNSUPPORTED_CITATION");
});

test("tanı, sıralama ve garanti dili reddedilir", () => {
  for (const text of [
    "Öğrencide dikkat eksikliği tanısı düşünülebilir çünkü görevleri bitirmiyor.",
    "Sınıf sırası bakımından ortalamanın altında kalıyor bu dönem.",
    "Bu tempoyla sınavı kesin kazanacak, garanti verebilirim rahatlıkla.",
  ]) {
    const result = validateDinoOutput({ text, citations: ["ATTENDANCE"] }, allowed);
    assert.equal(result.ok, false, text);
    assert.equal(result.ok === false && result.reason, "UNSAFE_CONTENT");
  }
});

test("çıktıya bağlantı veya e-posta sızarsa reddedilir", () => {
  for (const text of [
    "Ayrıntılar için https://ornek.com/rapor adresine bakabilirsin hemen.",
    "Sorularını veli@ornek.com adresine iletebilirsin dilediğin zaman.",
  ]) {
    const result = validateDinoOutput({ text, citations: ["ATTENDANCE"] }, allowed);
    assert.equal(result.ok, false, text);
  }
});

test("şemaya uymayan çıktı reddedilir", () => {
  assert.equal(validateDinoOutput({ text: "kısa", citations: ["ATTENDANCE"] }, allowed).ok, false);
  assert.equal(validateDinoOutput({ text: "x".repeat(40) }, allowed).ok, false);
  assert.equal(validateDinoOutput(null, allowed).ok, false);
  // Fazladan alan kabul edilmez (strict şema).
  assert.equal(
    validateDinoOutput(
      { text: "x".repeat(40), citations: ["ATTENDANCE"], extra: "sizinti" },
      allowed,
    ).ok,
    false,
  );
});

/* ── Yedek yanıt ───────────────────────────────────────────────────── */

test("yedek yanıt yorum uydurmaz, kaynakları olduğu gibi listeler", () => {
  const safe: SafeDinoSource = {
    audience: "STUDENT",
    questionKey: "student_week",
    questionLabel: "Bu hafta nasıl gidiyorum?",
    sources,
  };
  const fallback = dinoFallbackAnswer(safe);
  assert.match(fallback.text, /açıklamayı şu anda hazırlayamadı/i);
  assert.ok(fallback.text.includes("6 dersin 5 tanesine katıldı."));
  assert.deepEqual(fallback.citations, ["ATTENDANCE", "PLAN_TASKS"]);
});

test("kaynak yokken yedek yanıt veri olmadığını söyler", () => {
  const fallback = dinoFallbackAnswer({
    audience: "PARENT",
    questionKey: "parent_week",
    questionLabel: "Çocuğum bu hafta nasıl gitti?",
    sources: [],
  });
  assert.match(fallback.text, /yeterli dayanak yok/i);
});
