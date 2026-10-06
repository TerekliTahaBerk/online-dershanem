import assert from "node:assert/strict";
import test from "node:test";

import {
  canViewerSeeTimelineEvent,
  crossProductEventTimelineVisibility,
  timelineVisibilitiesForViewer,
} from "./visibility";

test("P0-1 zaman çizelgesi: öğrenci ve veli STAFF/INTERNAL olay görmez", () => {
  assert.deepEqual(timelineVisibilitiesForViewer("STUDENT"), ["STUDENT", "PARENT"]);
  assert.deepEqual(timelineVisibilitiesForViewer("PARENT"), ["PARENT"]);
  for (const viewer of ["STUDENT", "PARENT"] as const) {
    assert.equal(canViewerSeeTimelineEvent("STAFF", viewer), false, `${viewer} STAFF görmemeli`);
    assert.equal(canViewerSeeTimelineEvent("INTERNAL", viewer), false, `${viewer} INTERNAL görmemeli`);
  }
});

test("P0-1 zaman çizelgesi: öğretmen INTERNAL görmez, admin hepsini görür", () => {
  assert.deepEqual(timelineVisibilitiesForViewer("TEACHER"), ["STAFF", "STUDENT", "PARENT"]);
  assert.deepEqual(timelineVisibilitiesForViewer("ADMIN"), ["INTERNAL", "STAFF", "STUDENT", "PARENT"]);
});

test("P0-1 çapraz ürün olayları: müdahale ve kazanım yeniden puanlama yalnız personel", () => {
  assert.equal(crossProductEventTimelineVisibility("INTERVENTION_CREATED"), "STAFF");
  assert.equal(crossProductEventTimelineVisibility("OUTCOME_MASTERY_CHANGED"), "STAFF");
  assert.equal(crossProductEventTimelineVisibility("LESSON_COMPLETED"), "PARENT");
  assert.equal(crossProductEventTimelineVisibility("MOCK_EXAM_RESULT_PUBLISHED"), "PARENT");
  // Bilinmeyen / yeni tip öğrenci ve veliye kendiliğinden açılmaz.
  assert.equal(crossProductEventTimelineVisibility("SOME_FUTURE_EVENT"), "STAFF");
  assert.equal(crossProductEventTimelineVisibility("toString"), "STAFF");
});
