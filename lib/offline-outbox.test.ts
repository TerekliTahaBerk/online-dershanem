import assert from "node:assert/strict";
import test from "node:test";
import { payloadSizeBand, queueAgeBand, validateOfflineMutation } from "./offline-outbox";

test("offline allowlist yalnız ders kapanışı ve kontrollü ödev durumunu kabul eder", () => {
  assert.equal(validateOfflineMutation({ kind: "ASSIGNMENT_PROGRESS", method: "PATCH", url: "/api/panel/assignments/a1/progress", body: { status: "DONE" }, coalesceKey: "assignment:a1" }), true);
  assert.equal(validateOfflineMutation({ kind: "LESSON_CLOSE", method: "PUT", url: "/api/panel/lessons/l1/notes", body: { complete: true }, coalesceKey: "lesson:l1" }), true);
  assert.equal(validateOfflineMutation({ kind: "ASSIGNMENT_PROGRESS", method: "PATCH", url: "/api/panel/orders/o1", body: { status: "PAID" }, coalesceKey: "order:o1" }), false);
});

test("offline telemetri bantları içerik veya kimlik üretmez", () => {
  assert.equal(payloadSizeBand({ value: "x" }), "0-4KB");
  assert.equal(queueAgeBand(Date.now() - 3 * 60000), "2-15M");
  assert.equal(queueAgeBand(Date.now() - 20 * 60000), "16M-24H");
});
