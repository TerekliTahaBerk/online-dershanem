/**
 * Sprint 6.5 — Smoke test runner for lesson lifecycle.
 *
 * Two modes:
 *   1. Pure unit checks (default): cron auth logic, join URL validation,
 *      state machine edge cases. NO DB.
 *
 *   2. DB integration (if DATABASE_URL set): real E2E against test DB.
 *      Creates a throwaway test user/teacher/student/lesson, drives the
 *      full lifecycle, verifies Attendance(AUTO), then cleans up.
 *
 * Usage:
 *   npx tsx scripts/smoke-lesson-lifecycle.ts          # unit only
 *   DATABASE_URL=... DIRECT_URL=... \
 *     npx tsx scripts/smoke-lesson-lifecycle.ts --db   # with DB
 */
import { canStart, canEnd, canCancel, shouldAutoEnd, shouldAutoMissed } from "../lib/lessons/lifecycle";
import { ManualMeetingProvider, isValidMeetingUrl } from "../lib/lessons/meeting-provider";

const args = new Set(process.argv.slice(2));
const withDb = args.has("--db") && !!process.env.DATABASE_URL;

let pass = 0, fail = 0;
function ok(name: string) { console.log(`  ✓ ${name}`); pass++; }
function bad(name: string, err: unknown) {
  console.error(`  ✗ ${name}\n    ${err instanceof Error ? err.message : err}`);
  fail++;
}
function check(name: string, cond: unknown) {
  try { if (!cond) throw new Error("assertion failed"); ok(name); } catch (e) { bad(name, e); }
}

// ── 1. Cron auth simulation ─────────────────────────────────────────────────
console.log("\n[1/9] Cron auth logic (no HTTP)");
function simulateCronAuth(headers: Record<string, string>, secretEnv: string | undefined): "ok" | "401" {
  // Mirrors lib/jobs/runner.ts: isAuthorized()
  if (!secretEnv) return "ok"; // dev fallback
  if (headers["authorization"] === `Bearer ${secretEnv}`) return "ok";
  if ((headers["user-agent"] ?? "").startsWith("vercel-cron") && !headers["authorization"]) return "ok";
  return "401";
}
check("missing secret + no auth → ok (dev)", simulateCronAuth({}, undefined) === "ok");
check("bad bearer → 401",                       simulateCronAuth({ authorization: "Bearer wrong" }, "real") === "401");
check("correct bearer → ok",                    simulateCronAuth({ authorization: "Bearer real" }, "real") === "ok");
check("vercel-cron UA + no auth → ok",          simulateCronAuth({ "user-agent": "vercel-cron 1.0" }, "real") === "ok");
check("vercel-cron UA + bad auth → 401",        simulateCronAuth({ "user-agent": "vercel-cron 1.0", authorization: "Bearer x" }, "real") === "401");
check("normal UA + no auth → 401",              simulateCronAuth({ "user-agent": "Mozilla/5.0" }, "real") === "401");

// ── 2. Edge-case state machine guards ──────────────────────────────────────
console.log("\n[2/9] Edge-case state guards");
const now = new Date("2026-05-26T12:00:00Z");
check("student early-join → SCHEDULED canStart='OUT_OF_WINDOW' if too early", (() => {
  const early = new Date(now.getTime() - 31 * 60_000);
  const r = canStart({ status: "SCHEDULED" as const, scheduledAt: now, duration: 60, now: early, meetingJoinUrl: "https://x" });
  return !r.ok && r.code === "OUT_OF_WINDOW";
})());
check("teacher first join in window + URL → ok (auto-LIVE)", (() => {
  const r = canStart({ status: "SCHEDULED" as const, scheduledAt: now, duration: 60, now, meetingJoinUrl: "https://x" });
  return r.ok;
})());
check("heartbeat to non-LIVE: blocked at app layer (canEnd shows non-LIVE rejected)", (() => {
  const r = canEnd({ status: "SCHEDULED" as const });
  return !r.ok && r.code === "INVALID_TRANSITION";
})());
check("CANCELLED join blocked: canStart rejects", (() => {
  const r = canStart({ status: "CANCELLED" as const, scheduledAt: now, duration: 60, now, meetingJoinUrl: "https://x" });
  return !r.ok && r.code === "INVALID_TRANSITION";
})());
check("ENDED join blocked: canEnd rejects re-end", (() => {
  const r = canEnd({ status: "ENDED" as never });
  return !r.ok && r.code === "INVALID_TRANSITION";
})());
check("MISSED join blocked: canStart rejects re-start", (() => {
  const r = canStart({ status: "MISSED" as never, scheduledAt: now, duration: 60, now, meetingJoinUrl: "https://x" });
  return !r.ok && r.code === "INVALID_TRANSITION";
})());

