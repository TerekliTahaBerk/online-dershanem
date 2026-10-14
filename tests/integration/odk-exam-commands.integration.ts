import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { runOdkExamCommand } from "@/lib/odk/exam-command-runner";
import { loadOdkExamAssignments } from "@/lib/odk/exam-assignments-server";
import { buildOdkExamScoring, loadOdkExamWorkspace } from "@/lib/odk/exam-workspace-server";
import { odkExamRevision, toMobileOdkExamWorkspace } from "@/lib/mobile/odk-exam-views";
import { parseOdkExamWorkspace } from "@/lib/mobile-contracts/odk-management-exam";
import { GroupMutationError } from "@/lib/panel/group-mutation-core";
import { integration } from "./integration-utils";

/**
 * K03b — Mobil hazırlık komutları web servisleriyle aynı kuralları uygular;
 * revizyon transaction içinde doğrulanır, aynı anahtar makbuzdan döner, kural
 * reddi makbuz yazmaz; katılımcı ve önizleme projeksiyonları sözleşmeye uyar.
 */
integration("K03b deneme hazırlık komutları: revizyon, makbuz, ret, içe aktarma, atama", async () => {
  const run = randomUUID().slice(0, 8);
  const admin = await db.user.create({ data: { email: `k03b-admin-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const student = await db.user.create({ data: { email: `k03b-s-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused", fullName: `K03b Öğrenci ${run}` } });
  const policy = await db.odkScoringPolicy.create({ data: { code: `k03b-${run}`, title: "K03b", wrongPenalty: 0.25 } });
  const exam = await db.odkExam.create({ data: { title: `K03b Deneme ${run}`, slug: `k03b-${run}`, family: "TYT", createdById: admin.id } });
  const version = await db.odkExamVersion.create({ data: { examId: exam.id, versionNumber: 1, durationMinutes: 120, scoringPolicyId: policy.id, createdById: admin.id } });
  await db.odkExam.update({ where: { id: exam.id }, data: { currentVersionId: version.id } });
  const section = await db.odkExamSection.create({ data: { versionId: version.id, code: "MAT", title: "Matematik", position: 1, questionCount: 2 } });
  await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: 1, position: 1, correctOption: "A" } });
  const q2 = await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: 2, position: 2 } });
  const revision = async () => {
    const current = await db.odkExam.findUniqueOrThrow({ where: { id: exam.id }, select: { id: true, status: true, updatedAt: true, currentVersion: { select: { id: true, status: true, updatedAt: true } } } });
    return odkExamRevision({ exam: current, version: current.currentVersion! });
  };
  const command = (input: Parameters<typeof runOdkExamCommand>[0]["command"], expectedRevision: string, idempotencyKey = randomUUID()) =>
    runOdkExamCommand({ examId: exam.id, actorId: admin.id, actorRole: "ADMIN", idempotencyKey, expectedRevision, command: input });
  try {
    const r0 = await revision();
    const update = { operation: "update" as const, input: { title: `K03b Güncel ${run}`, startsAt: null, endsAt: null, lateEntryMinutes: 10, meetRequired: false, meetUrl: null, security: { fullscreenMode: "REQUIRED" as const, blockCopyPaste: true, logCopyPaste: true, trackVisibility: true, allowExtraTimeMinutes: 5, autoSubmit: true } } };
    const key = randomUUID();
    const first = await command(update, r0, key);
    assert.equal(first.replayed, false);
    const replay = await command(update, r0, key);
    assert.equal(replay.replayed, true);
    assert.deepEqual(replay.body, first.body);
    const saved = await db.odkExam.findUniqueOrThrow({ where: { id: exam.id }, include: { currentVersion: true } });
    assert.equal(saved.title, `K03b Güncel ${run}`);
    assert.equal(saved.lateEntryMinutes, 10);
    assert.equal((saved.currentVersion?.settings as { security?: { fullscreenMode?: string } } | null)?.security?.fullscreenMode, "REQUIRED");

    const r1 = await revision();
    assert.notEqual(r1, r0);
    await assert.rejects(command({ operation: "ready" }, r0), (error) => error instanceof GroupMutationError && error.code === "ODK_CONFLICT");

    // Hazırlık engeli (anahtarsız soru): web ucuyla aynı ret; makbuz yazılmaz, aynı anahtarla düzeltme sonrası denenebilir.
    const readyKey = randomUUID();
    await assert.rejects(command({ operation: "ready" }, r1, readyKey), (error) => error instanceof GroupMutationError && error.code === "ODK_EXAM_REJECTED" && error.status === 400);
    assert.equal(await db.auditLog.count({ where: { idempotencyKey: `odk-exam:${admin.id}:${readyKey}` } }), 0);
    assert.equal((await db.odkExam.findUniqueOrThrow({ where: { id: exam.id } })).status, "DRAFT");

    const preview = await command({ operation: "import.preview", kind: "answer-key", payload: { examType: "TYT", sections: [{ code: "MAT", answers: { "1": "A", "2": "B" } }] } }, r1);
    const importId = (preview.body as { importId: string }).importId;
    assert.ok(importId, JSON.stringify(preview.body));
    assert.deepEqual((preview.body as { issues: { level: string }[] }).issues.filter((issue) => issue.level === "error"), [], JSON.stringify(preview.body));
    await command({ operation: "import.commit", kind: "answer-key", importId }, await revision());
    assert.equal((await db.odkExamQuestion.findUniqueOrThrow({ where: { id: q2.id } })).correctOption, "B");

    // Tek soru düzenlemesi web soru editörünün kurallarından geçer; diğer sorular ve içerik alanları korunur.
    await db.odkExamQuestion.update({ where: { id: q2.id }, data: { contentType: "RICH_CONTENT", contentText: "Soru metni" } });
    await command({ operation: "question.update", question: { id: q2.id, correctOption: "D", difficulty: "HARD", bookletPage: 4, outcomeIds: [], primaryOutcomeId: null } }, await revision());
    const edited = await db.odkExamQuestion.findUniqueOrThrow({ where: { id: q2.id } });
    assert.deepEqual([edited.correctOption, edited.difficulty, edited.bookletPage, edited.contentType, edited.contentText], ["D", "HARD", 4, "RICH_CONTENT", "Soru metni"]);
    assert.equal((await db.odkExamQuestion.findFirstOrThrow({ where: { sectionId: section.id, questionNumber: 1 } })).correctOption, "A");
    await assert.rejects(command({ operation: "question.update", question: { id: q2.id, correctOption: "D", difficulty: "HARD", bookletPage: 4, outcomeIds: ["yok-boyle-kazanim"], primaryOutcomeId: null } }, await revision()), (error) => error instanceof GroupMutationError && error.status === 400);

    const assigned = await command({ operation: "assign", input: { source: "STUDENT", studentEmails: [student.email] } }, await revision());
    assert.equal((assigned.body as { total: number }).total, 1);
    const assignments = await loadOdkExamAssignments(exam.id);
    assert.equal(assignments.assignments[0]?.studentName, student.fullName);

    for (const tab of ["katilimcilar", "onizleme", "zamanlama"] as const) {
      const ws = await loadOdkExamWorkspace(admin.id, exam.id, { sekme: tab }, new Date(), { includeOutcomeOptions: false });
      assert.ok(ws);
      const view = toMobileOdkExamWorkspace(ws, { now: new Date(), report: null, history: null, assignments: tab === "katilimcilar" ? assignments : null });
      const parsed = parseOdkExamWorkspace(JSON.parse(JSON.stringify(view)));
      assert.ok(parsed.ok, `${tab}: ${parsed.ok ? "" : parsed.error}`);
      assert.equal(view.revision, await revision());
      if (tab === "katilimcilar") assert.equal(view.assignments?.rows[0]?.name, student.fullName);
      if (tab === "onizleme") assert.ok(view.previews?.length);
      if (tab === "zamanlama") { assert.equal(view.schedule?.fullscreenMode, "REQUIRED"); assert.equal(view.exam.meetRequired, false); }
    }
  } finally {
    await db.odkExamAssignment.deleteMany({ where: { examId: exam.id } });
    await db.odkImportAudit.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.updateMany({ where: { id: exam.id }, data: { currentVersionId: null } });
    await db.odkExamQuestion.deleteMany({ where: { sectionId: section.id } });
    await db.odkExamSection.deleteMany({ where: { id: section.id } });
    await db.odkExamVersion.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.deleteMany({ where: { id: exam.id } });
    await db.odkScoringPolicy.deleteMany({ where: { id: policy.id } });
    await db.auditLog.deleteMany({ where: { actorUserId: admin.id } });
    await db.user.deleteMany({ where: { id: { in: [admin.id, student.id] } } });
  }
});

