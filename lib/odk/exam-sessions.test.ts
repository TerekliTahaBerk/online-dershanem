import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LGS_FULL_SESSION_PLAN,
  canCloseSession,
  canSubmitSessionAttempt,
  computeSessionTimeline,
  readSessionPlan,
  sectionWritable,
  sessionForSection,
  sessionPlanTotalMinutes,
} from "./exam-sessions";

const start = new Date("2026-10-10T09:30:00.000Z");
const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000);
const hard = at(300);
const timeline = (now: number, closures: Array<{ key: string; closedAt: Date }> = [], hardDeadline = hard) =>
  computeSessionTimeline({ plan: LGS_FULL_SESSION_PLAN, startedAt: start, hardDeadline, closures, now: at(now) });

test("LGS planı ayarlardan okunur ve doğrulanır", () => {
  assert.deepEqual(readSessionPlan({ sessions: LGS_FULL_SESSION_PLAN }), LGS_FULL_SESSION_PLAN);
  assert.equal(readSessionPlan({}), null);
  assert.equal(readSessionPlan(null), null);
  assert.equal(readSessionPlan({ sessions: [LGS_FULL_SESSION_PLAN[0]] }), null, "tek oturum plan değildir");
  assert.equal(readSessionPlan({ sessions: [LGS_FULL_SESSION_PLAN[0], { ...LGS_FULL_SESSION_PLAN[1], key: "SOZEL" }] }), null, "tekrarlı anahtar");
  assert.equal(readSessionPlan({ sessions: [LGS_FULL_SESSION_PLAN[0], { ...LGS_FULL_SESSION_PLAN[1], sectionCodes: ["TURKCE"] }] }), null, "bölüm iki oturumda olamaz");
  assert.equal(readSessionPlan({ sessions: [LGS_FULL_SESSION_PLAN[0], { ...LGS_FULL_SESSION_PLAN[1], durationMinutes: 0 }] }), null);
  assert.equal(readSessionPlan({ sessions: [LGS_FULL_SESSION_PLAN[0], { ...LGS_FULL_SESSION_PLAN[1], sectionCodes: [] }] }), null);
  assert.equal(readSessionPlan({ sessions: [LGS_FULL_SESSION_PLAN[0], "x"] }), null);
  assert.equal(readSessionPlan({ sessions: [LGS_FULL_SESSION_PLAN[0], { ...LGS_FULL_SESSION_PLAN[1], breakAfterMinutes: -1 }] }), null);
  const titleless = readSessionPlan({ sessions: [{ key: "A", sectionCodes: ["X"], durationMinutes: 10 }, { key: "B", sectionCodes: ["Y"], durationMinutes: 10 }] });
  assert.equal(titleless?.[0].title, "A");
  assert.equal(titleless?.[0].breakAfterMinutes, 0);
  assert.equal(sessionPlanTotalMinutes(LGS_FULL_SESSION_PLAN), 75 + 45 + 80);
  assert.equal(sessionForSection(LGS_FULL_SESSION_PLAN, "MAT")?.key, "SAYISAL");
  assert.equal(sessionForSection(LGS_FULL_SESSION_PLAN, "XYZ"), null);
});

test("Sözel açıkken yalnız Sözel bölümleri yazılabilir; teslim kapalı, oturum kapatılabilir", () => {
  const t = timeline(10);
  assert.equal(t.phase, "SESSION");
  assert.equal(t.current?.key, "SOZEL");
  assert.equal(t.current?.deadlineAt.toISOString(), at(75).toISOString());
  assert.equal(sectionWritable(t, "TURKCE"), true);
  assert.equal(sectionWritable(t, "MAT"), false);
  assert.equal(canSubmitSessionAttempt(t), false);
  assert.equal(canCloseSession(t, "SOZEL"), "OK");
  assert.equal(canCloseSession(t, "SAYISAL"), "NOT_ACTIVE");
  assert.equal(canCloseSession(t, "YOK"), "NOT_ACTIVE");
  assert.equal(t.finalDeadline.toISOString(), at(200).toISOString());
  assert.deepEqual(t.sessions.map((s) => s.status), ["ACTIVE", "UPCOMING"]);
});

