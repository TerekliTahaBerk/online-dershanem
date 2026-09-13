import assert from "node:assert/strict";
import test from "node:test";

import {
  DINO_AUDIENCE_ALLOWLIST,
  DINO_AUDIENCE_DENY_EMPHASIS,
  DINO_ALWAYS_DENIED_CATEGORIES,
  filterSourcesForAudience,
  isSourceAllowedForAudience,
  sourceKindFromId,
  teacherOnlySourceKinds,
} from "./dino-allowlist";
import {
  buildPlanDeterministicReason,
  buildReviewDeterministicReason,
  buildSubjectDeclineDeterministicReason,
  buildTeacherAttentionDeterministicReason,
  buildTeacherStudentRiskDeterministicReason,
} from "./dino-explanations";
import {
  DINO_MAX_SOURCES,
  dinoFallbackAnswer,
  dinoQuestionRequiresStudent,
  findDinoQuestion,
  validateDinoOutput,
} from "../dino";

/* ── Allowlist / rol izolasyonu ─────────────────────────────────────── */

test("veli öğretmen notu ve müdahale kaynağını alamaz", () => {
  for (const id of ["TEACHER_NOTE_1", "INTERVENTION_1", "ATTENTION", "HELP_1", "GROUP_SUMMARY"]) {
    assert.equal(isSourceAllowedForAudience(id, "PARENT"), false, id);
    assert.equal(isSourceAllowedForAudience(id, "STUDENT"), false, id);
    assert.equal(isSourceAllowedForAudience(id, "TEACHER"), true, id);
  }
});

test("öğrenci ve veli panel kaynaklarını alabilir; öğretmen-only süzülür", () => {
  const rows = [
    { id: "ATTENDANCE", label: "Katılım", text: "ok" },
    { id: "ASSIGNMENTS", label: "Ödev", text: "ok" },
    { id: "TEACHER_NOTE_1", label: "Not", text: "gizli" },
    { id: "PAYMENT", label: "Ödeme", text: "sızma" },
  ];
  const parent = filterSourcesForAudience(rows, "PARENT");
  assert.deepEqual(
    parent.map((row) => row.id),
    ["ATTENDANCE", "ASSIGNMENTS"],
  );
  assert.ok(!parent.some((row) => row.id.startsWith("TEACHER")));
});

test("bilinmeyen kaynak kimliği allowlist dışı kalır (fake citation öncesi)", () => {
  assert.equal(sourceKindFromId("UYDURMA_KAYNAK"), null);
  assert.equal(isSourceAllowedForAudience("UYDURMA_KAYNAK", "TEACHER"), false);
});

test("öğretmen-only türler veli allowlistinde yoktur", () => {
  for (const kind of teacherOnlySourceKinds()) {
    assert.equal(DINO_AUDIENCE_ALLOWLIST.PARENT.includes(kind), false, kind);
    assert.equal(DINO_AUDIENCE_ALLOWLIST.STUDENT.includes(kind), false, kind);
    assert.equal(DINO_AUDIENCE_ALLOWLIST.TEACHER.includes(kind), true, kind);
  }
});

test("her rol için gizlilik deny vurgusu tanımlı", () => {
  for (const audience of ["STUDENT", "PARENT", "TEACHER"] as const) {
    assert.ok(DINO_AUDIENCE_DENY_EMPHASIS[audience].length > 0);
  }
  assert.ok(DINO_ALWAYS_DENIED_CATEGORIES.includes("PAYMENT_INFO"));
  assert.ok(DINO_ALWAYS_DENIED_CATEGORIES.includes("OTHER_STUDENTS"));
  assert.ok(DINO_ALWAYS_DENIED_CATEGORIES.includes("ADMIN_ONLY_RISK_METADATA"));
});

/* ── Soru kapsamı / yatay erişim sözleşmesi ─────────────────────────── */

test("öğretmen roster soruları öğrenci kimliği istemez", () => {
  const today = findDinoQuestion("teacher_today", "TEACHER");
  const group = findDinoQuestion("teacher_group_week", "TEACHER");
  const risk = findDinoQuestion("teacher_student_risk", "TEACHER");
  assert.ok(today);
  assert.ok(group);
  assert.ok(risk);
  assert.equal(dinoQuestionRequiresStudent(today!), false);
  assert.equal(dinoQuestionRequiresStudent(group!), false);
  assert.equal(dinoQuestionRequiresStudent(risk!), true);
});

test("veli soruları öğrenci sorularından izole", () => {
  assert.equal(findDinoQuestion("teacher_today", "PARENT"), null);
  assert.equal(findDinoQuestion("parent_support", "STUDENT"), null);
  assert.ok(findDinoQuestion("parent_support", "PARENT"));
  assert.ok(findDinoQuestion("student_plan_why", "STUDENT"));
});

/* ── Grounding / boş bağlam / maliyet tavanı sabitleri ──────────────── */

test("uydurma citation reddedilir (unsupported claim)", () => {
  const result = validateDinoOutput(
    {
      text: "Son iki haftada ödevlerin çoğu gecikti ve bu yüzden plan değişti.",
      citations: ["FAKE_SOURCE"],
    },
    ["ASSIGNMENTS"],
  );
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "UNSUPPORTED_CITATION");
});

test("boş bağlam yedek yanıtı dürüstçe veri yok der", () => {
  const fallback = dinoFallbackAnswer({
    audience: "STUDENT",
    questionKey: "student_review",
    questionLabel: "Hangi konuları tekrar etmeliyim?",
    sources: [],
  });
  assert.match(fallback.text, /yeterli dayanak yok/i);
  assert.deepEqual(fallback.citations, ["NO_DATA"]);
});

test("maliyet ve bağlam üst sınırları tanımlı", () => {
  assert.ok(DINO_MAX_SOURCES >= 4 && DINO_MAX_SOURCES <= 12);
});

/* ── Deterministik açıklamalar (AI öncesi) ──────────────────────────── */

test("plan gerekçesi reason code'lardan üretilir", () => {
  assert.match(
    buildPlanDeterministicReason({
      taskCount: 5,
      topReasonCodes: ["REVIEW_DUE", "MISSED_LESSON"],
      changeRequestCategory: null,
      version: 1,
    }),
    /tekrar|telafi|5 görev/i,
  );
});

test("ders düşüşü deterministik cümle üretir", () => {
  assert.match(
    buildSubjectDeclineDeterministicReason({
      subject: "Matematik",
      previousNet: 18,
      latestNet: 12,
    }),
    /Matematik/,
  );
});

test("tekrar ve öğretmen dikkat cümleleri boş güvenli", () => {
  assert.match(buildReviewDeterministicReason({ dueCount: 0, titles: [] }), /yok/i);
  assert.match(
    buildTeacherAttentionDeterministicReason({ visibleCount: 0, topHeadlines: [] }),
    /yok/i,
  );
  assert.match(buildTeacherStudentRiskDeterministicReason([]), /yok/i);
});
