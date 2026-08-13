import assert from "node:assert/strict";
import test from "node:test";
import { buildOdPlacementExpectation, calculateOdPlacementMetrics } from "./placement";

test("kapasite sinyali garantili koltuk vaadi üretmez", () => {
  const result = buildOdPlacementExpectation([{ capacity: 4, enrollmentCount: 3, nextLessonAt: new Date("2026-08-14T15:00:00Z") }], new Date("2026-08-13T10:00:00Z"));
  assert.equal(result.capacitySignal, "LIMITED");
  assert.match(result.capacityLabel, /Olası/);
  assert.match(result.expectedStartLabel, /tahminen/);
});

test("yerleştirme metrikleri geçiş zamanlarından ve sonuçlardan hesaplanır", () => {
  const at = (hours: number) => new Date(Date.UTC(2026, 7, 13, hours));
  const result = calculateOdPlacementMetrics([
    { onboardingId: "a", toState: "PAID", occurredAt: at(0) },
    { onboardingId: "a", toState: "CONTACTED", occurredAt: at(4) },
    { onboardingId: "a", toState: "PLACEMENT_PENDING", occurredAt: at(5) },
    { onboardingId: "a", toState: "GROUP_ASSIGNED", occurredAt: at(11) },
    { onboardingId: "b", toState: "PAID", occurredAt: at(1) },
    { onboardingId: "b", toState: "WAITLISTED", occurredAt: at(8) },
  ]);
  assert.equal(result.firstContactHours, 4);
  assert.equal(result.placementHours, 6);
  assert.equal(result.noSlotRate, 50);
  assert.deepEqual(result.outcomes, { assigned: 1, alternate: 0, waitlist: 1, refund: 0 });
});