/**
 * K03c — puanla / yeniden puanla / yayın mobil komutu web servisleriyle aynı:
 * puan ve yayın makbuzla tek transaction; yayınlanmış sonucu değiştiren
 * yeniden puanlama açık onay ister; puanlama sekmesi projeksiyonu sözleşmeye
 * uyar ve yayın önizlemesi yayın ucuyla aynı sayıyı verir.
 */
integration("K03c deneme puanlama ve yayın komutları", async () => {
  const run = randomUUID().slice(0, 8);
  const now = new Date();
  const admin = await db.user.create({ data: { email: `k03c-admin-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const student = await db.user.create({ data: { email: `k03c-s-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused", fullName: `K03c Öğrenci ${run}` } });
  const policy = await db.odkScoringPolicy.create({ data: { code: `k03c-${run}`, title: "K03c", wrongPenalty: 0.25 } });
  const exam = await db.odkExam.create({ data: { title: `K03c Deneme ${run}`, slug: `k03c-${run}`, family: "TYT", createdById: admin.id, status: "ENDED", startsAt: new Date(now.getTime() - 4 * 3_600_000), endsAt: new Date(now.getTime() - 3_600_000) } });
  const version = await db.odkExamVersion.create({ data: { examId: exam.id, versionNumber: 1, durationMinutes: 120, scoringPolicyId: policy.id, createdById: admin.id, status: "LOCKED" } });
  await db.odkExam.update({ where: { id: exam.id }, data: { currentVersionId: version.id } });
  const section = await db.odkExamSection.create({ data: { versionId: version.id, code: "MAT", title: "Matematik", position: 1, questionCount: 2 } });
  const q1 = await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: 1, position: 1, correctOption: "A" } });
  const q2 = await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: 2, position: 2, correctOption: "C" } });
  const attempt = await db.odkExamAttempt.create({ data: { attemptNumber: 1, examId: exam.id, versionId: version.id, studentUserId: student.id, startedAt: new Date(now.getTime() - 3.5 * 3_600_000), deadlineAt: new Date(now.getTime() - 1.5 * 3_600_000), status: "SUBMITTED", submittedAt: new Date(now.getTime() - 2 * 3_600_000) } });
  await db.odkAttemptAnswer.createMany({ data: [{ attemptId: attempt.id, questionId: q1.id, selectedOption: "A" }, { attemptId: attempt.id, questionId: q2.id, selectedOption: "B" }] });
  const revision = async () => {
    const current = await db.odkExam.findUniqueOrThrow({ where: { id: exam.id }, select: { id: true, status: true, updatedAt: true, currentVersion: { select: { id: true, status: true, updatedAt: true } } } });
    return odkExamRevision({ exam: current, version: current.currentVersion! });
  };
  const command = async (input: Parameters<typeof runOdkExamCommand>[0]["command"], idempotencyKey = randomUUID()) =>
    runOdkExamCommand({ examId: exam.id, actorId: admin.id, actorRole: "ADMIN", idempotencyKey, expectedRevision: await revision(), command: input });
  const scoringView = async () => {
    const ws = await loadOdkExamWorkspace(admin.id, exam.id, { sekme: "puanlama" }, new Date(), { includeOutcomeOptions: false });
    assert.ok(ws);
    const view = toMobileOdkExamWorkspace(ws, { now: new Date(), scoring: buildOdkExamScoring(ws) });
    const parsed = parseOdkExamWorkspace(JSON.parse(JSON.stringify(view)));
    assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
    return view;
  };
  try {
    const before = await scoringView();
    assert.equal(before.scoring?.rows[0]?.result, "ERROR"); // web sonuç paneli gibi: puanlanmamış teslim
    assert.equal(before.scoring?.release, null);

    const scored = await command({ operation: "score" });
    assert.equal((scored.body as { scoredCount: number }).scoredCount, 1);
    const score = await db.odkAttemptScore.findUniqueOrThrow({ where: { attemptId: attempt.id } });
    assert.equal(score.correctCount, 1);
    assert.equal(score.publicationStatus, "HIDDEN");

    const ready = await scoringView();
    assert.equal(ready.exam.status, "SCORED");
    assert.equal(ready.scoring?.rows[0]?.name, student.fullName);
    assert.equal(ready.scoring?.release?.include.publishable, 1);

    const releaseKey = randomUUID();
    const released = await command({ operation: "release", input: { excludeReviewRequired: false, createCoachSuggestions: false } }, releaseKey);
    assert.equal((released.body as { published: number }).published, 1);
    assert.equal((await db.odkAttemptScore.findUniqueOrThrow({ where: { attemptId: attempt.id } })).publicationStatus, "PUBLISHED");
    assert.equal((await db.odkExam.findUniqueOrThrow({ where: { id: exam.id } })).status, "RELEASED");
    assert.equal(await db.auditLog.count({ where: { idempotencyKey: `odk-exam:${admin.id}:${releaseKey}` } }), 1);
    assert.equal(await db.auditLog.count({ where: { entityId: exam.id, action: "odk.exam_results_released" } }), 1);

    // Anahtar değişmediyse hiçbir net değişmez: onay istenmez (etki gerçek farktan hesaplanır, P0-3).
    const unchanged = await command({ operation: "rescore", input: {} });
    assert.equal((unchanged.body as { impact: { changedAttemptCount: number; publishedResultsWillChange: boolean } }).impact.changedAttemptCount, 0);
    assert.equal((unchanged.body as { impact: { publishedResultsWillChange: boolean } }).impact.publishedResultsWillChange, false);
    // Anahtar düzeltmesi (revizyonun yazdığı alan) yayınlanmış neti değiştirir.
    await db.odkExamQuestion.update({ where: { id: q2.id }, data: { correctOption: "B" } });
    // Yayınlanmış sonucu değiştiren yeniden puanlama açık onay ister (web ile aynı ret).
    await assert.rejects(command({ operation: "rescore", input: {} }), (error) => error instanceof GroupMutationError && error.status === 409);
    const rescored = await command({ operation: "rescore", input: { confirmPublishedChange: true, reason: "Anahtar düzeltmesi" } });
    assert.equal((rescored.body as { scoredCount: number }).scoredCount, 1);
    assert.equal((await db.odkAttemptScore.findUniqueOrThrow({ where: { attemptId: attempt.id } })).publicationStatus, "PUBLISHED");
  } finally {
    await db.odkAttemptQuestionResult.deleteMany({ where: { attemptId: attempt.id } });
    await db.odkAttemptOutcomeScore.deleteMany({ where: { attemptId: attempt.id } });
    await db.odkAttemptScore.deleteMany({ where: { attemptId: attempt.id } });
    await db.odkExamAttempt.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.updateMany({ where: { id: exam.id }, data: { currentVersionId: null } });
    await db.odkExamQuestion.deleteMany({ where: { sectionId: section.id } });
    await db.odkExamSection.deleteMany({ where: { id: section.id } });
    await db.odkExamVersion.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.deleteMany({ where: { id: exam.id } });
    await db.odkScoringPolicy.deleteMany({ where: { id: policy.id } });
    await db.auditLog.deleteMany({ where: { actorUserId: admin.id } });
    await db.user.deleteMany({ where: { id: { in: [admin.id, student.id] } } });
  }
});
