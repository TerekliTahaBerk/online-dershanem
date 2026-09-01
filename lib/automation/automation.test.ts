import assert from "node:assert/strict";
import test from "node:test";

import { conditionsMatch, evaluateConditions } from "./conditions";
import {
  AUTOMATION_MAX_ACTIONS,
  AUTOMATION_MAX_RECURSION_DEPTH,
  AUTOMATION_TRIGGERS,
  PART12_TRIGGERS,
  TRIGGER_ALIASES,
} from "./definitions";
import {
  automationActionSchema,
  automationActionsSchema,
  automationConditionSchema,
  automationTriggerSchema,
} from "./schemas";
import {
  assertActionBudget,
  assertHourlyRateLimit,
  assertRecursionDepth,
  assertRuleEnabled,
  buildEventId,
} from "./safety";

test("Part 12 tetikleyicileri katalogda yer alır", () => {
  for (const trigger of PART12_TRIGGERS) {
    assert.ok(AUTOMATION_TRIGGERS.includes(trigger));
    assert.equal(automationTriggerSchema.safeParse(trigger).success, true);
  }
  assert.equal(TRIGGER_ALIASES.PAYMENT_COMPLETED, "order_paid");
  assert.equal(TRIGGER_ALIASES.order_paid, "PAYMENT_COMPLETED");
});

test("koşul eşleşmesi: source/product/severity/ownerEmpty", () => {
  assert.equal(
    conditionsMatch(
      { source: "Instagram", product: "ODK", severity: "high", ownerEmpty: true },
      { source: "INSTAGRAM_AD", product: "ONLINE_DENEME_KULUBU", severity: "high", ownerId: null },
    ),
    true,
  );
  assert.equal(
    conditionsMatch(
      { source: "instagram", product: "ODK" },
      { source: "MANUAL", product: "ODK" },
    ),
    false,
    "condition no-match",
  );
  assert.equal(
    evaluateConditions({ ownerEmpty: true }, { ownerId: "user_1" }),
    false,
  );
});

test("boş koşullar her bağlamla eşleşir", () => {
  assert.equal(conditionsMatch({}, { source: "manual" }), true);
  assert.equal(conditionsMatch({ temperature: "HOT" }, { temperature: "HOT" }), true);
  assert.equal(conditionsMatch({ temperature: "HOT" }, { temperature: "COLD" }), false);
});

test("aksiyon allowlist ve maksimum bütçe", () => {
  assert.equal(automationActionSchema.safeParse({ type: "create_task", title: "Takip et" }).success, true);
  assert.equal(automationActionSchema.safeParse({ type: "send_bomb" }).success, false);
  assert.equal(assertActionBudget(AUTOMATION_MAX_ACTIONS).ok, true);
  assert.equal(assertActionBudget(AUTOMATION_MAX_ACTIONS + 1).ok, false);
  assert.equal(
    automationActionsSchema.safeParse([
      { type: "add_tag", tag: "a" },
      { type: "add_tag", tag: "b" },
      { type: "add_tag", tag: "c" },
      { type: "add_tag", tag: "d" },
      { type: "add_tag", tag: "e" },
      { type: "add_tag", tag: "f" },
    ]).success,
    false,
  );
});

test("güvenlik: recursion, disabled, rate limit, eventId", () => {
  assert.equal(assertRecursionDepth(AUTOMATION_MAX_RECURSION_DEPTH).ok, true);
  assert.equal(assertRecursionDepth(AUTOMATION_MAX_RECURSION_DEPTH + 1).ok, false);
  assert.equal(assertRuleEnabled(false).ok, false);
  assert.equal(assertRuleEnabled(true).ok, true);
  assert.equal(assertHourlyRateLimit(29).ok, true);
  assert.equal(assertHourlyRateLimit(30).ok, false);
  assert.equal(
    buildEventId({ trigger: "lead_created", entityType: "lead", entityId: "abc" }),
    "lead_created:lead:abc:once",
  );
  assert.equal(
    buildEventId({ trigger: "lead_created", entityType: "lead", entityId: "abc", bucket: "2026-09-01" }),
    "lead_created:lead:abc:2026-09-01",
  );
});

test("onaylı e-posta şablonu dışındaki template reddedilir", () => {
  assert.equal(
    automationActionSchema.safeParse({
      type: "send_approved_template_email",
      templateKey: "automation_ops_alert",
    }).success,
    true,
  );
  assert.equal(
    automationActionSchema.safeParse({
      type: "send_approved_template_email",
      templateKey: "freeform_spam",
    }).success,
    false,
  );
});

test("koşul şeması bilinmeyen alanları strip eder / fail-closed parse", () => {
  const parsed = automationConditionSchema.safeParse({ severity: "high", hack: true });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal("hack" in parsed.data, false);
  assert.equal(conditionsMatch({ severity: "urgent" }, { severity: "urgent" }), false);
});
