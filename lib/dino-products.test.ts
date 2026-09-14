import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  DINO_ALL_PRODUCTS,
  DINO_COHORT_PRODUCTS,
  DINO_QUESTIONS,
  DINO_SELF_STUDY_PRODUCTS,
  dinoFallbackAnswer,
  dinoQuestionAppliesToProducts,
  dinoQuestionsFor,
  dinoQuestionsForProducts,
  findDinoQuestion,
  validateDinoOutput,
  type DinoAudience,
} from "./dino";
import {
  DINO_ALWAYS_DENIED_CATEGORIES,
  DINO_AUDIENCE_ALLOWLIST,
  DINO_SOURCE_KINDS,
  filterSourcesForAudience,
  teacherOnlySourceKinds,
} from "./panel/dino-allowlist";
import { isParentVisibleProduct, parentVisibleProducts } from "./products/parent-visibility";

/**
 * DINO AI × ÜRÜN KAPSAMI (KPSS Görev 7).
 *
 * Dino'nun tasarımı değişmedi: kapalı soru kataloğu, deterministik özet birincil,
 * model isteğe bağlı. Bu dosya yalnız ŞU soruyu yanıtlar: hangi soru hangi ürün
 * bağlamında var olabilir ve K-12'ye özgü yüzeyler (veli, koç, roster, yoklama)
 * KPSS'ye sızıyor mu?
 */

const KPSS = "KPSS";

/* ── Adım 1 · katalog ürün-bazlı ─────────────────────────────────────── */

test("her soru ürün kapsamını AÇIKÇA yazar ve bilinmeyen ürün kodu kullanmaz", () => {
  const known = new Set<string>(DINO_ALL_PRODUCTS);
  for (const question of DINO_QUESTIONS) {
    assert.ok(question.applicableProducts.length > 0, `${question.key} ürünsüz`);
    for (const code of question.applicableProducts) {
      assert.ok(known.has(code), `${question.key} bilinmeyen ürün: ${code}`);
    }
  }
});

test("KPSS'ye açık sorular yalnız sınav · kazanım · plan kapsamlarından gelir", () => {
  // (a) kategorisi: LAST_EXAM / SUBJECT_TREND / OUTCOMES / PLAN / REVIEW kökenli.
  const kpssScopes = new Set(
    DINO_QUESTIONS.filter((q) => q.applicableProducts.includes(KPSS)).map((q) => q.scope),
  );
  assert.deepEqual(
    [...kpssScopes].sort(),
    ["LAST_EXAM", "PLAN", "REVIEW", "SUBJECT_TREND"],
  );

  // (b) kategorisi: K-12/Koçum'a özgü kapsamlar KPSS'de HİÇ tanımlı değil.
  for (const scope of ["WEEK", "COACHING", "TEACHER_ATTENTION", "GROUP_WEEK", "MEETING_DRAFT"]) {
    assert.equal(kpssScopes.has(scope as never), false, scope);
  }
});

test("KPSS-only öğrenci menüsü: yalnız (a) kategorisi döner", () => {
  const menu = dinoQuestionsForProducts("STUDENT", [KPSS]).map((q) => q.key);
  assert.deepEqual(menu, [
    "student_week_focus",
    "student_subject_trend",
    "student_review",
    "student_plan_why",
    "student_exam",
  ]);
  // Yoklama/ödev (WEEK) ve koç görüşmesi (COACHING) kökenli sorular yok.
  assert.equal(menu.includes("student_week"), false);
  assert.equal(menu.includes("student_focus"), false);
});

test("KPSS bağlamında veli ve öğretmen menüsü BOŞTUR", () => {
  assert.deepEqual(dinoQuestionsForProducts("PARENT", [KPSS]), []);
  assert.deepEqual(dinoQuestionsForProducts("TEACHER", [KPSS]), []);
});

