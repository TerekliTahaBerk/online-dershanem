import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { OdkAnswerOption } from "@prisma/client";
import { prisma as db } from "@/lib/prisma";
import { createExamSchema } from "@/lib/odk/admin-schemas";
import { createOdkExam } from "@/lib/odk/exam-create-server";
import { scoreOdkExam } from "@/lib/odk/scoring-service";
import { rescoreOdkExamCommand } from "@/lib/odk/exam-results-commands";
import { integration } from "./integration-utils";

/**
 * Faz 7 — tam boy denemelerde uçtan uca puanlama ve ölçek: 160 soruluk AYT,
 * 120 soruluk TYT ve 90 soruluk (iki oturumlu) LGS şablondan oluşturulur,
 * kalabalık bir sınıf puanlanır ve yeniden puanlanır. Öğrenci sayısı
 * `ODK_SCALE_STUDENTS` ile değiştirilebilir (varsayılan 120).
 */
const STUDENTS = Number(process.env.ODK_SCALE_STUDENTS ?? 120);
const OPTIONS: OdkAnswerOption[] = ["A", "B", "C", "D", "E"];

async function scenario(family: "AYT" | "TYT" | "LGS", templateCode: string, expectedQuestions: number) {
  const run = randomUUID().slice(0, 8);
  const admin = await db.user.create({ data: { email: `f7-admin-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const studentEmails = Array.from({ length: STUDENTS }, (_, index) => `f7-s${index}-${run}@example.com`);
  try {
    const created = await createOdkExam(createExamSchema.parse({ family, title: `F7 ${templateCode} ${run}`, slug: `f7-${templateCode.toLowerCase().replace("_", "-")}-${run}`, templateCode, academicYear: 2026 }), admin.id);
    const examId = (await created.json()).exam.id as string;
    const version = await db.odkExamVersion.findFirstOrThrow({ where: { examId }, include: { sections: { orderBy: { position: "asc" }, include: { questions: { orderBy: { position: "asc" } } } } } });
    const questions = version.sections.flatMap((section) => section.questions);
    assert.equal(questions.length, expectedQuestions);
    // Anahtar: soru sırasına göre A..E döngüsü.
    for (const [index, option] of OPTIONS.entries()) {
      await db.odkExamQuestion.updateMany({ where: { id: { in: questions.filter((_, position) => position % 5 === index).map((question) => question.id) } }, data: { correctOption: option } });
    }
    const now = Date.now();
    await db.odkExam.update({ where: { id: examId }, data: { status: "ENDED", startsAt: new Date(now - 5 * 3_600_000), endsAt: new Date(now - 3_600_000) } });
    await db.odkExamVersion.update({ where: { id: version.id }, data: { status: "LOCKED" } });
    await db.user.createMany({ data: studentEmails.map((email) => ({ email, role: "STUDENT" as const, status: "ACTIVE" as const, passwordHash: "unused" })) });
    const students = await db.user.findMany({ where: { email: { in: studentEmails } }, select: { id: true } });
    await db.odkExamAttempt.createMany({
      data: students.map((student, index) => ({ id: `f7-${run}-${index}`, examId, versionId: version.id, studentUserId: student.id, attemptNumber: 1, status: "SUBMITTED" as const, startedAt: new Date(now - 4 * 3_600_000), deadlineAt: new Date(now - 2 * 3_600_000), submittedAt: new Date(now - 2.5 * 3_600_000) })),
    });
    // Öğrenci i: soruların ~%60'ı doğru, ~%25'i yanlış, kalanı boş (öğrenciye göre kayan desen).
    await db.odkAttemptAnswer.createMany({
      data: students.flatMap((_, index) =>
        questions.flatMap((question, position) => {
          const bucket = (position + index) % 20;
          if (bucket >= 17) return [];
          const correct = OPTIONS[position % 5];
          const selectedOption = bucket < 12 ? correct : OPTIONS[(position + 1) % 5];
          return [{ attemptId: `f7-${run}-${index}`, questionId: question.id, selectedOption }];
        }),
      ),
    });

    const started = Date.now();
    const scored = await scoreOdkExam(examId, admin.id);
    const scoreMs = Date.now() - started;
    assert.ok(scored.ok, JSON.stringify(scored));
    assert.equal(scored.scoredCount, STUDENTS);
    assert.equal(await db.odkAttemptQuestionResult.count({ where: { score: { attempt: { examId } } } }), STUDENTS * expectedQuestions);
    const sample = await db.odkAttemptScore.findUniqueOrThrow({ where: { attemptId: `f7-${run}-0` } });
    assert.equal(sample.correctCount + sample.wrongCount + sample.blankCount, expectedQuestions);

    await db.odkExamQuestion.update({ where: { id: questions[0].id }, data: { correctOption: "E" } });
    const rescoreStarted = Date.now();
    const rescored = await rescoreOdkExamCommand(examId, { reason: "Ölçek testi" }, { userId: admin.id, role: "ADMIN" });
    const rescoreMs = Date.now() - rescoreStarted;
    assert.equal(rescored.status, 200, JSON.stringify(await rescored.clone().json()));
    console.log(`[odk-scale] ${templateCode}: ${STUDENTS} öğrenci × ${expectedQuestions} soru · puanlama ${scoreMs} ms · yeniden puanlama ${rescoreMs} ms`);

    await db.odkExamAttempt.deleteMany({ where: { examId } });
    await db.odkExam.updateMany({ where: { id: examId }, data: { currentVersionId: null } });
    await db.odkExamVersion.deleteMany({ where: { examId } });
    await db.odkExam.deleteMany({ where: { id: examId } });
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: admin.id } });
    await db.odkExamAttempt.deleteMany({ where: { student: { email: { in: studentEmails } } } });
    await db.odkExam.deleteMany({ where: { createdById: admin.id, currentVersionId: null } });
    await db.user.deleteMany({ where: { email: { in: studentEmails } } });
    await db.user.deleteMany({ where: { id: admin.id } });
  }
}

integration("Faz 7 ölçek: AYT 160 soru kalabalık sınıf puanlama + yeniden puanlama", () => scenario("AYT", "AYT_FULL", 160));
integration("Faz 7 ölçek: TYT 120 soru kalabalık sınıf puanlama + yeniden puanlama", () => scenario("TYT", "TYT_FULL", 120));
integration("Faz 7 ölçek: LGS 90 soru (iki oturum) kalabalık sınıf puanlama + yeniden puanlama", () => scenario("LGS", "LGS_FULL", 90));
