import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedOdOnboardingTransitions,
  dueAtForOdOnboardingState,
  validateOdOnboardingPrerequisite,
} from "./onboarding-state";

test("normal onboarding sırası atlanamaz ve istisna yolları görünürdür", () => {
  assert.deepEqual(allowedOdOnboardingTransitions("CONTACTED"), ["ACCOUNT_READY", "BLOCKED", "REFUND_PENDING", "CANCELED"]);
  assert.equal(allowedOdOnboardingTransitions("CONTACTED").includes("GROUP_ASSIGNED"), false);
  assert.deepEqual(allowedOdOnboardingTransitions("BLOCKED", "CONTACTED"), ["CONTACTED", "REFUND_PENDING", "CANCELED"]);
  assert.deepEqual(allowedOdOnboardingTransitions("MANUAL_REVIEW", "PAID"), ["PAID", "BLOCKED", "REFUND_PENDING", "CANCELED"]);
  assert.deepEqual(allowedOdOnboardingTransitions("CANCELED"), []);
});

test("SLA geçiş yapılan durumdan deterministik hesaplanır", () => {
  const enteredAt = new Date("2026-08-11T12:00:00.000Z");
  assert.equal(dueAtForOdOnboardingState("CONTACT_PENDING", enteredAt)?.toISOString(), "2026-08-12T12:00:00.000Z");
  assert.equal(dueAtForOdOnboardingState("ACTIVE", enteredAt), null);
});

test("hesap, veli, grup ve ilk ders eksikleri ileri adımları engeller", () => {
  const none = { hasStudentAccount: false, hasParentLink: false, hasGroupAssignment: false, hasFirstLesson: false };
  assert.match(validateOdOnboardingPrerequisite("ACCOUNT_READY", none) || "", /öğrenci hesabına/);
  assert.match(validateOdOnboardingPrerequisite("PARENT_LINKED", { ...none, hasStudentAccount: true }) || "", /veli bağlantısı/);
  assert.match(validateOdOnboardingPrerequisite("GROUP_ASSIGNED", { ...none, hasStudentAccount: true, hasParentLink: true }) || "", /grup ataması/);
  assert.match(validateOdOnboardingPrerequisite("ACTIVE", { ...none, hasStudentAccount: true, hasParentLink: true, hasGroupAssignment: true }) || "", /ilk ders/);
  assert.equal(validateOdOnboardingPrerequisite("ACTIVE", { hasStudentAccount: true, hasParentLink: true, hasGroupAssignment: true, hasFirstLesson: true }), null);
});
