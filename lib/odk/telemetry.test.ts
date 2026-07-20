import assert from "node:assert/strict";
import test from "node:test";
import { odkAnsweredBand, odkAttemptBand, odkDurationBand, odkLateEntryBand } from "./telemetry";

test("ODK telemetrisi kimlik yerine kontrollü bant üretir", () => {
  const start = new Date("2026-01-01T10:00:00Z");
  assert.equal(odkLateEntryBand(start, new Date("2026-01-01T10:07:00Z")), "6M+");
  assert.equal(odkAnsweredBand(20), "11-20");
  assert.equal(odkAttemptBand(51), "51+");
  assert.equal(odkDurationBand(start, new Date("2026-01-01T11:01:00Z")), "61M+");
});
