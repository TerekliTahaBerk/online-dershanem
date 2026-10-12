import assert from "node:assert/strict";
import test from "node:test";
import { CRM_REVISIONED, crmCommandSchema, crmPermission, crmRequestSchema } from "./crm-commands";

const id = "cjld2cjxh0000qzrmn831i7rn";

test("CRM komutları: izin web Server Action'larıyla aynı", () => {
  assert.equal(crmPermission("conversation.read"), "conversation:read");
  assert.equal(crmPermission("conversation.control"), "conversation:reply");
  assert.equal(crmPermission("conversation.ai_suggest"), "conversation:reply");
  assert.equal(crmPermission("lead.merge"), "lead:write");
  assert.ok(CRM_REVISIONED.has("lead.stage") && !CRM_REVISIONED.has("lead.note"));
});

test("CRM komutları: alan sınırları ve bilinmeyen alan reddi", () => {
  assert.ok(crmCommandSchema.safeParse({ type: "lead.note", leadId: id, note: "Akşam ara" }).success);
  assert.equal(crmCommandSchema.safeParse({ type: "lead.note", leadId: id, note: "x" }).success, false, "not en az 2 karakter");
  assert.equal(crmCommandSchema.safeParse({ type: "lead.note", leadId: id, note: "Akşam", extra: 1 }).success, false);
  assert.equal(crmCommandSchema.safeParse({ type: "lead.stage", leadId: id, stage: "BİLİNMEYEN" }).success, false);
  assert.equal(crmCommandSchema.safeParse({ type: "conversation.tag", conversationId: id, tag: "x".repeat(41) }).success, false);
  assert.equal(crmCommandSchema.safeParse({ type: "lead.drop", leadId: id }).success, false);
  assert.equal(crmRequestSchema.safeParse({ command: { type: "conversation.read", conversationId: id }, idempotencyKey: "anahtar" }).success, false, "işlem anahtarı UUID");
});
