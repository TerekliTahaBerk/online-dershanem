import assert from "node:assert/strict";
import test from "node:test";
import { calculateCohortGains, normalizedNetPercent } from "./cohort-quality";

const section = (correctCount: number, incorrectCount = 0) => [{ questionCount: 100, correctCount, incorrectCount }];

test("LGS ve YKS net katsayısını soru sayısına normalize eder", () => {
  assert.equal(normalizedNetPercent({ studentKey: "a", exam: "LGS", takenAt: new Date(), sections: section(70, 30) }), 60);
  assert.equal(normalizedNetPercent({ studentKey: "a", exam: "TYT", takenAt: new Date(), sections: section(70, 20) }), 65);
});

test("aynı öğrencinin en az 14 gün aralıklı ilk ve son ölçümünü eşler", () => {
  const start = new Date("2026-01-01T00:00:00Z");
  const rows = Array.from({ length: 10 }, (_, index) => [
    { studentKey: `s${index}`, exam: "LGS" as const, takenAt: start, sections: section(50 + index) },
    { studentKey: `s${index}`, exam: "LGS" as const, takenAt: new Date("2026-01-21T00:00:00Z"), sections: section(60 + index) },
  ]).flat();
  const result = calculateCohortGains(rows)[0];
  assert.equal(result.status, "READY");
  assert.equal(result.pairedStudents, 10);
  assert.equal(result.medianChange, 10);
  assert.equal(result.positiveChangePercent, 100);
  assert.equal(result.medianGapDays, 20);
});

test("on öğrenciden az kohortta gelişim istatistiğini bastırır", () => {
  const result = calculateCohortGains([
    { studentKey: "s1", exam: "TYT", takenAt: new Date("2026-01-01"), sections: section(50) },
    { studentKey: "s1", exam: "TYT", takenAt: new Date("2026-02-01"), sections: section(70) },
  ]).find((item) => item.exam === "TYT")!;
  assert.equal(result.status, "INSUFFICIENT_SAMPLE");
  assert.equal(result.pairedStudents, 1);
  assert.equal(result.medianChange, null);
  assert.equal(result.lowerQuartile, null);
});
