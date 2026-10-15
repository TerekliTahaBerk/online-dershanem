import assert from "node:assert/strict";
import test from "node:test";
import { LGS_FULL_SESSION_PLAN } from "./exam-sessions";
import { buildPreviewSession } from "./runner-preview";

const now = new Date("2026-10-14T10:00:00Z");

test("oturumsuz sınav: tek oturum, süre sürüm süresinden", () => {
  const preview = buildPreviewSession({ plan: null, requestedKey: null, now, durationMinutes: 165 });
  assert.equal(preview.session, null);
  assert.equal(preview.deadlineAt.toISOString(), "2026-10-14T12:45:00.000Z");
});

test("LGS: varsayılan Sözel (75 dk), sonraki Sayısal; Sayısal seçilince Sözel kilitli ve son oturum", () => {
  const sozel = buildPreviewSession({ plan: LGS_FULL_SESSION_PLAN, requestedKey: null, now, durationMinutes: 155 });
  assert.deepEqual([sozel.session?.currentKey, sozel.session?.isLast, sozel.nextSessionKey, sozel.session?.deadlineAt], ["SOZEL", false, "SAYISAL", "2026-10-14T11:15:00.000Z"]);
  const sayisal = buildPreviewSession({ plan: LGS_FULL_SESSION_PLAN, requestedKey: "SAYISAL", now, durationMinutes: 155 });
  assert.deepEqual(sayisal.session?.sessions.map((item) => item.status), ["LOCKED", "ACTIVE"]);
  assert.deepEqual([sayisal.session?.isLast, sayisal.nextSessionKey, sayisal.session?.deadlineAt], [true, null, "2026-10-14T11:20:00.000Z"]);
  assert.equal(buildPreviewSession({ plan: LGS_FULL_SESSION_PLAN, requestedKey: "YOK", now, durationMinutes: 155 }).session?.currentKey, "SOZEL");
});