test("mevcut ürünlerin (OD/OK/ODK) menüsü değişmedi", () => {
  // Görev 7 ÖNCESİ katalog — bu liste değişirse mevcut ürünler regresyona uğramıştır.
  const before: Record<DinoAudience, string[]> = {
    STUDENT: [
      "student_week_focus",
      "student_subject_trend",
      "student_review",
      "student_plan_why",
      "student_exam",
      "student_week",
      "student_focus",
    ],
    PARENT: ["parent_week", "parent_support", "parent_exam"],
    TEACHER: [
      "teacher_today",
      "teacher_student_risk",
      "teacher_group_week",
      "teacher_meeting",
      "teacher_prep",
      "teacher_week",
    ],
  };

  for (const audience of ["STUDENT", "PARENT", "TEACHER"] as const) {
    // Tek ürün, ürün demeti ve KPSS ile karışık demet: üçünde de aynı menü.
    for (const products of [["OD"], ["OK"], ["ODK"], [...DINO_COHORT_PRODUCTS], ["OK", KPSS]]) {
      assert.deepEqual(
        dinoQuestionsForProducts(audience, products).map((q) => q.key),
        before[audience],
        `${audience} · ${products.join("+")}`,
      );
    }
    // Ürün bağlamsız tam katalog da aynı kalmalı (eski davranış).
    assert.deepEqual(dinoQuestionsFor(audience).map((q) => q.key), before[audience]);
  }
});

test("dahili contextual action'lar da ürün kapısından geçer", () => {
  const nba = findDinoQuestion("student_nba_reason", "STUDENT")!;
  const exam = findDinoQuestion("student_odk_reason", "STUDENT")!;
  // NBA gerekçesi WEEK (yoklama + ödev) kökenli: KPSS'de yok.
  assert.equal(dinoQuestionAppliesToProducts(nba, [KPSS]), false);
  assert.equal(dinoQuestionAppliesToProducts(nba, ["OK"]), true);
  // Deneme sonucu açıklaması KPSS ODK hattında da geçerli.
  assert.equal(dinoQuestionAppliesToProducts(exam, [KPSS]), true);
});

test("ürün bağlamı boşsa hiçbir soru çözülmez", () => {
  for (const audience of ["STUDENT", "PARENT", "TEACHER"] as const) {
    assert.deepEqual(dinoQuestionsForProducts(audience, []), []);
  }
  for (const question of DINO_QUESTIONS) {
    assert.equal(dinoQuestionAppliesToProducts(question, []), false);
    assert.equal(dinoQuestionAppliesToProducts(question, ["ALES"]), false, question.key);
  }
});

test("API ürün kapısı kodda duruyor (menü filtresi güvenlik sınırı değildir)", () => {
  const route = readFileSync("app/api/panel/dino/route.ts", "utf8");
  assert.match(route, /dinoQuestionAppliesToProducts\(question, productCodes\)/);
  assert.match(route, /getAccessibleProductCodes\(auth\.session\.userId, auth\.session\.role\)/);
  // Veli dalında bağlam velinin değil SEÇİLİ ÇOCUĞUN veli-görünür ürünleridir.
  assert.match(route, /productCodes = selected \? selected\.products : \[\]/);
});

/* ── Adım 2 · allowlist KPSS için yeterli mi ─────────────────────────── */

test("KPSS sorularının ihtiyaç duyduğu kaynak türleri allowlist'te zaten var", () => {
  // (a) kapsamlarının collector'ları bu kimlikleri üretir (lib/panel/dino-source.ts).
  const needed = [
    "LAST_EXAM",
    "EXAM_DELTA",
    "SUBJECT_TREND",
    "OUTCOMES",
    "PLAN_TASKS",
    "PLAN_REASONS",
    "REVIEW_QUEUE",
    "NO_DATA",
  ] as const;
  for (const kind of needed) {
    assert.ok(DINO_SOURCE_KINDS.includes(kind), `${kind} kaynak türü yok`);
    assert.ok(DINO_AUDIENCE_ALLOWLIST.STUDENT.includes(kind), `${kind} öğrenciye kapalı`);
  }
  // Hedef sınav tarihi ayrı bir kaynak türü GEREKTİRMEZ: plan gerekçesi olarak
  // PLAN_REASONS içinde taşınır (EXAM_APPROACHING → "yaklaşan sınav").
  assert.match(readFileSync("lib/panel/dino-explanations.ts", "utf8"), /EXAM_APPROACHING/);
});

