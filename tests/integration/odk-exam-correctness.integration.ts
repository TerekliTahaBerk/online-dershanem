import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { OdkAnswerOption } from "@prisma/client";
import { prisma as db } from "@/lib/prisma";
import { previewOdkRescore, scoreOdkExam } from "@/lib/odk/scoring-service";
import { commitAnswerKeyRevision, previewAnswerKeyRevision } from "@/lib/odk/answer-key-revision-server";
import { rescoreOdkExamCommand } from "@/lib/odk/exam-results-commands";
import { commitOdkImport, loadQuestionsRevision, previewOdkImport, updateOdkExamQuestions } from "@/lib/odk/exam-commands-server";
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

/** Puanla, sonra yayınla (yayın komutunun yazdığı alanlar; koç önerisi/bildirim yan etkisi olmadan). */
async function scoreAndRelease(fixture: Fixture, publishAttemptIndexes: number[]) {
  const scored = await scoreOdkExam(fixture.exam.id, fixture.admin.id);
  assert.ok(scored.ok, JSON.stringify(scored));
  const now = new Date();
  await db.odkExam.update({ where: { id: fixture.exam.id }, data: { status: "RELEASED", resultsReleasedAt: now, answerKeyReleasedAt: now } });
  await db.odkAttemptScore.updateMany({ where: { attemptId: { in: publishAttemptIndexes.map((index) => fixture.attempts[index].id) } }, data: { publicationStatus: "PUBLISHED" } });
}

const actorOf = (fixture: Fixture) => ({ userId: fixture.admin.id, role: "ADMIN" as const });
const netOf = async (fixture: Fixture, index: number) => Number((await db.odkAttemptScore.findUniqueOrThrow({ where: { attemptId: fixture.attempts[index].id } })).totalNet);

integration("P0-9 yeniden puanlama yayından hariç tutulan sonucu yayınlamaz", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, students: 2, sections: [{ code: "MAT", key: key(4) }] }, async (fixture) => {
    await fixture.answer(0, "MAT", ["A", "A", "B", null]);
    await fixture.answer(1, "MAT", ["A", "B", "B", "B"]);
    await scoreAndRelease(fixture, [0]); // 1. öğrenci bütünlük incelemesi nedeniyle hariç tutuldu
    const result = await rescoreOdkExamCommand(fixture.exam.id, { confirmPublishedChange: true }, actorOf(fixture));
    assert.equal(result.status, 200, JSON.stringify(await result.clone().json()));
    const rows = await db.odkAttemptScore.findMany({ where: { attemptId: { in: fixture.attempts.map((attempt) => attempt.id) } }, select: { attemptId: true, publicationStatus: true } });
    assert.equal(rows.find((row) => row.attemptId === fixture.attempts[0].id)?.publicationStatus, "PUBLISHED");
    assert.equal(rows.find((row) => row.attemptId === fixture.attempts[1].id)?.publicationStatus, "HIDDEN");
  });
});

integration("P0-3 yeniden puanlama etkisi gerçek anahtar farkından hesaplanır", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, students: 2, sections: [{ code: "MAT", key: key(4) }] }, async (fixture) => {
    await fixture.answer(0, "MAT", ["A", "B", "A", "A"]);
    await fixture.answer(1, "MAT", ["A", "A", "A", "A"]);
    await scoreAndRelease(fixture, [0, 1]);
    const same = await previewOdkRescore(fixture.exam.id);
    assert.ok(same.ok);
    assert.deepEqual([same.preview.changedQuestionIds, same.preview.cancelledQuestionIds, same.preview.changedAttempts.length], [[], [], 0]);
    await db.odkExamQuestion.update({ where: { id: fixture.question("MAT", 2).id }, data: { correctOption: "B" } });
    await db.odkExamQuestion.update({ where: { id: fixture.question("MAT", 4).id }, data: { isActive: false } });
    const changed = await previewOdkRescore(fixture.exam.id);
    assert.ok(changed.ok);
    assert.deepEqual(changed.preview.changedQuestionIds, [fixture.question("MAT", 2).id]);
    assert.deepEqual(changed.preview.cancelledQuestionIds, [fixture.question("MAT", 4).id]);
    assert.deepEqual(changed.preview.changedAttempts.map((row) => [row.netBefore, row.netAfter]).sort(), [[2.75, 3], [4, 1.75]]);
    assert.equal(changed.preview.publishedChangedCount, 2);
    // Kuru çalıştırma hiçbir şey yazmaz.
    assert.equal(await netOf(fixture, 1), 4);
  });
});

