import assert from "node:assert/strict";
import test from "node:test";
import { sectionNet, summarizeMockExamTrend, validateMockExamSections } from "./mock-exams";

test("LGS ve YKS için doğru yanlış götürme oranını kullanır", () => {
  assert.equal(sectionNet("LGS", 17, 3), 16);
  assert.equal(sectionNet("TYT", 36, 4), 35);
});

test("şablon toplamını ve en fazla üç neden sınırını doğrular", () => {
  const base = [{ subjectCode: "YDT", correctCount: 60, incorrectCount: 10, blankCount: 10, errorCategories: ["TIME" as const, "ATTENTION" as const] }];
  assert.equal(validateMockExamSections("YDT", base), null);
  assert.match(validateMockExamSections("YDT", [{ ...base[0], blankCount: 9 }]) || "", /80/);
  assert.match(validateMockExamSections("YDT", [{ ...base[0], errorCategories: ["TIME", "ATTENTION", "PROCESS", "KNOWLEDGE"] }]) || "", /en fazla üç/);
});

test("puan veya sıralama üretmeden kişi içi tekrar eden nedeni bulur", () => {
  const trend = summarizeMockExamTrend([0, 1, 2].map((days) => ({ exam: "LGS" as const, takenAt: new Date(Date.now() - days * 86400000), sections: [{ subjectCode: "MAT", subjectName: "Matematik", correctCount: 15, incorrectCount: 3, errors: [{ category: "PROCESS" as const }] }] })));
  assert.equal(trend.recurringError?.category, "PROCESS");
  assert.equal(trend.recurringError?.count, 3);
});
