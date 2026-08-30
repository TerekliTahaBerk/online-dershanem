import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("öğretmen ana sayfası historical progress taşımak yerine sınırlı attention read-model kullanır", () => {
  const page = readFileSync(new URL("../app/panel/ogretmen/page.tsx", import.meta.url), "utf8");
  const readModel = readFileSync(new URL("./panel/teacher-attention-server.ts", import.meta.url), "utf8");

  assert.match(page, /getTeacherStudentAttentionSnapshot/);
  assert.doesNotMatch(page, /assignmentProgress\.findMany|attendance\.findMany|\.filter\(\(p\)/);
  assert.match(readModel, /interventionCase\.findMany/);
  assert.match(readModel, /take: 5/);
  assert.match(readModel, /status: \{ in: \["OPEN", "IN_PROGRESS"\] \}/);
});