// ── 3. Meeting URL validation ──────────────────────────────────────────────
console.log("\n[3/9] Meeting URL validation");
check("https accepted",      isValidMeetingUrl("https://meet.google.com/abc-defg-hij"));
check("http accepted",       isValidMeetingUrl("http://example.com/x"));
check("javascript: rejected", !isValidMeetingUrl("javascript:alert(1)"));
check("file: rejected",       !isValidMeetingUrl("file:///etc/passwd"));
check("empty rejected",       !isValidMeetingUrl(""));
check("garbage rejected",     !isValidMeetingUrl("not-a-url"));

// ── 4. Manual override invariant (provider preference) ─────────────────────
console.log("\n[4/9] Manual override / provider preference");
check("new meetingJoinUrl beats legacy googleMeetLink", (() => {
  const r = ManualMeetingProvider.resolve({
    id: "x", meetingProvider: "MANUAL", meetingRoomId: null,
    meetingJoinUrl: "https://new", meetingHostUrl: null, googleMeetLink: "https://legacy",
  });
  return r.joinUrl === "https://new";
})());
check("legacy googleMeetLink used when meetingJoinUrl null", (() => {
  const r = ManualMeetingProvider.resolve({
    id: "x", meetingProvider: null, meetingRoomId: null,
    meetingJoinUrl: null, meetingHostUrl: null, googleMeetLink: "https://legacy",
  });
  return r.joinUrl === "https://legacy";
})());

// ── 5. Fan-out / sessionGroupId determinism ────────────────────────────────
console.log("\n[5/9] Fan-out semantics");
function simulateTeacherDedup(lessons: { id: string; sessionGroupId: string | null; teacherUserId: string | null }[]) {
  const seen = new Set<string>();
  let teacherPushes = 0;
  for (const l of lessons) {
    if (!l.teacherUserId) continue;
    const key = `${l.teacherUserId}|${l.sessionGroupId ?? `solo:${l.id}`}`;
    if (!seen.has(key)) { seen.add(key); teacherPushes++; }
  }
  return teacherPushes;
}
check("3 students in 1 session → teacher push 1x", (() => {
  const out = simulateTeacherDedup([
    { id: "a", sessionGroupId: "s1", teacherUserId: "t" },
    { id: "b", sessionGroupId: "s1", teacherUserId: "t" },
    { id: "c", sessionGroupId: "s1", teacherUserId: "t" },
  ]);
  return out === 1;
})());
check("3 solo lessons → teacher push 3x", (() => {
  const out = simulateTeacherDedup([
    { id: "a", sessionGroupId: null, teacherUserId: "t" },
    { id: "b", sessionGroupId: null, teacherUserId: "t" },
    { id: "c", sessionGroupId: null, teacherUserId: "t" },
  ]);
  return out === 3;
})());
check("mixed: 2 students in s1 + 1 solo → teacher push 2x", (() => {
  const out = simulateTeacherDedup([
    { id: "a", sessionGroupId: "s1", teacherUserId: "t" },
    { id: "b", sessionGroupId: "s1", teacherUserId: "t" },
    { id: "c", sessionGroupId: null, teacherUserId: "t" },
  ]);
  return out === 2;
})());