test("allowlist KPSS bağlamında da ikinci kapı: veli notu / OK'ya özgü alanlar süzülür", () => {
  const rows = [
    { id: "LAST_EXAM", label: "Son deneme", text: "Eğitim Bilimleri 18,5 net." },
    { id: "SUBJECT_1", label: "Ders eğilimi", text: "Eğitim Bilimleri neti 22 → 18,5." },
    { id: "PLAN_REASONS", label: "Plan gerekçeleri", text: "yaklaşan sınav (3)." },
    { id: "TEACHER_NOTE_1", label: "Öğretmen notu", text: "sızmamalı" },
    { id: "COACH_NOTE", label: "Koç notu", text: "OK'ya özgü" },
    { id: "GROUP_SUMMARY", label: "Grup", text: "sızmamalı" },
    { id: "ATTENTION", label: "Dikkat", text: "sızmamalı" },
    { id: "PARENT_NOTE", label: "Veli notu", text: "sızmamalı" },
    { id: "PAYMENT", label: "Ödeme", text: "sızmamalı" },
  ];
  const kept = filterSourcesForAudience(rows, "STUDENT").map((r) => r.id);
  assert.deepEqual(kept, ["LAST_EXAM", "SUBJECT_1", "PLAN_REASONS", "COACH_NOTE"]);
  // COACH_NOTE öğrenciyle PAYLAŞILAN nottur ve öğrenci allowlist'inde zaten vardı;
  // KPSS'de koç kavramı olmadığı için collector hiç üretmez (COACHING kapsamı yok).
  for (const kind of teacherOnlySourceKinds()) {
    assert.equal(DINO_AUDIENCE_ALLOWLIST.STUDENT.includes(kind), false, kind);
  }
  // Bilinmeyen kimlikler (veli notu, ödeme) tür eşlemesinden geçemez.
  assert.equal(kept.includes("PARENT_NOTE"), false);
  assert.equal(kept.includes("PAYMENT"), false);
});

test("deny kategorileri DARALTILMADI", () => {
  for (const category of [
    "INTERNAL_NOTES",
    "PRIVATE_COACH_NOTE",
    "PAYMENT_INFO",
    "OTHER_STUDENTS",
    "ADMIN_ONLY_RISK_METADATA",
    "PARENT_PRIVATE_DATA",
    "STUDENT_CHECKIN_FREE_TEXT",
  ] as const) {
    assert.ok(DINO_ALWAYS_DENIED_CATEGORIES.includes(category), category);
  }
});

/* ── Adım 3 · parent-calm KPSS'de devre dışı ─────────────────────────── */

test("PARENT audience'ı hiçbir KPSS bağlamında doğamaz", () => {
  for (const question of DINO_QUESTIONS.filter((q) => q.audience === "PARENT")) {
    // Bir veli sorusunun ürün listesindeki HER kod veli-görünür olmalı.
    for (const code of question.applicableProducts) {
      assert.ok(isParentVisibleProduct(code), `${question.key} → ${code} veli-görünür değil`);
    }
    assert.equal(question.applicableProducts.includes(KPSS), false, question.key);
  }
  assert.equal(isParentVisibleProduct(KPSS), false);
  assert.deepEqual(parentVisibleProducts([KPSS]), []);
  assert.deepEqual(parentVisibleProducts(["OK", KPSS]), ["OK"]);
});

