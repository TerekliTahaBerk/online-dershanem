import assert from "node:assert/strict";
import test from "node:test";
import { coachingCreateSchema, coachingMutationSchema } from "./coaching-experience";
const common = { expectedVersion: 1, idempotencyKey: "test-idempotency" };
test("saat değişikliği kontrollü seçenek dışı veya serbest metin kabul etmez", () => {
  assert.equal(coachingMutationSchema.safeParse({ ...common, action: "REQUEST", reason: "SCHOOL_SCHEDULE" }).success, true);
  assert.equal(coachingMutationSchema.safeParse({ ...common, action: "REQUEST", reason: "OTHER", note: "private" }).success, false);
});
test("katılım linki HTTPS ve İstanbul ofsetli saat olmalıdır", () => {
  const input = { studentId: "student", scheduledAt: "2026-10-03T10:00:00+03:00", meetingUrl: "https://example.com/session", idempotencyKey: "test-idempotency" };
  assert.equal(coachingCreateSchema.safeParse(input).success, true);
  assert.equal(coachingCreateSchema.safeParse({ ...input, meetingUrl: "javascript:alert(1)" }).success, false);
  assert.equal(coachingCreateSchema.safeParse({ ...input, meetingUrl: "http://example.com" }).success, false);
});
test("görüşme kararları en fazla üçtür ve koçun seçtiği gün/süre gerekir", () => {
  const decision = { title: "Kısa tekrar", scheduledFor: "2026-10-02T12:00:00+03:00", durationMinutes: 20 };
  const input = { ...common, action: "COMPLETE", focus: "", sharedNote: "", privateNote: "", decisions: [decision, decision, decision] };
  assert.equal(coachingMutationSchema.safeParse(input).success, true);
  assert.equal(coachingMutationSchema.safeParse({ ...input, decisions: [...input.decisions, decision] }).success, false);
});
