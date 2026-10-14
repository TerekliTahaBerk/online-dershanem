import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { createExamSchema } from "@/lib/odk/admin-schemas";
import { createOdkExam } from "@/lib/odk/exam-create-server";
import { getOdkExamReadiness } from "@/lib/odk/admin-exam-server";
import { readTemplateSnapshot } from "@/lib/odk/exam-templates";
import { scoreOdkExam } from "@/lib/odk/scoring-service";
import { integration } from "./integration-utils";

/**
 * Faz 3 — sürümlü şablon: oluşturulan deneme şablon görüntüsünü taşır,
 * geçerlilik dışı yıl reddedilir, AYT puanı bölüm kodu ve alt test kırılımı içerir.
 */

async function withAdmin(fn: (adminId: string, run: string) => Promise<void>) {
  const run = randomUUID().slice(0, 8);
  const admin = await db.user.create({ data: { email: `f3-admin-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  try {
    await fn(admin.id, run);
  } finally {
    const exams = await db.odkExam.findMany({ where: { createdById: admin.id }, select: { id: true } });
    await db.odkExamAttempt.deleteMany({ where: { examId: { in: exams.map((exam) => exam.id) } } });
    await db.odkExam.updateMany({ where: { createdById: admin.id }, data: { currentVersionId: null } });
    await db.odkExamVersion.deleteMany({ where: { createdById: admin.id } });
    await db.odkExam.deleteMany({ where: { createdById: admin.id } });
    await db.auditLog.deleteMany({ where: { actorUserId: admin.id } });
    await db.user.deleteMany({ where: { OR: [{ id: admin.id }, { email: { startsWith: `f3-s-${run}` } }] } });
  }
}

const create = (adminId: string, input: Record<string, unknown>) => createOdkExam(createExamSchema.parse(input), adminId);

integration("Faz 3: AYT tam denemesi şablon görüntüsüyle oluşturulur; geçerlilik dışı yıl reddedilir", async () => {
  await withAdmin(async (adminId, run) => {
    const response = await create(adminId, { family: "AYT", title: `F3 AYT ${run}`, slug: `f3-ayt-${run}`, templateCode: "AYT_FULL", academicYear: 2026 });
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    const version = await db.odkExamVersion.findFirstOrThrow({ where: { examId: body.exam.id }, include: { sections: { include: { _count: { select: { questions: true } } } } } });
    const snapshot = readTemplateSnapshot(version.settings);
    assert.ok(snapshot);
    assert.deepEqual([snapshot.code, snapshot.templateVersion, snapshot.mode], ["AYT_FULL", "2018.1", "OFFICIAL"]);
    assert.deepEqual(snapshot.sections.find((section) => section.code === "FEN")?.subtests.map((subtest) => [subtest.code, subtest.questionStart, subtest.questionEnd]), [["FIZIK", 1, 14], ["KIMYA", 15, 27], ["BIYOLOJI", 28, 40]]);
    assert.deepEqual(Object.keys(snapshot.tracks).sort(), ["EA", "SAY", "SOZ"]);
    assert.equal(version.sections.reduce((sum, section) => sum + section._count.questions, 0), 160);

    // Resmî modda soru sayısı standarttan saparsa hazırlık hatası (yayın engeli).
    const fen = version.sections.find((section) => section.code === "FEN")!;
    await db.odkExamSection.update({ where: { id: fen.id }, data: { questionCount: 39 } });
    await db.odkExamQuestion.deleteMany({ where: { sectionId: fen.id, questionNumber: 40 } });
    const { issues } = await getOdkExamReadiness(body.exam.id);
    assert.equal(issues.find((issue) => issue.code === "SECTION_QUESTION_COUNT_NONSTANDARD")?.level, "error");

    const outOfWindow = await create(adminId, { family: "AYT", title: `F3 AYT eski ${run}`, slug: `f3-ayt-old-${run}`, templateCode: "AYT_FULL", academicYear: 2099 });
    assert.equal(outOfWindow.status, 400);
    assert.match((await outOfWindow.json()).error, /geçerli değil/);
  });
});

integration("Faz 3: AYT puanı bölüm kodu ve alt test (Fizik/Kimya/Biyoloji) kırılımı içerir", async () => {
  await withAdmin(async (adminId, run) => {
    const created = await (await create(adminId, { family: "AYT", title: `F3 AYT puan ${run}`, slug: `f3-ayt-score-${run}`, templateCode: "AYT_FULL", academicYear: 2026 })).json();
    const examId = created.exam.id;
    const now = Date.now();
    await db.odkExam.update({ where: { id: examId }, data: { status: "ENDED", startsAt: new Date(now - 4 * 3_600_000), endsAt: new Date(now - 3_600_000) } });
    const version = await db.odkExamVersion.findFirstOrThrow({ where: { examId }, include: { sections: { include: { questions: true } } } });
    await db.odkExamVersion.update({ where: { id: version.id }, data: { status: "LOCKED" } });
    await db.odkExamQuestion.updateMany({ where: { section: { versionId: version.id } }, data: { correctOption: "A" } });
    const student = await db.user.create({ data: { email: `f3-s-${run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused" } });
    const attempt = await db.odkExamAttempt.create({ data: { examId, versionId: version.id, studentUserId: student.id, attemptNumber: 1, status: "SUBMITTED", startedAt: new Date(now - 3.5 * 3_600_000), deadlineAt: new Date(now - 1.5 * 3_600_000), submittedAt: new Date(now - 2 * 3_600_000) } });
    const fen = version.sections.find((section) => section.code === "FEN")!;
    // Fizik (1–14) 10 doğru 4 yanlış; Kimya (15–27) 13 doğru; Biyoloji boş. Sayısal öğrenci: sözel bölümler boş.
    await db.odkAttemptAnswer.createMany({
      data: fen.questions.filter((question) => question.questionNumber <= 27).map((question) => ({ attemptId: attempt.id, questionId: question.id, selectedOption: question.questionNumber > 10 && question.questionNumber <= 14 ? "B" as const : "A" as const })),
    });
    const scored = await scoreOdkExam(examId, adminId);
    assert.ok(scored.ok, JSON.stringify(scored));
    const score = await db.odkAttemptScore.findUniqueOrThrow({ where: { attemptId: attempt.id } });
    const breakdown = score.sectionBreakdown as Array<{ code: string; net: number; subtests?: Array<{ code: string; correct: number; wrong: number; blank: number; net: number }> }>;
    assert.deepEqual(breakdown.map((row) => row.code), ["EDB_SOS1", "SOS2", "MAT", "FEN"]);
    const fenRow = breakdown.find((row) => row.code === "FEN")!;
    assert.equal(fenRow.net, 22);
    assert.deepEqual(fenRow.subtests?.map((row) => [row.code, row.correct, row.wrong, row.blank, row.net]), [["FIZIK", 10, 4, 0, 9], ["KIMYA", 13, 0, 0, 13], ["BIYOLOJI", 0, 0, 13, 0]]);
    assert.equal(breakdown.find((row) => row.code === "MAT")?.subtests, undefined);
  });
});
