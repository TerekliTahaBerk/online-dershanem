import assert from "node:assert/strict";
import test from "node:test";
import { academicSupportLabels, activeViewPreferenceCount, defaultAccessibilityViewPreference } from "./accessibility-preferences";

test("aktif tercihler tanı veya sağlık niteliği olmadan sayılır", () => {
  assert.equal(activeViewPreferenceCount({ ...defaultAccessibilityViewPreference, reducedMotion: true, textScale: "LARGE", captionsPreferred: true }), 3);
});

test("öğretmene yalnız uygulanabilir işlevsel destek etiketleri verilir", () => {
  assert.deepEqual(academicSupportLabels({ assessmentExtraPercent: 25, breaksAllowed: true, captionsPreferred: false, transcriptPreferred: true }), ["Değerlendirmede %25 ek süre", "Planlı kısa mola", "Metin dökümü"]);
  assert.deepEqual(academicSupportLabels({ assessmentExtraPercent: 0, breaksAllowed: false, captionsPreferred: false, transcriptPreferred: false }), []);
});
