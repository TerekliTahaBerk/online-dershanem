import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { attemptReviewRevision, loadOdkOpsAttempt, loadOdkOpsConsole } from "@/lib/odk/ops-console-server";
import { reviewAttemptIntegrity } from "@/lib/odk/integrity-review-service";
import { toMobileOdkOpsAttempt, toMobileOdkOpsConsole } from "@/lib/mobile/odk-ops-views";
import { parseOdkOpsAttempt, parseOdkOpsConsole } from "@/lib/mobile-contracts/odk-management-ops";
import { CommandError } from "@/lib/panel/command-receipt";
import { integration } from "./integration-utils";

/**
 * K04 — Canlı operasyon: web/mobil ortak yükleyici gerçek veriyle sözleşmeye
 * uyar (bağlantı kopması, bütünlük uyarısı, süzgeç); kayıt paneli yalnız
 * izlenen denemelerde; bütünlük incelemesi revizyon, tekrar ve audit makbuzuyla.
 */
const code = (expected: string) => (error: unknown) => error instanceof CommandError && error.code === expected;

integration("K04 canlı operasyon: projeksiyon, kapsam ve bütünlük incelemesi", async () => {
  const run = randomUUID().slice(0, 8);
  const now = new Date();
  const staff = await db.user.create({ data: { email: `k04-admin-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const student = await db.user.create({ data: { email: `k04-s-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused", fullName: `K04 Öğrenci ${run}` } });
  const other = await db.user.create({ data: { email: `k04-o-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused", fullName: `K04 Diğer ${run}` } });
  const policy = await db.odkScoringPolicy.create({ data: { code: `k04-${run}`, title: "K04", wrongPenalty: 0.25 } });
  const live = await db.odkExam.create({ data: { title: `K04 Canlı ${run}`, slug: `k04-live-${run}`, family: "TYT", createdById: staff.id, status: "LIVE", startsAt: new Date(now.getTime() - 30 * 60_000), endsAt: new Date(now.getTime() + 60 * 60_000) } });
  const old = await db.odkExam.create({ data: { title: `K04 Eski ${run}`, slug: `k04-old-${run}`, family: "TYT", createdById: staff.id, status: "ENDED", startsAt: new Date(now.getTime() - 72 * 3_600_000), endsAt: new Date(now.getTime() - 70 * 3_600_000) } });
  const version = await db.odkExamVersion.create({ data: { examId: live.id, versionNumber: 1, durationMinutes: 120, scoringPolicyId: policy.id, createdById: staff.id } });
  const oldVersion = await db.odkExamVersion.create({ data: { examId: old.id, versionNumber: 1, durationMinutes: 120, scoringPolicyId: policy.id, createdById: staff.id } });
  const disconnected = await db.odkExamAttempt.create({ data: { attemptNumber: 1, examId: live.id, versionId: version.id, studentUserId: student.id, deadlineAt: new Date(now.getTime() + 60 * 60_000), lastActivityAt: new Date(now.getTime() - 5 * 60_000), integrityLevel: "HIGH" } });
  await db.odkExamAttempt.create({ data: { attemptNumber: 1, examId: live.id, versionId: version.id, studentUserId: other.id, deadlineAt: new Date(now.getTime() + 60 * 60_000), status: "SUBMITTED", submittedAt: now } });
  const outside = await db.odkExamAttempt.create({ data: { attemptNumber: 1, examId: old.id, versionId: oldVersion.id, studentUserId: student.id, startedAt: new Date(now.getTime() - 72 * 3_600_000), lastActivityAt: new Date(now.getTime() - 71 * 3_600_000), deadlineAt: new Date(now.getTime() - 70 * 3_600_000), status: "SUBMITTED" } });
  await db.odkAttemptEvent.create({ data: { attemptId: disconnected.id, type: "NETWORK_OFFLINE", sequence: 1 } });
  try {
    const data = await loadOdkOpsConsole({ deneme: live.id }, now);
    const projected = toMobileOdkOpsConsole({ ...data, canReview: true });
    const parsed = parseOdkOpsConsole(JSON.parse(JSON.stringify(projected)));
    assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
    assert.equal(projected.selected?.id, live.id);
    assert.equal(projected.selected?.counters.disconnected, 1);
    assert.equal(projected.selected?.counters.submitted, 1);
    assert.equal(projected.rows[0].id, disconnected.id);
    assert.equal(projected.rows[0].statusLabel, "Bağlantı koptu");
    assert.ok(projected.alerts.some((alert) => alert.attemptId === disconnected.id));
    assert.ok(!projected.exams.some((exam) => exam.id === old.id));
    const filtered = await loadOdkOpsConsole({ deneme: live.id, durum: "teslim" }, now);
    assert.deepEqual(filtered.rows.map((row) => row.id).includes(disconnected.id), false);

    assert.equal(await loadOdkOpsAttempt(outside.id, now), null);
    const attempt = await loadOdkOpsAttempt(disconnected.id, now);
    assert.ok(attempt);
    const detail = toMobileOdkOpsAttempt({ attempt, revision: attemptReviewRevision(attempt), canReview: true, now });
    assert.ok(parseOdkOpsAttempt(JSON.parse(JSON.stringify(detail))).ok);
    assert.equal(detail.events[0].label, "Bağlantı koptu");

    const key = randomUUID();
    const first = await reviewAttemptIntegrity(staff.id, disconnected.id, { action: "REQUIRE_REVIEW" }, { idempotencyKey: key, expectedRevision: detail.revision });
    assert.equal(first.result.status, "REVIEW_REQUIRED");
    assert.equal((await reviewAttemptIntegrity(staff.id, disconnected.id, { action: "REQUIRE_REVIEW" }, { idempotencyKey: key, expectedRevision: detail.revision })).replayed, true);
    await assert.rejects(reviewAttemptIntegrity(staff.id, disconnected.id, { action: "MARK_REVIEWED" }, { idempotencyKey: randomUUID(), expectedRevision: detail.revision }), code("STALE_REVISION"));
    await assert.rejects(reviewAttemptIntegrity(staff.id, disconnected.id, { action: "MARK_REVIEWED" }, { idempotencyKey: key, expectedRevision: detail.revision }), code("IDEMPOTENCY_REUSE"));
    const reviewed = await reviewAttemptIntegrity(staff.id, disconnected.id, { action: "MARK_REVIEWED", note: "Öğrenciyle görüşüldü" }, { idempotencyKey: randomUUID(), expectedRevision: first.result.revision });
    assert.equal(reviewed.result.status, "SUBMITTED");
    assert.ok(reviewed.result.integrityReviewedAt);
    assert.equal(await db.auditLog.count({ where: { actorUserId: staff.id, entityId: disconnected.id, action: "odk.attempt_integrity_reviewed" } }), 2);
    await assert.rejects(reviewAttemptIntegrity(staff.id, "yok-boyle-kayit", { action: "CLEAR_REVIEW" }), code("NOT_FOUND"));
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: staff.id } });
    await db.odkExamAttempt.deleteMany({ where: { examId: { in: [live.id, old.id] } } });
    await db.odkExamVersion.deleteMany({ where: { examId: { in: [live.id, old.id] } } });
    await db.odkExam.deleteMany({ where: { id: { in: [live.id, old.id] } } });
    await db.odkScoringPolicy.deleteMany({ where: { id: policy.id } });
    await db.user.deleteMany({ where: { id: { in: [staff.id, student.id, other.id] } } });
  }
});