integration("P0-2 anahtar revizyonu: önizleme, onay, revizyon kaydı, iptal, yeniden puanlama ve audit", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, students: 2, sections: [{ code: "MAT", key: key(4) }] }, async (fixture) => {
    await fixture.answer(0, "MAT", ["A", "B", "A", "A"]);
    await fixture.answer(1, "MAT", ["A", "A", "A", "A"]);
    await scoreAndRelease(fixture, [0, 1]);
    const changes = [
      { questionId: fixture.question("MAT", 2).id, action: "SET_ANSWER" as const, correctOption: "B" as const },
      { questionId: fixture.question("MAT", 4).id, action: "CANCEL" as const },
    ];
    const preview = await previewAnswerKeyRevision(fixture.exam.id, { changes });
    assert.equal(preview.status, 200);
    const previewBody = await preview.json();
    assert.equal(previewBody.impact.changedAttemptCount, 2);
    assert.equal(previewBody.impact.publishedResultsWillChange, true);
    assert.equal(previewBody.cancelledQuestionPolicy, "EXCLUDE");
    assert.match(previewBody.answerKeyHash, /^[a-f0-9]{64}$/);

    const reason = "Kitapçıkta 2. sorunun doğru cevabı B; 4. soru basım hatası.";
    // Yayınlanmış netler değişiyor: açık onay olmadan hiçbir şey yazılmaz.
    const unconfirmed = await commitAnswerKeyRevision(fixture.exam.id, { changes, reason, expectedAnswerKeyHash: previewBody.answerKeyHash }, actorOf(fixture));
    assert.equal(unconfirmed.status, 409);
    assert.equal((await unconfirmed.json()).code, "CONFIRMATION_REQUIRED");
    assert.equal(await db.odkAnswerKeyRevision.count({ where: { versionId: fixture.version.id } }), 0);
    assert.equal((await db.odkExamQuestion.findUniqueOrThrow({ where: { id: fixture.question("MAT", 2).id } })).correctOption, "A");

    const committed = await commitAnswerKeyRevision(fixture.exam.id, { changes, reason, expectedAnswerKeyHash: previewBody.answerKeyHash, confirmPublishedChange: true }, actorOf(fixture));
    const committedBody = await committed.json();
    assert.equal(committed.status, 201, JSON.stringify(committedBody));
    assert.equal(committedBody.rescored, true);

    const revision = await db.odkAnswerKeyRevision.findUniqueOrThrow({ where: { id: committedBody.revisionId } });
    assert.equal(revision.revisionNumber, 1);
    assert.equal(revision.reason, reason);
    assert.equal(revision.changedById, fixture.admin.id);
    assert.deepEqual(revision.previousAnswers, { [fixture.question("MAT", 2).id]: "A", [fixture.question("MAT", 4).id]: "A" });
    assert.deepEqual(revision.nextAnswers, { [fixture.question("MAT", 2).id]: "B", [fixture.question("MAT", 4).id]: "CANCELLED" });
    assert.ok(revision.rescoreRequestedAt && revision.rescoreCompletedAt);
    const q4 = await db.odkExamQuestion.findUniqueOrThrow({ where: { id: fixture.question("MAT", 4).id } });
    assert.equal(q4.isActive, false);
    assert.equal(q4.correctOption, "A"); // iptal önceki cevabı silmez
    assert.equal(await netOf(fixture, 0), 3);
    assert.equal(await netOf(fixture, 1), 1.75);
    const sectionCount = (await db.odkAttemptScore.findUniqueOrThrow({ where: { attemptId: fixture.attempts[1].id } })).sectionBreakdown as Array<{ questionCount: number }>;
    assert.equal(sectionCount[0].questionCount, 3); // iptal edilen soru bölüm soru sayısından düşer
    const rescoreAudit = await db.auditLog.findFirstOrThrow({ where: { entityId: fixture.exam.id, action: "odk.exam_rescored" }, orderBy: { createdAt: "desc" } });
    const previousScores = (rescoreAudit.payload as { previousScores: Array<{ attemptId: string; totalNet: string }> }).previousScores;
    assert.deepEqual(previousScores.map((row) => Number(row.totalNet)).sort(), [2.75, 4]);
    assert.equal(await db.auditLog.count({ where: { entityId: fixture.exam.id, action: "odk.answer_key_revised" } }), 1);

    // Aynı önizleme hash'iyle ikinci commit: anahtar değişti → bayat.
    const stale = await commitAnswerKeyRevision(fixture.exam.id, { changes: [{ questionId: fixture.question("MAT", 1).id, action: "SET_ANSWER", correctOption: "C" }], reason, expectedAnswerKeyHash: previewBody.answerKeyHash, confirmPublishedChange: true }, actorOf(fixture));
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).code, "REVISION_STALE");
    // İptal edilen soru revize edilemez.
    const cancelled = await previewAnswerKeyRevision(fixture.exam.id, { changes: [{ questionId: fixture.question("MAT", 4).id, action: "SET_ANSWER", correctOption: "C" }] });
    assert.equal(cancelled.status, 400);
  });
});

