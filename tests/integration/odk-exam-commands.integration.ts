import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { runOdkExamCommand } from "@/lib/odk/exam-command-runner";
import { loadOdkExamAssignments } from "@/lib/odk/exam-assignments-server";
import { loadOdkExamWorkspace } from "@/lib/odk/exam-workspace-server";
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
    runOdkExamCommand({ examId: exam.id, actorId: admin.id, idempotencyKey, expectedRevision, command: input });
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
