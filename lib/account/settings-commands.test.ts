import test from "node:test";
import assert from "node:assert/strict";
import { SETTINGS_COMMAND_SECTION, SETTINGS_REVISIONED, settingsRequestSchema } from "./settings-commands";
import { settingsSectionsFor } from "./settings-sections";

const request = (command: Record<string, unknown>, extra: Record<string, unknown> = {}) => settingsRequestSchema.safeParse({ command, ...extra });

test("ayar komutları katıdır; boş metin null olur, telefon normalize edilir", () => {
  const parsed = request({ type: "profile", fullName: " Ece Kaya ", phone: "0532 111 22 33", city: "", district: "Bornova" });
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.data.command.type === "profile") {
    assert.equal(parsed.data.command.fullName, "Ece Kaya");
    assert.equal(parsed.data.command.phone, "+905321112233");
    assert.equal(parsed.data.command.city, null);
  }
  assert.equal(request({ type: "profile", fullName: "Ece", phone: "0532 111 22 33", userId: "başkası" }).success, false);
  assert.equal(request({ type: "billing", billingAddress: "x" }, { idempotencyKey: "anahtar" }).success, false);
  assert.equal(request({ type: "billing", billingAddress: "x" }, { expectedRevision: "kısa" }).success, false);
  assert.equal(request({ type: "cancelChild", childId: "" }).success, false);
  const consents = request({ type: "consents", kvkkConsent: true, marketingConsent: false });
  assert.equal(consents.success && consents.data.command.type === "consents" && consents.data.command.kvkkConsent, true);
});

test("her komutun bölümü rol kapsamıyla eşleşir; yalnız formu yeniden yazanlar revizyon ister", () => {
  assert.equal(settingsSectionsFor("TEACHER").includes(SETTINGS_COMMAND_SECTION.billing), false);
  assert.equal(settingsSectionsFor("STUDENT").includes(SETTINGS_COMMAND_SECTION.addChild), false);
  assert.equal(settingsSectionsFor("PARENT").includes(SETTINGS_COMMAND_SECTION.education), false);
  assert.equal(SETTINGS_REVISIONED.has("addChild"), false);
  assert.equal(SETTINGS_REVISIONED.has("profile"), true);
});
