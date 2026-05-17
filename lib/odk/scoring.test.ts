/**
 * ODK puanlama unit testleri.
 *
 * Çalıştırma: `npx tsx lib/odk/scoring.test.ts`
 * (Henüz proje genelinde Jest/Vitest kurulu değil — bu dosya bağımsız çalışır
 * ve ilk hata bulduğunda non-zero exit code'la çıkar.)
 */

import { scoreAttempt } from "./scoring";

let passed = 0;
let failed = 0;

function eq<T>(actual: T, expected: T, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
  }
}

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

const sec = (id: string, title: string, count: number) => ({
  id,
  title,
  questionCount: count,
});

const oa = (sectionId: string, n: number, c: string) => ({
  sectionId,
  questionNumber: n,
  correctOption: c,
});

const sa = (sectionId: string, n: number, s: string) => ({
  sectionId,
  questionNumber: n,
  selectedOption: s,
});

describe("scoreAttempt — ÖSYM standardı (4 yanlış 1 doğru)", () => {
  const sections = [sec("s1", "TYT Türkçe", 4)];
  const official = [
    oa("s1", 1, "A"),
    oa("s1", 2, "B"),
    oa("s1", 3, "C"),
    oa("s1", 4, "D"),
  ];

  // Tüm doğru
  const r1 = scoreAttempt(sections, official, [
    sa("s1", 1, "A"),
    sa("s1", 2, "B"),
    sa("s1", 3, "C"),
    sa("s1", 4, "D"),
  ]);
  eq(r1.correctCount, 4, "4 doğru — correctCount = 4");
  eq(r1.wrongCount, 0, "4 doğru — wrongCount = 0");
  eq(r1.totalNet, 4, "4 doğru — net = 4");

  // 4 yanlış 1 doğru götürür
  const r2 = scoreAttempt(sections, official, [
    sa("s1", 1, "B"), // yanlış
    sa("s1", 2, "A"), // yanlış
    sa("s1", 3, "B"), // yanlış
    sa("s1", 4, "D"), // doğru
  ]);
  eq(r2.correctCount, 1, "3 yanlış 1 doğru — correctCount = 1");
  eq(r2.wrongCount, 3, "3 yanlış 1 doğru — wrongCount = 3");
  eq(r2.totalNet, 0.25, "3 yanlış 1 doğru — net = 1 - 3/4 = 0.25");

  // Tam tersine: 4 yanlış 1 doğru
  const sections5 = [sec("s1", "TYT Türkçe", 5)];
  const official5 = [
    oa("s1", 1, "A"),
    oa("s1", 2, "B"),
    oa("s1", 3, "C"),
    oa("s1", 4, "D"),
    oa("s1", 5, "E"),
  ];
  const r3 = scoreAttempt(sections5, official5, [
    sa("s1", 1, "A"), // doğru
    sa("s1", 2, "A"), // yanlış
    sa("s1", 3, "A"), // yanlış
    sa("s1", 4, "A"), // yanlış
    sa("s1", 5, "A"), // yanlış
  ]);
  eq(r3.correctCount, 1, "4 yanlış 1 doğru — correctCount = 1");
  eq(r3.wrongCount, 4, "4 yanlış 1 doğru — wrongCount = 4");
  eq(r3.totalNet, 0, "4 yanlış 1 doğru — net = max(0, 1 - 4/4) = 0");

  // Boş bırakma cezasız
  const r4 = scoreAttempt(sections, official, [
    sa("s1", 1, "A"),
    sa("s1", 2, "B"),
    // 3 ve 4 boş
  ]);
  eq(r4.correctCount, 2, "2 doğru 2 boş — correctCount = 2");
  eq(r4.wrongCount, 0, "2 doğru 2 boş — wrongCount = 0");
  eq(r4.blankCount, 2, "2 doğru 2 boş — blankCount = 2");
  eq(r4.totalNet, 2, "2 doğru 2 boş — net = 2 (boş cezasız)");

  // Net asla negatif olmaz
  const r5 = scoreAttempt(sections, official, [
    sa("s1", 1, "B"),
    sa("s1", 2, "A"),
    sa("s1", 3, "B"),
    sa("s1", 4, "A"),
  ]);
  eq(r5.totalNet, 0, "4 yanlış 0 doğru — net = max(0, ...) = 0");
});

describe("scoreAttempt — bölüm bazlı net dağılımı", () => {
  const sections = [
    sec("turkce", "TYT Türkçe", 2),
    sec("mat", "TYT Matematik", 2),
  ];
  const official = [
    oa("turkce", 1, "A"),
    oa("turkce", 2, "B"),
    oa("mat", 1, "C"),
    oa("mat", 2, "D"),
  ];
  const r = scoreAttempt(sections, official, [
    sa("turkce", 1, "A"),
    sa("turkce", 2, "A"), // yanlış
    sa("mat", 1, "C"),
    sa("mat", 2, "D"),
  ]);

  const turkce = r.sectionScores.find((s) => s.sectionId === "turkce");
  const mat = r.sectionScores.find((s) => s.sectionId === "mat");
  eq(turkce?.correct, 1, "Türkçe correct = 1");
  eq(turkce?.wrong, 1, "Türkçe wrong = 1");
  eq(turkce?.net, 0.75, "Türkçe net = 1 - 1/4 = 0.75");
  eq(mat?.correct, 2, "Mat correct = 2");
  eq(mat?.net, 2, "Mat net = 2");
  eq(r.totalNet, 2.75, "Toplam net = 0.75 + 2 = 2.75");
});

describe("scoreAttempt — özel ceza katsayısı (LGS = 3 yanlış 1 doğru)", () => {
  const sections = [sec("s1", "LGS", 4)];
  const official = [
    oa("s1", 1, "A"),
    oa("s1", 2, "B"),
    oa("s1", 3, "C"),
    oa("s1", 4, "D"),
  ];
  const r = scoreAttempt(
    sections,
    official,
    [
      sa("s1", 1, "A"), // doğru
      sa("s1", 2, "A"), // yanlış
      sa("s1", 3, "A"), // yanlış
      sa("s1", 4, "A"), // yanlış
    ],
    3, // LGS penalty
  );
  eq(r.totalNet, 0, "1 doğru 3 yanlış (penalty=3) — net = max(0, 1 - 3/3) = 0");
});

console.log(`\n${passed + failed} test, ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