integration("P0-2 eşzamanlı iki revizyondan yalnız biri yazılır", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, status: "ENDED", sections: [{ code: "MAT", key: key(3) }] }, async (fixture) => {
    const preview = await (await previewAnswerKeyRevision(fixture.exam.id, { changes: [{ questionId: fixture.question("MAT", 1).id, action: "CANCEL" }] })).json();
    const reason = "Eşzamanlı revizyon denemesi için gerekçe.";
    const results = await Promise.all([
      commitAnswerKeyRevision(fixture.exam.id, { changes: [{ questionId: fixture.question("MAT", 1).id, action: "CANCEL" }], reason, expectedAnswerKeyHash: preview.answerKeyHash }, actorOf(fixture)),
      commitAnswerKeyRevision(fixture.exam.id, { changes: [{ questionId: fixture.question("MAT", 2).id, action: "SET_ANSWER", correctOption: "D" }], reason, expectedAnswerKeyHash: preview.answerKeyHash }, actorOf(fixture)),
    ]);
    assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
    assert.equal(await db.odkAnswerKeyRevision.count({ where: { versionId: fixture.version.id } }), 1);
  });
});

integration("P0-2 taslak denemede revizyon açılmaz (taslak editörü kullanılır)", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, status: "DRAFT", sections: [{ code: "MAT", key: key(2) }] }, async (fixture) => {
    const response = await previewAnswerKeyRevision(fixture.exam.id, { changes: [{ questionId: fixture.question("MAT", 1).id, action: "CANCEL" }] });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "REVISION_NOT_ALLOWED");
  });
});

const bodyOf = async (response: Response) => ({ status: response.status, body: await response.json() });

