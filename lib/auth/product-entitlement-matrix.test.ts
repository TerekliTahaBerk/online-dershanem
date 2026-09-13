import assert from "node:assert/strict";
import test from "node:test";
import type { ProductCode } from "@prisma/client";
import { readFileSync } from "node:fs";
import { hasProductEntitlement } from "./product-entitlements";

const matrix: Array<{
  name: string;
  products: ProductCode[];
  expected: Record<ProductCode, boolean>;
}> = [
  { name: "OD-only", products: ["OD"], expected: { OD: true, OK: false, ODK: false } },
  { name: "OK-only", products: ["OK"], expected: { OD: false, OK: true, ODK: false } },
  { name: "ODK-only", products: ["ODK"], expected: { OD: false, OK: false, ODK: true } },
  { name: "bundle", products: ["OD", "OK", "ODK"], expected: { OD: true, OK: true, ODK: true } },
];

for (const row of matrix) {
  test(`product entitlement matrix: ${row.name}`, () => {
    for (const product of ["OD", "OK", "ODK"] as const) {
      assert.equal(hasProductEntitlement(row.products, product), row.expected[product]);
    }
  });
}

test("API guard names encode product scope and shared routes stay account-scoped", () => {
  const apiGuards = readFileSync("lib/auth/api-guards.ts", "utf8");
  assert.doesNotMatch(apiGuards, /export async function requireApiRole\b/);

  const expectedGuards = {
    "app/api/panel/adaptive-plan/generate/route.ts": 'requireApiProductRole("OK", "STUDENT")',
    "app/api/panel/adaptive-plan/preferences/route.ts": 'requireApiProductRole("OK", "STUDENT")',
    "app/api/panel/adaptive-plan/tasks/[id]/complete/route.ts": 'requireApiProductRole("OK", "STUDENT")',
    "app/api/panel/kocum/tasks/[id]/complete/route.ts": 'requireApiProductRole("OK", "STUDENT")',
    "app/api/panel/kocum/tasks/[id]/reschedule/route.ts": 'requireApiProductRole("OK", "ADMIN", "TEACHER")',
    "app/api/panel/kocum/notes/route.ts": 'requireApiProductRole("OK", "ADMIN", "TEACHER")',
    "app/api/panel/kocum/summaries/route.ts": 'requireApiProductRole("OK", "ADMIN", "TEACHER")',
    "app/api/panel/kocum/tasks/route.ts": 'requireApiProductRole("OK", "ADMIN", "TEACHER")',
    "app/api/cron/kocum-suggestions/route.ts": "kocum-suggestions",
    "app/api/panel/dino/route.ts": 'requireApiAccountRole("STUDENT", "PARENT", "TEACHER")',
    "app/api/panel/student/home/route.ts": 'requireApiAccountRole("STUDENT")',
    "app/api/panel/notifications/preferences/route.ts": 'requireApiAccountRole("PARENT", "STUDENT")',
    "app/api/panel/events/route.ts": 'requireApiAccountRole("ADMIN", "TEACHER", "STUDENT", "PARENT")',
  } as const;

  for (const [path, guardCall] of Object.entries(expectedGuards)) {
    assert.match(readFileSync(path, "utf8"), new RegExp(guardCall.replace(/[()[\]]/g, "\\$&")));
  }
});

test("kocum mutation routes enforce horizontal access helpers", () => {
  const files = [
    "app/api/panel/kocum/tasks/route.ts",
    "app/api/panel/kocum/tasks/[id]/reschedule/route.ts",
    "app/api/panel/kocum/notes/route.ts",
    "app/api/panel/kocum/summaries/route.ts",
    "app/api/panel/kocum/suggestions/[id]/review/route.ts",
    "app/api/panel/kocum/plans/[id]/copy/route.ts",
  ];
  for (const path of files) {
    assert.match(readFileSync(path, "utf8"), /assertCoachOrTeacherAccess/);
  }
  assert.match(
    readFileSync("app/api/panel/kocum/tasks/[id]/complete/route.ts", "utf8"),
    /loadPlanTaskForStudentMutation/,
  );
  assert.match(
    readFileSync("app/api/panel/kocum/tasks/[id]/reschedule/route.ts", "utf8"),
    /isDateWithinPlanWeek/,
  );
});