test("sakin veli panelinin KPSS-only bir kullanıcıda çağrılabileceği kod yolu yok", () => {
  // 1) Tek sunucu girişi `loadParentCalmHome`; onu da yalnız veli ana sayfası çağırır.
  const server = readFileSync("lib/panel/parent-calm-server.ts", "utf8");
  assert.match(server, /export async function loadParentCalmHome/);

  const page = readFileSync("app/panel/veli/page.tsx", "utf8");
  assert.match(page, /requirePanelRole\("PARENT"\)/);
  assert.match(page, /resolveParentScope\(/);

  // 2) O kapı KPSS-only öğrenciyi kapsamdan çıkarır; karışık üründe KPSS kodu
  //    seçili çocuğun ürün listesine hiç girmez (parent-product-policy).
  const policy = readFileSync("lib/panel/parent-product-policy.ts", "utf8");
  assert.match(policy, /isStudentParentVisible\(productCodes\)/);
  assert.match(policy, /products: parentVisibleProducts\(productCodes\)/);

  // 3) Dino veli yüzeyi de aynı listeyi kullanır — KPSS kodu oraya ulaşamaz.
  const dinoPage = readFileSync("app/panel/veli/dino/page.tsx", "utf8");
  assert.match(dinoPage, /dinoQuestionsForProducts\("PARENT", selected\.products\)/);

  // 4) Sakin veli ana sayfası dışında kimse parent-calm SERVER'ını çağırmaz.
  for (const file of [
    "app/panel/ogrenci/dino/page.tsx",
    "app/panel/ogrenci/page.tsx",
    "app/api/panel/dino/route.ts",
    "lib/panel/dino-source.ts",
    "lib/kpss/adaptive-plan-server.ts",
  ]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /parent-calm/, file);
  }
});

/* ── Adım 4 · çıktı dili veri-güdümlü ────────────────────────────────── */

test("KPSS kaynaklı sentetik çıktı: ders/konu etiketleri veriden gelir", () => {
  const sources = [
    {
      id: "SUBJECT_1",
      label: "Ders eğilimi",
      text: "Eğitim Bilimleri neti 22 → 18,5 (düşüş 3,5).",
    },
    {
      id: "OUTCOME_1",
      label: "Kazanım tekrarı",
      text: "EB.OD.3 · Ölçme ve değerlendirmede geçerlik türleri",
    },
  ];
  const answer = {
    text:
      "Eğitim Bilimleri'nde ölçme ve değerlendirme konusunda son denemelerde net düşüşü görünüyor; " +
      "tekrar kuyruğunda bu kazanım bekliyor.",
    citations: ["SUBJECT_1", "OUTCOME_1"],
  };
  const checked = validateDinoOutput(answer, sources.map((s) => s.id));
  assert.equal(checked.ok, true);

  // Model çağrılamazsa dürüst yedek: KPSS dayanakları olduğu gibi listelenir,
  // yeni bir eğitim bilimleri "gerçeği" üretilmez.
  const fallback = dinoFallbackAnswer({
    audience: "STUDENT",
    questionKey: "student_subject_trend",
    questionLabel: "Derslerimde neden gerileme var?",
    sources,
  });
  assert.ok(fallback.text.includes("Eğitim Bilimleri neti 22 → 18,5 (düşüş 3,5)."));
  assert.deepEqual(fallback.citations, ["SUBJECT_1", "OUTCOME_1"]);
});

test("KPSS bağlamında da yalnız verilen kaynaklara atıf yapılabilir", () => {
  const result = validateDinoOutput(
    { text: "Eğitim Bilimleri netin son üç denemede düzenli biçimde geriledi.", citations: ["KPSS_UYDURMA"] },
    ["SUBJECT_1"],
  );
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, "UNSUPPORTED_CITATION");
});

test("ürün aileleri ayrık ve katalog bu iki aileyi kapsar", () => {
  assert.deepEqual([...DINO_COHORT_PRODUCTS], ["OD", "OK", "ODK"]);
  assert.deepEqual([...DINO_SELF_STUDY_PRODUCTS], [KPSS]);
  assert.equal(
    new Set(DINO_ALL_PRODUCTS).size,
    DINO_COHORT_PRODUCTS.length + DINO_SELF_STUDY_PRODUCTS.length,
  );
});