integration("P0-4 cevap anahtarı import: önizlemeden sonra değişen deneme commit'i reddeder", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, status: "DRAFT", sections: [{ code: "MAT", key: [null, null, null] }] }, async (fixture) => {
    const preview = await bodyOf(await previewOdkImport("answer-key", fixture.exam.id, { examType: "TYT", sections: [{ code: "MAT", answers: { "1": "A", "2": "B", "3": "C" } }] }, fixture.admin.id));
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    // Başka bir yönetici editörden 3. sorunun cevabını girer.
    await db.odkExamQuestion.update({ where: { id: fixture.question("MAT", 3).id }, data: { correctOption: "E" } });
    const commit = await bodyOf(await commitOdkImport("answer-key", fixture.exam.id, preview.body.importId, fixture.admin.id));
    assert.equal(commit.status, 409);
    assert.equal(commit.body.code, "IMPORT_STALE");
    assert.equal((await db.odkExamQuestion.findUniqueOrThrow({ where: { id: fixture.question("MAT", 3).id } })).correctOption, "E");
    assert.equal((await db.odkExamQuestion.findUniqueOrThrow({ where: { id: fixture.question("MAT", 1).id } })).correctOption, null);
  });
});

integration("P0-4 cevap anahtarı import: tekrar ve eşzamanlı commit idempotenttir, tek audit yazılır", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, status: "DRAFT", sections: [{ code: "MAT", key: [null, null] }] }, async (fixture) => {
    const preview = await bodyOf(await previewOdkImport("answer-key", fixture.exam.id, { sections: [{ code: "MAT", answers: { "1": "D", "2": "E" } }] }, fixture.admin.id));
    const [first, second] = await Promise.all([
      commitOdkImport("answer-key", fixture.exam.id, preview.body.importId, fixture.admin.id).then(bodyOf),
      commitOdkImport("answer-key", fixture.exam.id, preview.body.importId, fixture.admin.id).then(bodyOf),
    ]);
    assert.deepEqual([first.status, second.status], [200, 200], JSON.stringify([first.body, second.body]));
    assert.equal([first.body, second.body].filter((body) => body.idempotent).length, 1);
    const again = await bodyOf(await commitOdkImport("answer-key", fixture.exam.id, preview.body.importId, fixture.admin.id));
    assert.deepEqual([again.status, again.body.idempotent, again.body.count], [200, true, 2]);
    assert.equal(await db.auditLog.count({ where: { entityId: fixture.exam.id, action: "odk.answer_key_imported" } }), 1);
    assert.equal((await db.odkExamQuestion.findUniqueOrThrow({ where: { id: fixture.question("MAT", 2).id } })).correctOption, "E");
  });
});

integration("P0-4 desteklenmeyen şema sürümü önizlemede hata verir", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, status: "DRAFT", sections: [{ code: "MAT", key: [null] }] }, async (fixture) => {
    const preview = await bodyOf(await previewOdkImport("answer-key", fixture.exam.id, { schemaVersion: "3.0", sections: [{ code: "MAT", answers: { "1": "A" } }] }, fixture.admin.id));
    assert.equal(preview.body.issues[0].code, "UNSUPPORTED_SCHEMA_VERSION");
    const commit = await bodyOf(await commitOdkImport("answer-key", fixture.exam.id, preview.body.importId, fixture.admin.id));
    assert.equal(commit.status, 400);
  });
});

