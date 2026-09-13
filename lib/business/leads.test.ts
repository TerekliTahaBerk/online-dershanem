import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeadWhere,
  isFollowUpOverdue,
  isFollowUpToday,
  leadDisplayName,
  nextActionForLead,
  sortLeadsForWorklist,
  validateStageTransition,
} from "./leads";

test("lost reason zorunlu; WON wonAt set eder", () => {
  const lostMissing = validateStageTransition({ from: "NEW", to: "LOST" });
  assert.equal(lostMissing.ok, false);
  if (!lostMissing.ok) assert.equal(lostMissing.error, "LOST_REASON_REQUIRED");

  const now = new Date("2026-09-01T10:00:00+03:00");
  const lost = validateStageTransition(
    { from: "QUALIFIED", to: "LOST", lostReasonCode: "PRICE" },
    now,
  );
  assert.equal(lost.ok, true);
  if (lost.ok) {
    assert.equal(lost.data.stage, "LOST");
    assert.equal(lost.data.lostReasonCode, "PRICE");
    assert.equal(lost.data.lostAt?.toISOString(), now.toISOString());
  }

  const won = validateStageTransition({ from: "OFFER_SENT", to: "WON" }, now);
  assert.equal(won.ok, true);
  if (won.ok) {
    assert.equal(won.data.wonAt?.toISOString(), now.toISOString());
    assert.equal(won.data.clearLost, true);
  }
});

test("follow-up overdue / today Istanbul gününe göre", () => {
  const now = new Date("2026-09-01T12:00:00+03:00");
  assert.equal(isFollowUpOverdue(new Date("2026-08-31T23:00:00+03:00"), now), true);
  assert.equal(isFollowUpToday(new Date("2026-09-01T18:00:00+03:00"), now), true);
  assert.equal(isFollowUpToday(new Date("2026-09-02T01:00:00+03:00"), now), false);
});

test("bugün worklist filtresi açık aşama + takip/görev içerir", () => {
  const where = buildLeadWhere(["unit-1"], {
    focus: "today",
    now: new Date("2026-09-01T12:00:00+03:00"),
  });
  assert.ok(where.AND);
  const serialized = JSON.stringify(where);
  assert.match(serialized, /nextFollowUpAt/);
  assert.match(serialized, /CONTACTED/);
  assert.doesNotMatch(serialized, /"WON"/);
});

test("duplicate olmayan display name ve next action", () => {
  assert.equal(leadDisplayName({ firstName: "Ayşe", lastName: "Yılmaz" }), "Ayşe Yılmaz");
  assert.equal(
    nextActionForLead({
      stage: "WON",
      nextFollowUpAt: null,
      lastContactAt: new Date(),
      productInterest: "ONLINE_DERSHANEM",
      relatedOdOrderId: null,
    }),
    "Sipariş oluştur veya mevcut siparişe bağla",
  );
});

test("worklist sıralaması gecikenleri öne alır", () => {
  const now = new Date("2026-09-01T12:00:00+03:00");
  const sorted = sortLeadsForWorklist(
    [
      {
        id: "later",
        nextFollowUpAt: new Date("2026-09-01T16:00:00+03:00"),
        priority: "NORMAL" as const,
        lastContactAt: now,
        updatedAt: now,
      },
      {
        id: "overdue",
        nextFollowUpAt: new Date("2026-08-30T10:00:00+03:00"),
        priority: "LOW" as const,
        lastContactAt: now,
        updatedAt: now,
      },
    ],
    now,
  );
  assert.equal(sorted[0].id, "overdue");
});