// ── 6. Auto-end grace boundary ─────────────────────────────────────────────
console.log("\n[6/9] Auto-end grace boundary");
check("LIVE + (sched + dur + 29min) → NOT auto-end", (() => {
  const sched = new Date(now.getTime() - 60 * 60_000 - 29 * 60_000);
  return !shouldAutoEnd({ status: "LIVE" as never, scheduledAt: sched, duration: 60, now });
})());
check("LIVE + (sched + dur + 31min) → AUTO-END", (() => {
  const sched = new Date(now.getTime() - 60 * 60_000 - 31 * 60_000);
  return shouldAutoEnd({ status: "LIVE" as never, scheduledAt: sched, duration: 60, now });
})());
check("SCHEDULED + 29 min past → NOT missed", (() => {
  const sched = new Date(now.getTime() - 29 * 60_000);
  return !shouldAutoMissed({ status: "SCHEDULED" as const, scheduledAt: sched, duration: 60, now });
})());
check("SCHEDULED + 31 min past → MISSED", (() => {
  const sched = new Date(now.getTime() - 31 * 60_000);
  return shouldAutoMissed({ status: "SCHEDULED" as const, scheduledAt: sched, duration: 60, now });
})());

// ── 7. Cancel from any state ───────────────────────────────────────────────
console.log("\n[7/9] Cancel guards");
check("SCHEDULED → cancel ok",  canCancel({ status: "SCHEDULED" as const }).ok);
check("LIVE → cancel ok",        canCancel({ status: "LIVE" as never }).ok);
check("ENDED → cancel rejected", !canCancel({ status: "ENDED" as never }).ok);
check("MISSED → cancel rejected", !canCancel({ status: "MISSED" as never }).ok);
check("COMPLETED → cancel rejected", !canCancel({ status: "COMPLETED" as const }).ok);

// ── 8. Mobile API contract shape (purely static) ──────────────────────────
console.log("\n[8/9] Mobile response contract (legacy meetLink preserved)");
function shape(l: { meetingJoinUrl: string | null; googleMeetLink: string | null; startedAt: Date | null; endedAt: Date | null; status: string }) {
  return {
    meetLink: l.meetingJoinUrl ?? l.googleMeetLink,          // legacy field still present
    meetingJoinUrl: l.meetingJoinUrl,                          // new
    startedAt: l.startedAt?.toISOString() ?? null,             // new
    endedAt: l.endedAt?.toISOString() ?? null,                 // new
    status: l.status,                                           // exists pre-Sprint6
  };
}
check("legacy meetLink falls back to googleMeetLink", (() => {
  const r = shape({ meetingJoinUrl: null, googleMeetLink: "https://legacy", startedAt: null, endedAt: null, status: "SCHEDULED" });
  return r.meetLink === "https://legacy" && r.meetingJoinUrl === null;
})());
check("legacy meetLink prefers new meetingJoinUrl", (() => {
  const r = shape({ meetingJoinUrl: "https://new", googleMeetLink: "https://legacy", startedAt: null, endedAt: null, status: "LIVE" });
  return r.meetLink === "https://new" && r.meetingJoinUrl === "https://new";
})());
check("ENDED with timestamps emits ISO strings", (() => {
  const r = shape({ meetingJoinUrl: null, googleMeetLink: null, startedAt: new Date("2026-05-26T12:00:00Z"), endedAt: new Date("2026-05-26T13:00:00Z"), status: "ENDED" });
  return r.startedAt === "2026-05-26T12:00:00.000Z" && r.endedAt === "2026-05-26T13:00:00.000Z";
})());

