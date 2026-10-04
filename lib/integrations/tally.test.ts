import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { extractTallyFields, signTallyRef, tallyEmbedUrl, tallyWebhookSchema, verifyTallyRef, verifyTallySignature } from "./tally";
import { isTallySubmittedMessage } from "./tally-events";

const SECRET = "test-ref-secret";

test("imzalı ref doğrulanır; değiştirilmiş ref reddedilir", () => {
  const ref = signTallyRef("user_123", SECRET);
  assert.ok(ref);
  assert.equal(verifyTallyRef(ref, SECRET), "user_123");
  assert.equal(verifyTallyRef(ref!.replace("user_123", "user_999"), SECRET), null);
  assert.equal(verifyTallyRef("user_123", SECRET), null);
  assert.equal(verifyTallyRef(ref, "baska-sir"), null);
  assert.equal(signTallyRef("user_123", null), null);
});

test("webhook imzası ham gövdenin HMAC-SHA256 base64 değeridir", () => {
  const body = JSON.stringify({ eventId: "e1" });
  const signature = createHmac("sha256", "signing").update(body).digest("base64");
  assert.equal(verifyTallySignature(body, signature, "signing"), true);
  assert.equal(verifyTallySignature(`${body} `, signature, "signing"), false);
  assert.equal(verifyTallySignature(body, null, "signing"), false);
  assert.equal(verifyTallySignature(body, signature, undefined), false);
});

test("gizli alanlar ve iletişim yanıtları çıkarılır", () => {
  const payload = tallyWebhookSchema.parse({
    eventId: "evt",
    eventType: "FORM_RESPONSE",
    data: {
      responseId: "resp",
      formId: "vGRQ5X",
      fields: [
        { key: "a", label: "ref", type: "HIDDEN_FIELDS", value: "u.mac" },
        { key: "b", label: "role", type: "HIDDEN_FIELDS", value: "STUDENT" },
        { key: "c", label: "E-posta", type: "INPUT_EMAIL", value: "Ali@Example.com" },
        { key: "d", label: "Telefon", type: "INPUT_PHONE_NUMBER", value: "+905321234567" },
        { key: "e", label: "Adınız", type: "INPUT_TEXT", value: "Ali" },
      ],
    },
  });
  const fields = extractTallyFields(payload);
  assert.deepEqual(fields.hidden, { ref: "u.mac", role: "STUDENT" });
  assert.equal(fields.email, "ali@example.com");
  assert.equal(fields.phone, "+905321234567");
  assert.equal(fields.name, "Ali");
});

test("gömme URL'si form olaylarını iletir ve gizli alanları taşır", () => {
  const previous = process.env.TALLY_REF_SECRET;
  process.env.TALLY_REF_SECRET = SECRET;
  try {
    const url = new URL(tallyEmbedUrl({ userId: "u1", fullName: "Ali Veli", email: "ali@example.com", phone: null, role: "STUDENT", products: ["OD", "OK"] }, "vGRQ5X"));
    assert.equal(url.origin, "https://tally.so");
    assert.equal(url.pathname, "/r/vGRQ5X");
    assert.equal(url.searchParams.get("formEventsForwarding"), "1");
    assert.equal(url.searchParams.get("products"), "OD,OK");
    assert.equal(verifyTallyRef(url.searchParams.get("ref"), SECRET), "u1");
    assert.equal(url.searchParams.has("phone"), false);
  } finally {
    if (previous === undefined) delete process.env.TALLY_REF_SECRET;
    else process.env.TALLY_REF_SECRET = previous;
  }
});

test("yalnız Tally.FormSubmitted olayı gönderim sayılır", () => {
  assert.equal(isTallySubmittedMessage(JSON.stringify({ event: "Tally.FormSubmitted", payload: {} })), true);
  assert.equal(isTallySubmittedMessage({ event: "Tally.FormSubmitted" }), true);
  assert.equal(isTallySubmittedMessage(JSON.stringify({ event: "Tally.FormLoaded" })), false);
  assert.equal(isTallySubmittedMessage("Tally.FormSubmitted{bozuk"), false);
  assert.equal(isTallySubmittedMessage(null), false);
});
