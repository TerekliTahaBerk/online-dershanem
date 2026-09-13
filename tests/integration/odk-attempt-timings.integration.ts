import assert from "node:assert/strict";
import { after, before } from "node:test";
import { PrismaClient } from "@prisma/client";

import { recordAttemptQuestionTimings, type AttemptTimingEntry } from "../../lib/odk/attempt-timings";
import { mergeVisitDuration } from "../../lib/odk/time-analysis";
import { normalizePrismaEnv } from "../../lib/prisma-env";
import { integration, integrationEnabled } from "./integration-utils";

/**
 * ODK timing yazımı — N+1 düzeltmesinin sözleşmesi.
 *
 * `legacyRecordTimings`, `app/api/odk/student/attempts/[id]/timings/route.ts`
 * dosyasının düzeltme öncesi döngüsünün birebir kopyasıdır. Aynı partiler iki
 * ayrı denemeye (eski yol / yeni yol) yazılır ve sonuç satırları karşılaştırılır:
 * yeni yol aynı veriyi üretmeli, ama girdi sayısından bağımsız tek sorguyla.
 */

const QUESTION_COUNT = 30;
const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";

type QueryCountingClient = { client: PrismaClient; count: () => number; reset: () => void };

function createQueryCountingClient(): QueryCountingClient {
  const { databaseUrl, directUrl } = normalizePrismaEnv(process.env);
  const client = new PrismaClient({
    datasourceUrl: directUrl ?? databaseUrl,
    log: [{ emit: "event", level: "query" }],
  });
  let queries = 0;
  client.$on("query", () => {
    queries += 1;
  });
  return { client, count: () => queries, reset: () => { queries = 0; } };
}

const db = integrationEnabled ? createQueryCountingClient() : null;

async function legacyRecordTimings(client: PrismaClient, id: string, timings: AttemptTimingEntry[], allowed: Set<string>) {
  let accepted = 0;
  for (const timing of timings) {
    if (!allowed.has(timing.questionId)) continue;
    const existing = await client.odkAttemptQuestionTiming.findUnique({
      where: { attemptId_questionId: { attemptId: id, questionId: timing.questionId } },
    });
    const enteredAt = timing.enteredAt ? new Date(timing.enteredAt) : new Date();
    const leftAt = timing.leftAt ? new Date(timing.leftAt) : null;
    if (!existing) {
      await client.odkAttemptQuestionTiming.create({
        data: {
          attemptId: id,
          questionId: timing.questionId,
          activeDurationMs: Math.max(0, timing.activeDurationMs),
          firstEnteredAt: enteredAt,
          lastLeftAt: leftAt,
          visitCount: 1,
        },
      });
    } else {
      await client.odkAttemptQuestionTiming.update({
        where: { id: existing.id },
        data: {
          activeDurationMs: mergeVisitDuration(existing.activeDurationMs, timing.activeDurationMs),
          visitCount: existing.visitCount + 1,
          lastLeftAt: leftAt || existing.lastLeftAt,
        },
      });
    }
    accepted += 1;
  }
  return accepted;
}

type Fixture = Awaited<ReturnType<typeof createFixture>>;
let fixture: Fixture | null = null;

