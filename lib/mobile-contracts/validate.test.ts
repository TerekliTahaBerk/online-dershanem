import assert from "node:assert/strict";
import { test } from "node:test";

import { check, v } from "./validate";

test("validate: nesne fazlalık alanları atar, eksik alanı yoluyla reddeder", () => {
  const schema = v.object({ id: v.nonEmpty(), count: v.int(0) });
  assert.deepEqual(check(schema, { id: "a", count: 2, secret: "x" }), { ok: true, value: { id: "a", count: 2 } });
  const missing = check(schema, { id: "a" });
  assert.equal(missing.ok, false);
  assert.match(missing.ok ? "" : missing.error, /^\$\.count: tam sayı/);
  assert.equal(check(schema, null).ok, false);
  assert.equal(check(schema, []).ok, false);
});

test("validate: temel tipler", () => {
  assert.equal(check(v.string(), 1).ok, false);
  assert.equal(check(v.nonEmpty(), "").ok, false);
  assert.equal(check(v.number(), Number.NaN).ok, false);
  assert.equal(check(v.number(), 1.5).ok, true);
  assert.equal(check(v.int(0), -1).ok, false);
  assert.equal(check(v.int(0), 1.2).ok, false);
  assert.equal(check(v.boolean(), "true").ok, false);
  assert.equal(check(v.literal(1), 1).ok, true);
  assert.equal(check(v.literal(1), 2).ok, false);
  assert.equal(check(v.oneOf(["A", "B"] as const), "C").ok, false);
  assert.equal(check(v.oneOf(["A", "B"] as const), "B").ok, true);
});

test("validate: ISO tarih yalnız tam zaman damgası kabul eder", () => {
  assert.equal(check(v.iso(), "2026-10-08T09:00:00.000Z").ok, true);
  assert.equal(check(v.iso(), "2026-10-08T12:00:00+03:00").ok, true);
  assert.equal(check(v.iso(), "2026-10-08").ok, false);
  assert.equal(check(v.iso(), "2026-13-45T99:00:00Z").ok, false);
  assert.equal(check(v.iso(), 0).ok, false);
});

test("validate: nullable / optional / array", () => {
  assert.deepEqual(check(v.nullable(v.string()), null), { ok: true, value: null });
  assert.deepEqual(check(v.object({ x: v.optional(v.boolean(), false) }), {}), { ok: true, value: { x: false } });
  assert.equal(check(v.object({ x: v.optional(v.boolean(), false) }), { x: "no" }).ok, false);
  const bad = check(v.array(v.int(0)), [1, "2"]);
  assert.match(bad.ok ? "" : bad.error, /^\$\[1\]/);
  assert.equal(check(v.array(v.int(0)), "x").ok, false);
});

test("validate: union etiketine göre üyeyi seçer, bilinmeyen etiketi reddeder", () => {
  const schema = v.union("type", {
    a: v.object({ type: v.literal("a"), id: v.nonEmpty() }),
    b: v.object({ type: v.literal("b") }),
  });
  assert.deepEqual(check(schema, { type: "a", id: "1" }), { ok: true, value: { type: "a", id: "1" } });
  assert.deepEqual(check(schema, { type: "b", id: "1" }), { ok: true, value: { type: "b" } });
  assert.equal(check(schema, { type: "toString" }).ok, false);
  assert.equal(check(schema, { type: "c" }).ok, false);
  assert.equal(check(schema, "a").ok, false);
});

test("validate: doğrulayıcı dışı hatalar yutulmaz", () => {
  assert.throws(() =>
    check(() => {
      throw new TypeError("boom");
    }, 1),
  );
});
