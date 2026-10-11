import assert from "node:assert/strict";
import test from "node:test";
import { assertGroupRevision, GroupMutationError, groupRevision, mutationReceiptKey, readGroupReceipt } from "./group-mutation-core";
import { parseGroupMutationEnvelope } from "./group-mutation-input";

const at = new Date("2026-10-11T09:00:00Z");
const group = { id: "g1", name: "8-A", subject: "Matematik", level: null, capacity: 4, isActive: true, teacherId: "t1", updatedAt: at, enrollments: [{ studentId: "s1", startedAt: at }, { studentId: "s2", startedAt: at }] };
const key = "550e8400-e29b-41d4-a716-446655440000";

test("grup sürümü üye sırasından ve yükleyicinin ek alanlarından bağımsızdır", () => {
  assert.equal(groupRevision(group), groupRevision({ ...group, enrollments: [...group.enrollments].reverse(), teacher: { name: "Ada" } } as typeof group));
  assert.notEqual(groupRevision(group), groupRevision({ ...group, enrollments: group.enrollments.slice(1) }));
  assert.notEqual(groupRevision(group), groupRevision({ ...group, teacherId: "t2" }));
  assert.notEqual(groupRevision(group), groupRevision({ ...group, enrollments: [{ studentId: "s1", startedAt: new Date(at.getTime() + 1) }, group.enrollments[1]] }));
});

test("eski sürüm reddedilir; legacy web sürümsüz yazma uyumu açık kalır", () => {
  assert.throws(() => assertGroupRevision(groupRevision(group), "a".repeat(64)), (error) => error instanceof GroupMutationError && error.code === "GROUP_CONFLICT");
  assert.doesNotThrow(() => assertGroupRevision(groupRevision(group), undefined));
});

test("makbuz yalnız aynı içerikte tekrar edilir; anahtar aktöre bağlıdır", () => {
  assert.deepEqual(readGroupReceipt({ operationDigest: "abc", result: { id: "g1", ok: true } }, "abc"), { id: "g1", ok: true, replayed: true });
  assert.throws(() => readGroupReceipt({ operationDigest: "abc", result: {} }, "def"), (error) => error instanceof GroupMutationError && error.code === "IDEMPOTENCY_REUSE");
  assert.notEqual(mutationReceiptKey("actor1", key), mutationReceiptKey("actor2", key));
});

test("Bearer yazması anahtar ve kaynak/hedef sürümü olmadan kabul edilmez", () => {
  const headers = new Headers({ authorization: "Bearer session" });
  assert.throws(() => parseGroupMutationEnvelope(headers, {}), GroupMutationError);
  assert.throws(() => parseGroupMutationEnvelope(headers, { idempotencyKey: key }), GroupMutationError);
  assert.doesNotThrow(() => parseGroupMutationEnvelope(headers, { idempotencyKey: key }, { create: true }));
  const input = { idempotencyKey: key, expectedRevision: groupRevision(group) };
  assert.throws(() => parseGroupMutationEnvelope(headers, input, { transfer: true }), GroupMutationError);
  assert.doesNotThrow(() => parseGroupMutationEnvelope(headers, { ...input, expectedTargetRevision: groupRevision(group) }, { transfer: true }));
  assert.deepEqual(parseGroupMutationEnvelope(new Headers(), {}), {});
  assert.throws(() => parseGroupMutationEnvelope(new Headers(), input, { transfer: true }), GroupMutationError);
});