async function createFixture(client: PrismaClient) {
  const runId = crypto.randomUUID().slice(0, 8);
  const now = new Date();
  const student = await client.user.create({
    data: {
      email: `odk-timing-${runId}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "ODK Timing Öğrenci",
    },
  });
  const policy = await client.odkScoringPolicy.create({
    data: { code: `timing-${runId}`, title: "Timing test", wrongPenalty: 0.25 },
  });
  const exam = await client.odkExam.create({
    data: { title: "Timing test", slug: `timing-${runId}`, family: "TYT", createdById: student.id },
  });
  const version = await client.odkExamVersion.create({
    data: { examId: exam.id, versionNumber: 1, durationMinutes: 120, scoringPolicyId: policy.id, createdById: student.id },
  });
  const section = await client.odkExamSection.create({
    data: { versionId: version.id, code: "MAT", title: "Matematik", position: 1, questionCount: QUESTION_COUNT },
  });
  const questionIds: string[] = [];
  for (let index = 1; index <= QUESTION_COUNT; index += 1) {
    const question = await client.odkExamQuestion.create({
      data: { sectionId: section.id, questionNumber: index, position: index },
    });
    questionIds.push(question.id);
  }
  let attemptNumber = 0;
  const createAttempt = () => client.odkExamAttempt.create({
    data: {
      attemptNumber: ++attemptNumber,
      examId: exam.id,
      versionId: version.id,
      studentUserId: student.id,
      deadlineAt: new Date(now.getTime() + 2 * 60 * 60_000),
    },
  });
  return { runId, student, policy, exam, version, section, questionIds, createAttempt };
}

async function cleanupFixture(client: PrismaClient, value: Fixture) {
  await client.odkExamAttempt.deleteMany({ where: { examId: value.exam.id } });
  await client.odkExamQuestion.deleteMany({ where: { sectionId: value.section.id } });
  await client.odkExamSection.deleteMany({ where: { id: value.section.id } });
  await client.odkExamVersion.deleteMany({ where: { id: value.version.id } });
  await client.odkExam.deleteMany({ where: { id: value.exam.id } });
  await client.odkScoringPolicy.deleteMany({ where: { id: value.policy.id } });
  await client.user.deleteMany({ where: { id: value.student.id } });
}

function minuteIso(minute: number) {
  return new Date(Date.UTC(2026, 8, 13, 9, minute)).toISOString();
}

/** 25 girdi: 3 tekrar eden soru, 1 izin listesi dışı soru, karışık leftAt. */
function firstBatch(questionIds: string[]): AttemptTimingEntry[] {
  const entries: AttemptTimingEntry[] = questionIds.slice(0, 20).map((questionId, index) => ({
    questionId,
    activeDurationMs: 1_000 * (index + 1),
    enteredAt: minuteIso(index),
    ...(index % 3 === 0 ? {} : { leftAt: minuteIso(index + 1) }),
  }));
  entries.push(
    { questionId: questionIds[0], activeDurationMs: 7_000, enteredAt: minuteIso(40), leftAt: minuteIso(41) },
    { questionId: questionIds[1], activeDurationMs: 30 * 60_000, enteredAt: minuteIso(42) },
    { questionId: questionIds[2], activeDurationMs: 0, enteredAt: minuteIso(43), leftAt: minuteIso(44) },
    { questionId: "not-in-this-exam", activeDurationMs: 9_000, enteredAt: minuteIso(45) },
    { questionId: questionIds[20], activeDurationMs: 2_500, enteredAt: minuteIso(46) },
  );
  return entries;
}

/** Mevcut satırlara tekrar gönderim + yeni satırlar. */
function secondBatch(questionIds: string[]): AttemptTimingEntry[] {
  return [
    ...firstBatch(questionIds).slice(0, 8),
    { questionId: questionIds[25], activeDurationMs: 4_000, enteredAt: minuteIso(50), leftAt: minuteIso(51) },
    { questionId: questionIds[3], activeDurationMs: 12_000, enteredAt: minuteIso(52) },
  ];
}

async function readTimings(client: PrismaClient, attemptId: string, questionIds: string[]) {
  const rows = await client.odkAttemptQuestionTiming.findMany({ where: { attemptId } });
  const position = new Map(questionIds.map((id, index) => [id, index]));
  return rows
    .map((row) => ({
      question: position.get(row.questionId),
      visitCount: row.visitCount,
      activeDurationMs: row.activeDurationMs,
      firstEnteredAt: row.firstEnteredAt.toISOString(),
      lastLeftAt: row.lastLeftAt?.toISOString() ?? null,
    }))
    .sort((left, right) => (left.question ?? 0) - (right.question ?? 0));
}

before(async () => {
  if (!db) return;
  fixture = await createFixture(db.client);
});

after(async () => {
  if (!db) return;
  if (fixture) await cleanupFixture(db.client, fixture);
  await db.client.$disconnect();
});

integration("new timing writer stores exactly what the legacy per-row loop stored", async () => {
  assert.ok(db && fixture);
  const allowed = new Set(fixture.questionIds);
  const legacyAttempt = await fixture.createAttempt();
  const batchedAttempt = await fixture.createAttempt();

  for (const batch of [firstBatch(fixture.questionIds), secondBatch(fixture.questionIds)]) {
    const legacyAccepted = await legacyRecordTimings(db.client, legacyAttempt.id, batch, allowed);
    const batchedAccepted = await recordAttemptQuestionTimings(db.client, batchedAttempt.id, batch, allowed);
    assert.equal(batchedAccepted, legacyAccepted);
  }

  const legacyRows = await readTimings(db.client, legacyAttempt.id, fixture.questionIds);
  const batchedRows = await readTimings(db.client, batchedAttempt.id, fixture.questionIds);
  assert.equal(legacyRows.length, 22);
  assert.deepEqual(batchedRows, legacyRows);
});

integration("timing writer query count stays constant as the batch grows", async () => {
  assert.ok(db && fixture);
  const allowed = new Set(fixture.questionIds);
  const measurements: Array<{ entries: number; legacy: number; batched: number }> = [];

  for (const size of [5, 25, 40]) {
    const batch: AttemptTimingEntry[] = Array.from({ length: size }, (_, index) => ({
      questionId: fixture!.questionIds[index % QUESTION_COUNT],
      activeDurationMs: 1_000 + index,
      enteredAt: minuteIso(index),
      leftAt: minuteIso(index + 1),
    }));
    const legacyAttempt = await fixture.createAttempt();
    const batchedAttempt = await fixture.createAttempt();

    db.reset();
    await legacyRecordTimings(db.client, legacyAttempt.id, batch, allowed);
    const legacy = db.count();

    db.reset();
    await recordAttemptQuestionTimings(db.client, batchedAttempt.id, batch, allowed);
    const batched = db.count();

    measurements.push({ entries: size, legacy, batched });
  }

  console.info("[odk-timings] query counts", JSON.stringify(measurements));
  for (const measurement of measurements) {
    assert.equal(measurement.legacy, measurement.entries * 2);
    assert.equal(measurement.batched, 1);
  }
});

integration("a failing batch writes nothing", async () => {
  assert.ok(db && fixture);
  const attempt = await fixture.createAttempt();
  // İzin listesine sızmış, var olmayan bir soru FK'yı ihlal eder.
  const allowed = new Set([...fixture.questionIds, "missing-question"]);
  const batch: AttemptTimingEntry[] = [
    { questionId: fixture.questionIds[0], activeDurationMs: 1_000 },
    { questionId: fixture.questionIds[1], activeDurationMs: 1_000 },
    { questionId: "missing-question", activeDurationMs: 1_000 },
  ];

  await assert.rejects(recordAttemptQuestionTimings(db.client, attempt.id, batch, allowed));
  assert.equal(await db.client.odkAttemptQuestionTiming.count({ where: { attemptId: attempt.id } }), 0);
});

integration("concurrent first writes for the same question both count", async () => {
  assert.ok(db && fixture);
  const allowed = new Set(fixture.questionIds);
  const attempt = await fixture.createAttempt();
  const entry: AttemptTimingEntry = { questionId: fixture.questionIds[0], activeDurationMs: 2_000 };

  await Promise.all(
    Array.from({ length: 6 }, () => recordAttemptQuestionTimings(db!.client, attempt.id, [entry], allowed)),
  );

  const row = await db.client.odkAttemptQuestionTiming.findUniqueOrThrow({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId: fixture.questionIds[0] } },
  });
  assert.equal(row.visitCount, 6);
  assert.equal(row.activeDurationMs, 12_000);
});
