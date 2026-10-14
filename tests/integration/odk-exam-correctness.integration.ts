import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { OdkAnswerOption } from "@prisma/client";
import { prisma as db } from "@/lib/prisma";
import { scoreOdkExam } from "@/lib/odk/scoring-service";
import { integration } from "./integration-utils";

/**
 * ODK deneme doğruluğu (docs/roadmaps/odk-exam-experience-overhaul.md, Faz 2 / P0).
 * Her test kendi denemesini, politikasını ve kullanıcılarını kurar ve siler.
 */

type SectionSpec = { code: string; key: Array<OdkAnswerOption | null> };
type Fixture = Awaited<ReturnType<typeof createExamFixture>>;

async function createExamFixture(options: {
  run: string;
  status?: "DRAFT" | "ENDED" | "SCORED" | "RELEASED";
  family?: "LGS" | "TYT" | "AYT";
  penalty?: number;
  minimumNetIsZero?: boolean;
  sections: SectionSpec[];
  students?: number;
}) {
  const now = Date.now();
  const status = options.status ?? "ENDED";
  const admin = await db.user.create({ data: { email: `p0-admin-${options.run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const students = await Promise.all(
    Array.from({ length: options.students ?? 1 }, (_, index) =>
      db.user.create({ data: { email: `p0-s${index}-${options.run}@example.com`, role: "STUDENT", status: "ACTIVE", passwordHash: "unused", fullName: `P0 Öğrenci ${index} ${options.run}` } }),
    ),
  );
  const policy = await db.odkScoringPolicy.create({ data: { code: `p0-${options.run}`, title: "P0", wrongPenalty: options.penalty ?? 4, minimumNetIsZero: options.minimumNetIsZero ?? true } });
  const ended = status !== "DRAFT";
  const exam = await db.odkExam.create({
    data: {
      title: `P0 Deneme ${options.run}`,
      slug: `p0-${options.run}`,
      family: options.family ?? "TYT",
      createdById: admin.id,
      status,
      ...(ended ? { startsAt: new Date(now - 4 * 3_600_000), endsAt: new Date(now - 3_600_000) } : {}),
    },
  });
  const version = await db.odkExamVersion.create({ data: { examId: exam.id, versionNumber: 1, durationMinutes: 120, scoringPolicyId: policy.id, createdById: admin.id, status: ended ? "LOCKED" : "DRAFT" } });
  await db.odkExam.update({ where: { id: exam.id }, data: { currentVersionId: version.id } });
  const sections: Array<{ id: string; code: string; questions: Array<{ id: string; questionNumber: number }> }> = [];
  for (const [position, spec] of options.sections.entries()) {
    const section = await db.odkExamSection.create({ data: { versionId: version.id, code: spec.code, title: spec.code, position, questionCount: spec.key.length } });
    const questions: Array<{ id: string; questionNumber: number }> = [];
    for (const [index, correctOption] of spec.key.entries()) {
      questions.push(await db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: index + 1, position: index, correctOption } }));
    }
    sections.push({ ...section, questions });
  }
  const attempts = ended
    ? await Promise.all(
        students.map((student) =>
          db.odkExamAttempt.create({
            data: { attemptNumber: 1, examId: exam.id, versionId: version.id, studentUserId: student.id, startedAt: new Date(now - 3.5 * 3_600_000), deadlineAt: new Date(now - 1.5 * 3_600_000), status: "SUBMITTED", submittedAt: new Date(now - 2 * 3_600_000) },
          }),
        ),
      )
    : [];
  const question = (code: string, number: number) => sections.find((section) => section.code === code)!.questions[number - 1];
  const answer = async (attemptIndex: number, code: string, picks: Array<OdkAnswerOption | null>) => {
    await db.odkAttemptAnswer.createMany({
      data: picks.flatMap((selectedOption, index) => (selectedOption ? [{ attemptId: attempts[attemptIndex].id, questionId: question(code, index + 1).id, selectedOption }] : [])),
    });
  };
  const cleanup = async () => {
    await db.odkExamAttempt.deleteMany({ where: { examId: exam.id } });
    await db.odkImportAudit.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.updateMany({ where: { id: exam.id }, data: { currentVersionId: null } });
    await db.odkExamVersion.deleteMany({ where: { examId: exam.id } });
    await db.odkExam.deleteMany({ where: { id: exam.id } });
    await db.odkScoringPolicy.deleteMany({ where: { id: policy.id } });
    await db.auditLog.deleteMany({ where: { actorUserId: admin.id } });
    await db.user.deleteMany({ where: { id: { in: [admin.id, ...students.map((student) => student.id)] } } });
  };
  return { admin, students, policy, exam, version, sections, attempts, question, answer, cleanup };
}

async function withFixture(options: Parameters<typeof createExamFixture>[0], fn: (fixture: Fixture) => Promise<void>) {
  const fixture = await createExamFixture(options);
  try {
    await fn(fixture);
  } finally {
    await fixture.cleanup();
  }
}

const key = (length: number, option: OdkAnswerOption = "A") => Array.from({ length }, () => option);
const picks = (correct: number, wrong: number): OdkAnswerOption[] => [...key(correct, "A"), ...key(wrong, "B")];

integration("P0-1 puanlama: ham net sectionBreakdown'da saklanır, raporlanan net politikaya göre kesilir", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, minimumNetIsZero: true, sections: [{ code: "TURKCE", key: key(40) }, { code: "SOSYAL", key: key(20) }] }, async (fixture) => {
    await fixture.answer(0, "TURKCE", picks(10, 30));
    await fixture.answer(0, "SOSYAL", picks(0, 20));
    const scored = await scoreOdkExam(fixture.exam.id, fixture.admin.id);
    assert.ok(scored.ok, JSON.stringify(scored));
    const score = await db.odkAttemptScore.findUniqueOrThrow({ where: { attemptId: fixture.attempts[0].id } });
    const breakdown = score.sectionBreakdown as Array<{ title: string; net: number; rawNet: number }>;
    const sosyal = breakdown.find((row) => row.title === "SOSYAL")!;
    assert.equal(sosyal.rawNet, -5);
    assert.equal(sosyal.net, 0);
    assert.equal(Number(score.totalNet), 2.5);
  });
});

integration("P0-1 puanlama: negatif nete izin veren politika sessizce kesilmez, açıkça reddedilir", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, minimumNetIsZero: false, sections: [{ code: "SOSYAL", key: key(20) }] }, async (fixture) => {
    await fixture.answer(0, "SOSYAL", picks(0, 20));
    const scored = await scoreOdkExam(fixture.exam.id, fixture.admin.id);
    assert.equal(scored.ok, false);
    assert.equal(await db.odkAttemptScore.count({ where: { attemptId: fixture.attempts[0].id } }), 0);
    assert.equal((await db.odkExam.findUniqueOrThrow({ where: { id: fixture.exam.id } })).status, "ENDED");
  });
});

integration("P1-5 puanlama: soru başı aktif süre kazanım özetine taşınır", async () => {
  const run = randomUUID().slice(0, 8);
  const curriculum = await createOutcomeCatalog(run, "TYT", [{ subject: "MAT", unit: "U1", codes: ["OUT-1"] }]);
  try {
    await withFixture({ run, sections: [{ code: "MAT", key: key(2) }] }, async (fixture) => {
      const [outcomeId] = curriculum.outcomeIds;
      await db.odkQuestionOutcome.createMany({ data: fixture.sections[0].questions.map((question) => ({ questionId: question.id, outcomeId, isPrimary: true })) });
      await fixture.answer(0, "MAT", ["A", "B"]);
      await db.odkAttemptQuestionTiming.createMany({
        data: fixture.sections[0].questions.map((question, index) => ({ attemptId: fixture.attempts[0].id, questionId: question.id, activeDurationMs: (index + 1) * 30_000, firstEnteredAt: new Date() })),
      });
      assert.ok((await scoreOdkExam(fixture.exam.id, fixture.admin.id)).ok);
      const outcome = await db.odkAttemptOutcomeScore.findUniqueOrThrow({ where: { attemptId_outcomeId: { attemptId: fixture.attempts[0].id, outcomeId } } });
      assert.equal(outcome.activeDurationMs, 90_000);
    });
  } finally {
    await curriculum.cleanup();
  }
});

/** Sınav ailesine bağlı küçük bir müfredat kataloğu (ders → ünite → kazanım). */
async function createOutcomeCatalog(run: string, familyCode: "LGS" | "TYT" | "AYT", subjects: Array<{ subject: string; unit: string; codes: string[] }>) {
  const family = await db.examFamily.findFirstOrThrow({ where: { code: familyCode } });
  const creator = await db.user.create({ data: { email: `p0-cur-${familyCode}-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const version = await db.curriculumVersion.create({ data: { code: `P0-${familyCode}-${run}`, title: `P0 ${familyCode}`, examFamilyRefId: family.id, academicYear: 2026, status: "ACTIVE", createdById: creator.id } });
  const outcomeIds: string[] = [];
  const byCode = new Map<string, string>();
  for (const [position, spec] of subjects.entries()) {
    const subject = await db.curriculumSubject.create({ data: { versionId: version.id, code: spec.subject, name: spec.subject, position } });
    const unit = await db.curriculumUnit.create({ data: { subjectId: subject.id, code: spec.unit, name: spec.unit } });
    for (const code of spec.codes) {
      const outcome = await db.learningOutcome.create({ data: { unitId: unit.id, code, title: `${spec.subject} ${code}` } });
      outcomeIds.push(outcome.id);
      byCode.set(`${spec.subject}:${code}`, outcome.id);
    }
  }
  return {
    outcomeIds,
    byCode,
    cleanup: async () => {
      await db.curriculumVersion.deleteMany({ where: { id: version.id } });
      await db.user.deleteMany({ where: { id: creator.id } });
    },
  };
}