integration("P0-5 kazanım: başka sınav ailesinin ve başka dersin kazanımı bağlanamaz", async () => {
  const run = randomUUID().slice(0, 8);
  const tyt = await createOutcomeCatalog(run, "TYT", [{ subject: "MAT", unit: "U1", codes: [`T-MAT-${run}`] }, { subject: "FEN", unit: "U2", codes: [`T-FEN-${run}`] }]);
  const lgs = await createOutcomeCatalog(run, "LGS", [{ subject: "MAT", unit: "U1", codes: [`L-MAT-${run}`] }]);
  try {
    await withFixture({ run, status: "DRAFT", sections: [{ code: "MAT", key: ["A", "B"] }] }, async (fixture) => {
      // Başka aile (LGS) kodu TYT kataloğunda yok → çözülmez, commit edilemez.
      const foreign = await bodyOf(await previewOdkImport("outcomes", fixture.exam.id, { questions: [{ section: "MAT", question: 1, outcomes: [{ code: `L-MAT-${run}` }] }, { section: "MAT", question: 2, outcomes: [{ code: `T-MAT-${run}` }] }] }, fixture.admin.id));
      assert.deepEqual(foreign.body.summary.unresolvedCodes, [`L-MAT-${run}`]);
      assert.equal((await bodyOf(await commitOdkImport("outcomes", fixture.exam.id, foreign.body.importId, fixture.admin.id))).status, 400);
      // Aynı aile, başka ders (FEN) → hata.
      const otherSubject = await bodyOf(await previewOdkImport("outcomes", fixture.exam.id, { questions: [{ section: "MAT", question: 1, outcomes: [{ code: `T-FEN-${run}` }] }] }, fixture.admin.id));
      assert.equal(otherSubject.body.issues.find((issue: { level: string }) => issue.level === "error")?.code, "OUTCOME_SUBJECT_MISMATCH");
      // Doğru ders → commit edilir.
      const valid = await bodyOf(await previewOdkImport("outcomes", fixture.exam.id, { questions: [{ section: "MAT", question: 1, outcomes: [{ code: `T-MAT-${run}` }] }, { section: "MAT", question: 2, outcomes: [{ code: `T-MAT-${run}` }] }] }, fixture.admin.id));
      const committed = await bodyOf(await commitOdkImport("outcomes", fixture.exam.id, valid.body.importId, fixture.admin.id));
      assert.equal(committed.status, 200, JSON.stringify(committed.body));
      assert.equal(await db.odkQuestionOutcome.count({ where: { outcomeId: tyt.byCode.get(`MAT:T-MAT-${run}`) } }), 2);

      // Editör yolu (web + mobil): başka dersin ve başka ailenin kazanımı reddedilir.
      const editorQuestions = (outcomeId: string) => fixture.sections[0].questions.map((question) => ({ id: question.id, correctOption: "A" as const, difficulty: "MEDIUM" as const, bookletPage: null, contentType: "BOOKLET_PDF" as const, contentText: null, assetUrl: null, outcomeIds: [outcomeId], primaryOutcomeId: outcomeId }));
      const wrongSubject = await bodyOf(await updateOdkExamQuestions(fixture.exam.id, editorQuestions(tyt.byCode.get(`FEN:T-FEN-${run}`)!), fixture.admin.id));
      assert.deepEqual([wrongSubject.status, wrongSubject.body.code], [400, "OUTCOME_SUBJECT_MISMATCH"]);
      const wrongFamily = await bodyOf(await updateOdkExamQuestions(fixture.exam.id, editorQuestions(lgs.byCode.get(`MAT:L-MAT-${run}`)!), fixture.admin.id));
      assert.equal(wrongFamily.status, 400);
      const ok = await bodyOf(await updateOdkExamQuestions(fixture.exam.id, editorQuestions(tyt.byCode.get(`MAT:T-MAT-${run}`)!), fixture.admin.id));
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
    });
  } finally {
    await tyt.cleanup();
    await lgs.cleanup();
  }
});

