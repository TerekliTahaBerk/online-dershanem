import assert from "node:assert/strict";
import test from "node:test";
import { createAnonymousTrackingId, trackContactClick, trackConversionEvent } from "./tracking";

test("anonymous tracking ids are stable-length privacy-safe hashes", () => {
  const id = createAnonymousTrackingId("student-123");
  assert.equal(id.length, 24);
  assert.match(id, /^[a-f0-9]+$/);
});

test("canonical funnel events accept typed payloads without throwing", () => {
  assert.doesNotThrow(() => trackConversionEvent("package_builder_started", { product: "paket-a", source: "hero" }));
  assert.doesNotThrow(() => trackConversionEvent("checkout_payment_succeeded", { product: "paket-a", billingPeriod: "monthly" }));
});

test("contact clicks map to canonical landing events", () => {
  assert.doesNotThrow(() => trackContactClick("whatsapp", { source: "header" }));
});
