import assert from "node:assert/strict";
import test from "node:test";
import { getExamTemplate, resolveTemplateForCreate, templateTotalQuestions, withSectionRanges } from "./exam-templates";

test("TYT/AYT/LGS tam şablonları config üzerinden gelir", () => {
  assert.equal(templateTotalQuestions(getExamTemplate("TYT_FULL")!), 120);
  assert.equal(templateTotalQuestions(getExamTemplate("AYT_FULL")!), 160);
  assert.equal(templateTotalQuestions(getExamTemplate("LGS_FULL")!), 90);
});

test("FULL_TEMPLATE varsayılan olarak aileye göre seçilir", () => {
  const template = resolveTemplateForCreate({ family: "TYT", structureMode: "FULL_TEMPLATE" });
  assert.equal(template.code, "TYT_FULL");
  assert.equal(template.sections[0].code, "TURKCE");
});

test("bölüm soru aralıkları canonical numaralandırma üretir", () => {
  const ranges = withSectionRanges(getExamTemplate("LGS_FULL")!);
  assert.equal(ranges[0].questionStart, 1);
  assert.equal(ranges[0].questionEnd, 20);
  assert.equal(ranges.at(-1)?.questionEnd, 90);
});
