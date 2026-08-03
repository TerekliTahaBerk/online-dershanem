import assert from "node:assert/strict";
import test from "node:test";
import { calculateAdMetrics, calculateTax } from "./business/finance";
import { normalizeEmail, normalizePhone, escapeCsvCell } from "./business/normalization";
import { aiConversationDecisionSchema, applyAISafety } from "./business/ai";
import { normalizeMetaEvents, verifyMetaSignature } from "./business/instagram";
import { createHmac } from "node:crypto";

test("para, vergi ve reklam metrikleri integer kuruşla hesaplanır", () => {
  assert.deepEqual(calculateTax(12000, 20), { vatCents: 2000, netBeforeVatCents: 10000 });
  const metrics = calculateAdMetrics({ spentCents: 10000, impressions: 1000, clicks: 100, messageStarts: 20, leads: 10, sales: 2, revenueCents: 40000, taxCents: 4000, commissionCents: 1000 });
  assert.equal(metrics.cpcCents, 100); assert.equal(metrics.roas, 4); assert.equal(metrics.profitCents, 25000);
});

test("telefon/e-posta normalizasyonu ve CSV injection koruması", () => {
  assert.equal(normalizePhone("0555 123 45 67"), "+905551234567");
  assert.equal(normalizeEmail(" Test@Example.COM "), "test@example.com");
  assert.equal(escapeCsvCell("=SUM(A1:A2)"), '"\'=SUM(A1:A2)"');
});

test("AI structured output doğrulanır ve güvenli intent insana aktarılır", () => {
  const decision = aiConversationDecisionSchema.parse({ reply: "İnceleyelim.", intent: "REFUND", confidence: 0.99, leadTemperature: "HOT", productInterest: "ONLINE_DERSHANEM", shouldReplyAutomatically: true, requiresHuman: false, escalationReason: null, extractedData: {}, suggestedTags: [], internalSummary: "İade talebi" });
  const safe = applyAISafety(decision); assert.equal(safe.requiresHuman, true); assert.equal(safe.shouldReplyAutomatically, false);
});

test("Meta imzası raw body üzerinde doğrulanır ve mesaj normalize edilir", () => {
  const raw = JSON.stringify({ object: "instagram", entry: [{ id: "acct", time: 1000, messaging: [{ sender: { id: "customer" }, recipient: { id: "acct" }, timestamp: 2000, message: { mid: "mid-1", text: "Merhaba" } }] }] });
  const signature = `sha256=${createHmac("sha256", "secret").update(raw).digest("hex")}`;
  assert.equal(verifyMetaSignature(raw, signature, "secret"), true);
  const [event] = normalizeMetaEvents(JSON.parse(raw)); assert.equal(event.providerEventId, "mid-1"); assert.equal(event.text, "Merhaba");
});