integration("P1-6 soru editörü: araya giren kayıt bayat revizyonla ezilemez; eşzamanlı iki kayıttan biri yazılır", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, status: "DRAFT", sections: [{ code: "MAT", key: [null, null] }] }, async (fixture) => {
    const rows = (correctOption: "A" | "B" | "C" | "D" | "E", difficulty: "EASY" | "HARD" = "EASY") => fixture.sections[0].questions.map((question) => ({ id: question.id, correctOption, difficulty, bookletPage: null, contentType: "BOOKLET_PDF" as const, contentText: null, assetUrl: null, outcomeIds: [], primaryOutcomeId: null }));
    const opened = await loadQuestionsRevision(db, fixture.version.id);
    // Yönetici 1 kaydeder; yanıt yeni revizyonu döner.
    const first = await bodyOf(await updateOdkExamQuestions(fixture.exam.id, rows("A"), fixture.admin.id, undefined, { expectedRevision: opened }));
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.revision, await loadQuestionsRevision(db, fixture.version.id));
    // Yönetici 2 aynı eski revizyonla kaydetmeye çalışır → 409, yazılmaz.
    const stale = await bodyOf(await updateOdkExamQuestions(fixture.exam.id, rows("E"), fixture.admin.id, undefined, { expectedRevision: opened }));
    assert.deepEqual([stale.status, stale.body.code, stale.body.revision], [409, "QUESTIONS_STALE", first.body.revision]);
    assert.equal((await db.odkExamQuestion.findUniqueOrThrow({ where: { id: fixture.question("MAT", 1).id } })).correctOption, "A");
    // Aynı revizyonla iki eşzamanlı kayıt: yalnız biri.
    const results = await Promise.all([
      updateOdkExamQuestions(fixture.exam.id, rows("B"), fixture.admin.id, undefined, { expectedRevision: first.body.revision }),
      updateOdkExamQuestions(fixture.exam.id, rows("C", "HARD"), fixture.admin.id, undefined, { expectedRevision: first.body.revision }),
    ]);
    assert.deepEqual(results.map((response) => response.status).sort(), [200, 409]);
    // Revizyon verilmezse (mobil tek soru komutu, eski istemci) davranış eskisi gibi.
    assert.equal((await updateOdkExamQuestions(fixture.exam.id, rows("D"), fixture.admin.id)).status, 200);
  });
});

integration("P1-8 puanlama attempt'in kendi sürümüyle yapılır; güncel sürüm değişse de geçmiş attempt etkilenmez", async () => {
  const run = randomUUID().slice(0, 8);
  await withFixture({ run, students: 2, sections: [{ code: "MAT", key: ["A", "A"] }] }, async (fixture) => {
    await fixture.answer(0, "MAT", ["A", "A"]);
    // Yeni sürüm (v2) farklı soru kimlikleri ve anahtarla güncel sürüm olur; 2. öğrenci v2'de çözer.
    const v2 = await db.odkExamVersion.create({ data: { examId: fixture.exam.id, versionNumber: 2, durationMinutes: 120, scoringPolicyId: fixture.policy.id, createdById: fixture.admin.id, status: "LOCKED" } });
    const section = await db.odkExamSection.create({ data: { versionId: v2.id, code: "MAT", title: "MAT", position: 0, questionCount: 2 } });
    const v2Questions = await Promise.all([1, 2].map((number) => db.odkExamQuestion.create({ data: { sectionId: section.id, questionNumber: number, position: number - 1, correctOption: "B" } })));
    await db.odkExam.update({ where: { id: fixture.exam.id }, data: { currentVersionId: v2.id } });
    await db.odkExamAttempt.update({ where: { id: fixture.attempts[1].id }, data: { versionId: v2.id } });
    await db.odkAttemptAnswer.createMany({ data: v2Questions.map((question) => ({ attemptId: fixture.attempts[1].id, questionId: question.id, selectedOption: "B" as const })) });

    const scored = await scoreOdkExam(fixture.exam.id, fixture.admin.id);
    assert.ok(scored.ok, JSON.stringify(scored));
    assert.equal(await netOf(fixture, 0), 2); // v1 anahtarı (A,A)
    assert.equal(await netOf(fixture, 1), 2); // v2 anahtarı (B,B)
    const v1Results = await db.odkAttemptQuestionResult.findMany({ where: { attemptId: fixture.attempts[0].id } });
    assert.deepEqual(v1Results.map((row) => row.questionId).sort(), fixture.sections[0].questions.map((question) => question.id).sort());
    await db.odkExamAttempt.deleteMany({ where: { examId: fixture.exam.id } });
  });
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
