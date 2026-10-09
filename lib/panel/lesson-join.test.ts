import assert from "node:assert/strict";
import { test } from "node:test";

import { lessonJoinState, lessonJoinWindow } from "./lesson-join";

const now = new Date("2026-10-08T10:00:00.000Z");
const minutes = (value: number) => new Date(now.getTime() + value * 60000);

test("lessonJoinWindow: 30 dk önce açılır, başladıktan 90 dk sonra kapanır", () => {
  assert.equal(lessonJoinWindow(minutes(31), now).joinsNow, false);
  assert.deepEqual(lessonJoinWindow(minutes(30), now), { minutesUntilStart: 30, startsSoon: true, activeNow: false, joinsNow: true });
  assert.equal(lessonJoinWindow(minutes(0), now).startsSoon, true);
  assert.deepEqual(lessonJoinWindow(minutes(-90), now), { minutesUntilStart: -90, startsSoon: false, activeNow: true, joinsNow: true });
  assert.equal(lessonJoinWindow(minutes(-91), now).joinsNow, false);
});

const base = { status: "PLANNED" as const, meetingUrl: "https://meet.example.com/abc", enrollmentActive: true, now };

test("lessonJoinState: bağlantı yalnız pencere açık ve kayıt aktifken verilir", () => {
  assert.deepEqual(lessonJoinState({ ...base, startsAt: minutes(10) }), { state: "OPEN", url: "https://meet.example.com/abc", opensAt: null });
  const notYet = lessonJoinState({ ...base, startsAt: minutes(120) });
  assert.equal(notYet.state, "NOT_YET");
  assert.equal(notYet.url, null);
  assert.equal(notYet.opensAt?.toISOString(), minutes(90).toISOString());
  assert.deepEqual(lessonJoinState({ ...base, startsAt: minutes(-200) }), { state: "ENDED", url: null, opensAt: null });
});

test("lessonJoinState: iptal, tamamlanmış, pasif kayıt, bağlantısız veya güvensiz bağlantı", () => {
  assert.equal(lessonJoinState({ ...base, status: "CANCELLED", startsAt: minutes(5) }).state, "UNAVAILABLE");
  assert.deepEqual(lessonJoinState({ ...base, status: "COMPLETED", startsAt: minutes(-10) }), { state: "ENDED", url: null, opensAt: null });
  assert.deepEqual(lessonJoinState({ ...base, enrollmentActive: false, startsAt: minutes(5) }), { state: "UNAVAILABLE", url: null, opensAt: null });
  assert.equal(lessonJoinState({ ...base, meetingUrl: null, startsAt: minutes(5) }).state, "UNAVAILABLE");
  assert.equal(lessonJoinState({ ...base, meetingUrl: "javascript:alert(1)", startsAt: minutes(5) }).state, "UNAVAILABLE");
});