test("süre dolunca Sözel kilitlenir ve ara başlar; ara bitince Sayısal taze süreyle açılır", () => {
  const brk = timeline(80);
  assert.equal(brk.phase, "BREAK");
  assert.equal(brk.current?.key, "SAYISAL");
  assert.equal(brk.breakEndsAt?.toISOString(), at(120).toISOString());
  assert.equal(sectionWritable(brk, "TURKCE"), false);
  assert.equal(sectionWritable(brk, "MAT"), false);
  assert.equal(canSubmitSessionAttempt(brk), false);
  assert.equal(canCloseSession(brk, "SOZEL"), "ALREADY_CLOSED");

  const say = timeline(121);
  assert.equal(say.phase, "SESSION");
  assert.equal(say.current?.key, "SAYISAL");
  assert.equal(say.isLastSession, true);
  assert.equal(say.current?.deadlineAt.toISOString(), at(200).toISOString());
  assert.equal(sectionWritable(say, "FEN"), true);
  assert.equal(sectionWritable(say, "TURKCE"), false);
  assert.equal(canSubmitSessionAttempt(say), true);
  assert.equal(canCloseSession(say, "SAYISAL"), "LAST_SESSION");

  const done = timeline(201);
  assert.equal(done.phase, "FINISHED");
  assert.equal(done.current, null);
  assert.equal(canSubmitSessionAttempt(done), true);
});

test("Sözel erken kapatılınca ara hemen başlar ve tüm takvim öne çekilir", () => {
  const closures = [{ key: "SOZEL", closedAt: at(30) }];
  const t = timeline(31, closures);
  assert.equal(t.phase, "BREAK");
  assert.equal(t.sessions[0].closedAt?.toISOString(), at(30).toISOString());
  assert.equal(t.breakEndsAt?.toISOString(), at(75).toISOString());
  assert.equal(t.finalDeadline.toISOString(), at(155).toISOString());
  // Pencere dışındaki ya da oturum öncesi kapanış kayıtları yok sayılır.
  const bogus = timeline(31, [{ key: "SOZEL", closedAt: at(-5) }]);
  assert.equal(bogus.phase, "SESSION");
});

test("sınav penceresi biterse oturumlar kısalır ve deneme biter", () => {
  const short = timeline(10, [], at(100));
  assert.equal(short.current?.deadlineAt.toISOString(), at(75).toISOString());
  assert.equal(short.sessions[1].startsAt.toISOString(), at(100).toISOString());
  assert.equal(short.finalDeadline.toISOString(), at(100).toISOString());
  const ended = timeline(100, [], at(100));
  assert.equal(ended.phase, "FINISHED");
});

test("oturum planı düzenlemesi yalnız süre ve arayı değiştirir", async () => {
  const { applySessionPlanEdits, sessionPlanWorkingMinutes } = await import("./exam-sessions");
  const ok = applySessionPlanEdits(LGS_FULL_SESSION_PLAN, [
    { key: "SAYISAL", durationMinutes: 90, breakAfterMinutes: 30 },
    { key: "SOZEL", durationMinutes: 70, breakAfterMinutes: 30 },
  ]);
  assert.ok("plan" in ok);
  assert.deepEqual(ok.plan.map((item) => [item.key, item.durationMinutes, item.breakAfterMinutes]), [["SOZEL", 70, 30], ["SAYISAL", 90, 0]]);
  assert.deepEqual(ok.plan[0].sectionCodes, LGS_FULL_SESSION_PLAN[0].sectionCodes);
  assert.equal(sessionPlanWorkingMinutes(ok.plan), 160);
  assert.deepEqual(applySessionPlanEdits(LGS_FULL_SESSION_PLAN, [{ key: "SOZEL", durationMinutes: 70, breakAfterMinutes: 30 }]), { error: "Oturum listesi sürümdeki planla eşleşmiyor." });
  assert.deepEqual(
    applySessionPlanEdits(LGS_FULL_SESSION_PLAN, [{ key: "SOZEL", durationMinutes: 70, breakAfterMinutes: 30 }, { key: "X", durationMinutes: 70, breakAfterMinutes: 0 }]),
    { error: "Oturum listesi sürümdeki planla eşleşmiyor." },
  );
  assert.match(String((applySessionPlanEdits(LGS_FULL_SESSION_PLAN, [{ key: "SOZEL", durationMinutes: 2, breakAfterMinutes: 30 }, { key: "SAYISAL", durationMinutes: 80, breakAfterMinutes: 0 }]) as { error: string }).error), /5–240/);
  assert.match(String((applySessionPlanEdits(LGS_FULL_SESSION_PLAN, [{ key: "SOZEL", durationMinutes: 75, breakAfterMinutes: 500 }, { key: "SAYISAL", durationMinutes: 80, breakAfterMinutes: 0 }]) as { error: string }).error), /0–120/);
});
