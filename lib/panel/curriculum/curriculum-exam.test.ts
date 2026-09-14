import assert from "node:assert/strict";
import test from "node:test";

import { getCurriculumExamLabel } from "./curriculum-exam";

test("legacy müfredatlarda enum sınav kodunu değiştirmeden döndürür", () => {
  assert.equal(
    getCurriculumExamLabel({ exam: "LGS", examFamilyRef: { code: "KPSS_EGITIM_BILIMLERI" } }),
    "LGS",
  );
});

test("enum değeri olmayan müfredatta sınav ailesi koduna düşer", () => {
  assert.equal(
    getCurriculumExamLabel({ exam: null, examFamilyRef: { code: "KPSS_EGITIM_BILIMLERI" } }),
    "KPSS_EGITIM_BILIMLERI",
  );
});