// ── 9. Optional DB integration ──────────────────────────────────────────────
if (withDb) {
  console.log("\n[9/9] DB integration E2E (--db)");
  (async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { computeAutoAttendanceForLesson } = await import("../lib/lessons/auto-attendance");
    const prisma = new PrismaClient();
    const tag = `smoke-${Date.now()}`;
    try {
      // Create user/teacher/student/lesson with throwaway phone (phoneKey unique).
      const teacherUser = await prisma.user.create({ data: { email: `${tag}-t@x.local`, name: "T", role: "TEACHER" } });
      const studentUser = await prisma.user.create({ data: { email: `${tag}-s@x.local`, name: "S", role: "STUDENT" } });
      const teacher = await prisma.teacher.create({ data: { fullName: "Test T", subjects: "Test", userId: teacherUser.id } });
      const student = await prisma.student.create({
        data: { fullName: "Test S", phone: `+9${tag}`, phoneKey: `+9${tag}`, userId: studentUser.id },
      });
      const lesson = await prisma.lesson.create({
        data: {
          studentId: student.id, teacherId: teacher.id,
          scheduledAt: new Date(),
          duration: 60,
          status: "SCHEDULED",
          meetingJoinUrl: "https://meet.example.com/test",
          meetingProvider: "MANUAL",
        },
      });
      // Transition: SCHEDULED → LIVE (manually, simulating action)
      await prisma.lesson.update({ where: { id: lesson.id }, data: { status: "LIVE", startedAt: new Date() } });
      // Student JOIN event
      await prisma.lessonJoinEvent.create({
        data: { lessonId: lesson.id, studentId: student.id, userId: studentUser.id, kind: "JOIN" },
      });
      await new Promise((r) => setTimeout(r, 100));
      // Heartbeat
      await prisma.lessonJoinEvent.create({
        data: { lessonId: lesson.id, studentId: student.id, userId: studentUser.id, kind: "HEARTBEAT" },
      });
      // Leave
      await prisma.lessonJoinEvent.create({
        data: { lessonId: lesson.id, studentId: student.id, userId: studentUser.id, kind: "LEAVE" },
      });
      // End
      await prisma.lesson.update({ where: { id: lesson.id }, data: { status: "ENDED", endedAt: new Date() } });
      // Auto-attendance
      const result = await computeAutoAttendanceForLesson(prisma, { lessonId: lesson.id });
      check("auto-attendance created exactly 1", result.created === 1);
      // Run twice → idempotent (no new row)
      const result2 = await computeAutoAttendanceForLesson(prisma, { lessonId: lesson.id });
      check("second run idempotent: 0 created", result2.created === 0 && result2.total === 1);
      const att = await prisma.attendance.findFirst({ where: { lessonId: lesson.id } });
      check("attendance source=AUTO",            att?.source === "AUTO");
      check("attendance status PRESENT or LATE", att?.status === "PRESENT" || att?.status === "LATE");
      check("firstJoinedAt set",                 att?.firstJoinedAt != null);

      // Manual override does NOT get overwritten by auto-attendance recompute.
      await prisma.attendance.update({ where: { id: att!.id }, data: { source: "MANUAL", status: "ABSENT" } });
      const result3 = await computeAutoAttendanceForLesson(prisma, { lessonId: lesson.id });
      check("manual override respected: skippedManual=1", result3.skippedManual === 1 && result3.created === 0);
      const att2 = await prisma.attendance.findFirst({ where: { lessonId: lesson.id } });
      check("manual status preserved (ABSENT)", att2?.status === "ABSENT" && att2.source === "MANUAL");

      // Cleanup
      await prisma.lessonJoinEvent.deleteMany({ where: { lessonId: lesson.id } });
      await prisma.attendance.deleteMany({ where: { lessonId: lesson.id } });
      await prisma.lesson.delete({ where: { id: lesson.id } });
      await prisma.student.delete({ where: { id: student.id } });
      await prisma.teacher.delete({ where: { id: teacher.id } });
      await prisma.user.delete({ where: { id: teacherUser.id } });
      await prisma.user.delete({ where: { id: studentUser.id } });
      await prisma.$disconnect();
      summary();
    } catch (e) {
      bad("DB integration", e);
      await prisma.$disconnect().catch(() => null);
      summary();
    }
  })();
} else {
  console.log("\n[9/9] DB integration — SKIPPED (no --db or DATABASE_URL).");
  summary();
}

function summary() {
  console.log(`\n${pass}/${pass + fail} checks passed${fail ? ` — ${fail} FAILED` : ""}`);
  process.exit(fail ? 1 : 0);
}
