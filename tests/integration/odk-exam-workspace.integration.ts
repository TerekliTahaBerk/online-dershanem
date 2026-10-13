import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { loadOdkExamReport, loadOdkExamWorkspace } from "@/lib/odk/exam-workspace-server";
import { loadExamHistory } from "@/lib/odk/staff-management-data";
import { loadOdkOpsAttempt } from "@/lib/odk/ops-console-server";
import { toMobileOdkExamWorkspace } from "@/lib/mobile/odk-exam-views";
import { ODK_EXAM_TABS, parseOdkExamWorkspace } from "@/lib/mobile-contracts/odk-management-exam";
import { integration } from "./integration-utils";

/**
 * K03a — Deneme çalışma alanı: web ve mobil aynı yükleyici; her sekmenin mobil
 * projeksiyonu gerçek veriyle sözleşmeye uyar; sekmeye özgü bloklar yalnız o
 * sekmede; bütünlük paneli yalnız bu denemenin kaydını açar.
 */
integration("K03a deneme çalışma alanı: tüm sekmeler sözleşmeye uyar, kapsam doğru", async () => {
  const run = randomUUID().slice(0, 8);
  const now = new Date();
  const admin = await db.user.create({ data: { email: `k03-admin-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const student = await db.user.create({ data: { email: `k03-s-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused", fullName: `K03 Öğrenci ${run}` } });
  const policy = await db.odkScoringPolicy.create({ data: { code: `k03-${run}`, title: "K03", wrongPenalty: 0.25 } });
  const exam = await db.odkExam.create({ data: { title: `K03 Deneme ${run}`, slug: `k03-${run}`, family: "TYT", createdById: admin.id, status: "ENDED", startsAt: new Date(now.getTime() - 4 * 3_600_000), endsAt: new Date(now.getTime() - 3_600_000) } });
  const other = await db.odkExam.create({ data: { title: `K03 Diğer ${run}`, slug: `k03-other-${run}`, family: "TYT", createdById: admin.id } });
  const version = await db.odkExamVersion.create({ data: { examId: exam.id, versionNumber: 1, durationMinutes: 120, scoringPolicyId: policy.id, createdById: admin.id } });
  const otherVersion = await db.odkExamVersion.create({ data: { examId: other.id, versionNumber: 1, durationMinutes: 120, scoringPolicyId: policy.id, createdById: admin.id } });
  await db.odkExam.update({ where: { id: exam.id }, data: { currentVersionId: version.id } });
  const section = await db.odkExamSection.create({ data: { versionId: version.id, code: "MAT", title: "Matematik", position: 1, questionCount: 2 } });
  await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: 1, position: 1, correctOption: "A" } });
  await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: 2, position: 2 } });
  const attempt = await db.odkExamAttempt.create({ data: { attemptNumber: 1, examId: exam.id, versionId: version.id, studentUserId: student.id, startedAt: new Date(now.getTime() - 3.5 * 3_600_000), deadlineAt: new Date(now.getTime() - 1.5 * 3_600_000), lastActivityAt: new Date(now.getTime() - 2 * 3_600_000), status: "SUBMITTED", submittedAt: new Date(now.getTime() - 2 * 3_600_000), integrityLevel: "REVIEW" } });
  const foreign = await db.odkExamAttempt.create({ data: { attemptNumber: 1, examId: other.id, versionId: otherVersion.id, studentUserId: student.id, deadlineAt: new Date(now.getTime() + 3_600_000) } });
  try {
    for (const tab of ODK_EXAM_TABS) {
      const ws = await loadOdkExamWorkspace(admin.id, exam.id, { sekme: tab }, now, { includeOutcomeOptions: false });
      assert.ok(ws, tab);
      const [report, history] = await Promise.all([ws.tab === "raporlar" ? loadOdkExamReport(exam.id, ws.assignedCount, ws.attempts) : null, ws.tab === "gecmis" ? loadExamHistory(ws.exam) : null]);
      const view = toMobileOdkExamWorkspace(ws, { now, report, history });
      const parsed = parseOdkExamWorkspace(JSON.parse(JSON.stringify(view)));
      assert.ok(parsed.ok, `${tab}: ${parsed.ok ? "" : parsed.error}`);
      if (ws.tab !== tab) continue; // izinsiz / koşula bağlı sekme (ör. oturumlar) genel'e düşer
      if (tab === "sorular") {
        assert.equal(view.questions?.counts.anahtarsiz, 1);
        assert.equal(view.questions?.rows.find((row) => row.number === 1)?.correctOption, "A");
      } else assert.equal(view.questions, null);
      if (tab === "butunluk") assert.equal(view.integrity?.[0].id, attempt.id);
      if (tab === "raporlar") assert.equal(view.report?.submitted, 1);
    }
    const genel = await loadOdkExamWorkspace(admin.id, exam.id, {}, now);
    assert.equal(genel?.primary?.tab, "puanlama");
    assert.equal(await loadOdkExamWorkspace(admin.id, "yok-boyle-deneme", {}, now), null);
    assert.ok(await loadOdkOpsAttempt(attempt.id, now, { examId: exam.id }));
    assert.equal(await loadOdkOpsAttempt(foreign.id, now, { examId: exam.id }), null);
  } finally {
    await db.odkExamAttempt.deleteMany({ where: { examId: { in: [exam.id, other.id] } } });
    await db.odkExam.updateMany({ where: { id: exam.id }, data: { currentVersionId: null } });
    await db.odkExamQuestion.deleteMany({ where: { sectionId: section.id } });
    await db.odkExamSection.deleteMany({ where: { id: section.id } });
    await db.odkExamVersion.deleteMany({ where: { examId: { in: [exam.id, other.id] } } });
    await db.odkExam.deleteMany({ where: { id: { in: [exam.id, other.id] } } });
    await db.odkScoringPolicy.deleteMany({ where: { id: policy.id } });
    await db.user.deleteMany({ where: { id: { in: [admin.id, student.id] } } });
  }
});
