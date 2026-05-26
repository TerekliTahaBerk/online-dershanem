/**
 * Sprint 6 — Unit tests for lesson lifecycle state machine + meeting provider.
 * Run: npx tsx scripts/test-lesson-lifecycle.ts
 *
 * DB GEREKTİRMEZ.
 */
import {
  canStart, canEnd, canCancel,
  shouldAutoEnd, shouldAutoMissed,
  lessonStatusLabel, lessonStatusTone,
  AUTO_END_GRACE_MS, AUTO_MISSED_GRACE_MS,
  START_GRACE_BEFORE_MS, START_GRACE_AFTER_MS,
} from "../lib/lessons/lifecycle";
import {
  ManualMeetingProvider, resolveMeetingLink, getMeetingProvider, isValidMeetingUrl,
} from "../lib/lessons/meeting-provider";

type Test = { name: string; fn: () => void };
const tests: Test[] = [];
function test(name: string, fn: () => void) { tests.push({ name, fn }); }
function assert(cond: unknown, msg: string) { if (!cond) throw new Error(msg); }
function assertEq<T>(a: T, b: T, msg: string) {
  if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

const now = new Date("2026-05-26T12:00:00Z");

// ── canStart ────────────────────────────────────────────────────────────────
test("canStart: SCHEDULED + in window + meeting URL → ok", () => {
  const r = canStart({
    status: "SCHEDULED" as const,
    scheduledAt: now,
    duration: 60,
    now,
    meetingJoinUrl: "https://meet.example.com/x",
  });
  assert(r.ok, "should be ok");
  if (r.ok) assertEq(r.nextStatus, "LIVE" as never, "next=LIVE");
});

test("canStart: LIVE → INVALID_TRANSITION", () => {
  const r = canStart({
    status: "LIVE" as never,
    scheduledAt: now,
    duration: 60,
    now,
    meetingJoinUrl: "https://x",
  });
  assert(!r.ok, "should fail");
  if (!r.ok) assertEq(r.code, "INVALID_TRANSITION", "code");
});

test("canStart: out of window (too early) → OUT_OF_WINDOW", () => {
  const earlier = new Date(now.getTime() - START_GRACE_BEFORE_MS - 60_000);
  const r = canStart({
    status: "SCHEDULED" as const,
    scheduledAt: now,
    duration: 60,
    now: earlier,
    meetingJoinUrl: "https://x",
  });
  assert(!r.ok, "should fail");
  if (!r.ok) assertEq(r.code, "OUT_OF_WINDOW", "code");
});

test("canStart: out of window (too late) → OUT_OF_WINDOW", () => {
  const later = new Date(now.getTime() + START_GRACE_AFTER_MS + 60_000);
  const r = canStart({
    status: "SCHEDULED" as const,
    scheduledAt: now,
    duration: 60,
    now: later,
    meetingJoinUrl: "https://x",
  });
  assert(!r.ok, "should fail");
  if (!r.ok) assertEq(r.code, "OUT_OF_WINDOW", "code");
});

test("canStart: no joinUrl → NO_JOIN_URL", () => {
  const r = canStart({
    status: "SCHEDULED" as const,
    scheduledAt: now,
    duration: 60,
    now,
    meetingJoinUrl: "",
  });
  assert(!r.ok, "should fail");
  if (!r.ok) assertEq(r.code, "NO_JOIN_URL", "code");
});

// ── canEnd ──────────────────────────────────────────────────────────────────
test("canEnd: LIVE → ok", () => {
  const r = canEnd({ status: "LIVE" as never });
  assert(r.ok, "ok");
});
test("canEnd: SCHEDULED → INVALID_TRANSITION", () => {
  const r = canEnd({ status: "SCHEDULED" as const });
  assert(!r.ok, "fail");
});
test("canEnd: ENDED → INVALID_TRANSITION", () => {
  const r = canEnd({ status: "ENDED" as never });
  assert(!r.ok, "fail");
});

// ── canCancel ───────────────────────────────────────────────────────────────
test("canCancel: SCHEDULED → ok", () => {
  const r = canCancel({ status: "SCHEDULED" as const });
  assert(r.ok, "ok");
});
test("canCancel: LIVE → ok", () => {
  const r = canCancel({ status: "LIVE" as never });
  assert(r.ok, "ok");
});
test("canCancel: ENDED → INVALID_TRANSITION", () => {
  const r = canCancel({ status: "ENDED" as never });
  assert(!r.ok, "fail");
});
test("canCancel: COMPLETED → INVALID_TRANSITION", () => {
  const r = canCancel({ status: "COMPLETED" as const });
  assert(!r.ok, "fail");
});

// ── shouldAutoEnd ───────────────────────────────────────────────────────────
test("shouldAutoEnd: LIVE + past cutoff → true", () => {
  const past = new Date(now.getTime() - 60 * 60_000 - AUTO_END_GRACE_MS - 60_000);
  assertEq(
    shouldAutoEnd({ status: "LIVE" as never, scheduledAt: past, duration: 60, now }),
    true,
    "auto-end",
  );
});
test("shouldAutoEnd: LIVE + before cutoff → false", () => {
  assertEq(
    shouldAutoEnd({ status: "LIVE" as never, scheduledAt: now, duration: 60, now }),
    false,
    "no auto-end",
  );
});
test("shouldAutoEnd: SCHEDULED → false", () => {
  const past = new Date(now.getTime() - 24 * 60 * 60_000);
  assertEq(
    shouldAutoEnd({ status: "SCHEDULED" as const, scheduledAt: past, duration: 60, now }),
    false,
    "scheduled never auto-ends",
  );
});

// ── shouldAutoMissed ────────────────────────────────────────────────────────
test("shouldAutoMissed: SCHEDULED + past grace → true", () => {
  const past = new Date(now.getTime() - AUTO_MISSED_GRACE_MS - 60_000);
  assertEq(
    shouldAutoMissed({ status: "SCHEDULED" as const, scheduledAt: past, duration: 60, now }),
    true,
    "missed",
  );
});
test("shouldAutoMissed: SCHEDULED + in grace → false", () => {
  assertEq(
    shouldAutoMissed({ status: "SCHEDULED" as const, scheduledAt: now, duration: 60, now }),
    false,
    "not yet",
  );
});
test("shouldAutoMissed: LIVE → false", () => {
  const past = new Date(now.getTime() - 24 * 60 * 60_000);
  assertEq(
    shouldAutoMissed({ status: "LIVE" as never, scheduledAt: past, duration: 60, now }),
    false,
    "live not missed",
  );
});

// ── Labels ──────────────────────────────────────────────────────────────────
test("lessonStatusLabel: SCHEDULED → Planlandı", () => {
  assertEq(lessonStatusLabel("SCHEDULED" as const), "Planlandı", "label");
});
test("lessonStatusLabel: LIVE → Canlı", () => {
  assertEq(lessonStatusLabel("LIVE" as never), "Canlı", "label");
});
test("lessonStatusTone: LIVE → ok", () => {
  assertEq(lessonStatusTone("LIVE" as never), "ok", "tone");
});
test("lessonStatusTone: MISSED → warn", () => {
  assertEq(lessonStatusTone("MISSED" as never), "warn", "tone");
});

// ── Meeting provider ────────────────────────────────────────────────────────
test("ManualMeetingProvider: meetingJoinUrl preferred over googleMeetLink", () => {
  const r = ManualMeetingProvider.resolve({
    id: "x",
    meetingProvider: "MANUAL",
    meetingRoomId: null,
    meetingJoinUrl: "https://new",
    meetingHostUrl: null,
    googleMeetLink: "https://legacy",
  });
  assertEq(r.joinUrl, "https://new", "prefer new");
  assertEq(r.hostUrl, "https://new", "host=joinUrl when no host");
});
test("ManualMeetingProvider: falls back to googleMeetLink", () => {
  const r = ManualMeetingProvider.resolve({
    id: "x",
    meetingProvider: null,
    meetingRoomId: null,
    meetingJoinUrl: null,
    meetingHostUrl: null,
    googleMeetLink: "https://legacy",
  });
  assertEq(r.joinUrl, "https://legacy", "fallback");
});
test("ManualMeetingProvider: null when no link", () => {
  const r = ManualMeetingProvider.resolve({
    id: "x",
    meetingProvider: null,
    meetingRoomId: null,
    meetingJoinUrl: null,
    meetingHostUrl: null,
    googleMeetLink: null,
  });
  assertEq(r.joinUrl, null, "null");
});
test("getMeetingProvider: GOOGLE silently → MANUAL fallback", () => {
  const p = getMeetingProvider("GOOGLE");
  assertEq(p.kind, "MANUAL", "fallback to manual");
});
test("getMeetingProvider: unknown → MANUAL", () => {
  const p = getMeetingProvider("ZOOM");
  assertEq(p.kind, "MANUAL", "fallback");
});
test("resolveMeetingLink: returns provider field", () => {
  const r = resolveMeetingLink({
    id: "x", meetingProvider: "MANUAL", meetingRoomId: null,
    meetingJoinUrl: "https://x", meetingHostUrl: null, googleMeetLink: null,
  });
  assertEq(r.provider, "MANUAL", "provider name");
});
test("isValidMeetingUrl: https accepted", () => {
  assertEq(isValidMeetingUrl("https://meet.example.com/x"), true, "https");
});
test("isValidMeetingUrl: garbage rejected", () => {
  assertEq(isValidMeetingUrl("not-a-url"), false, "bad");
});

// ── Runner ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`✓ ${t.name}`);
    pass++;
  } catch (e) {
    console.error(`✗ ${t.name}\n  ${e instanceof Error ? e.message : e}`);
    fail++;
  }
}
console.log(`\n${pass}/${tests.length} passed${fail ? `, ${fail} failed` : ""}`);
process.exit(fail ? 1 : 0);
