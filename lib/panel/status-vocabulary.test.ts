import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ORDER_PAYMENT_STATUS_PRESENTATION,
  READINESS_STATUS_PRESENTATION,
  USER_STATUS_PRESENTATION,
  WEEKLY_PLAN_SUGGESTION_KIND_LABELS,
  odkExamStatusLabel,
} from "./status-vocabulary";

const RAW_ENUM = /^[A-Z][A-Z0-9_]+$/;

test("durum sözlüğü ham enum değerini etiket olarak döndürmez", () => {
  const labels = [
    ...Object.values(USER_STATUS_PRESENTATION).map((item) => item.label),
    ...Object.values(ORDER_PAYMENT_STATUS_PRESENTATION).map((item) => item.label),
    ...Object.values(READINESS_STATUS_PRESENTATION).map((item) => item.label),
    ...Object.values(WEEKLY_PLAN_SUGGESTION_KIND_LABELS),
  ];
  for (const label of labels) {
    assert.ok(label.trim().length > 0);
    assert.ok(!RAW_ENUM.test(label), label);
  }
});

test("aynı kavram aynı etiketi taşır", () => {
  assert.equal(USER_STATUS_PRESENTATION.ACTIVE.label, "Aktif");
  assert.equal(ORDER_PAYMENT_STATUS_PRESENTATION.PAID.tone, "success");
  assert.equal(odkExamStatusLabel("RELEASED"), "Yayınlandı");
  assert.equal(odkExamStatusLabel("LIVE"), "Canlı");
});
