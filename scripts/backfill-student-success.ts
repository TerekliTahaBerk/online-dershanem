#!/usr/bin/env node
/**
 * Mevcut production verisini Student Success Layer'a backfill eder.
 *
 * İDEMPOTENT: her yazım `upsert` + `update: {}` — aynı kaynak ikinci kez
 * işlendiğinde kanıt ÇOĞALMAZ, mevcut satır da değişmez.
 *
 * Kullanım:
 *   npx tsx scripts/backfill-student-success.ts --dry-run
 *   npx tsx scripts/backfill-student-success.ts --from=2026-01-01 --to=2026-06-30
 *   npx tsx scripts/backfill-student-success.ts --student-id=<cuid>
 *   npx tsx scripts/backfill-student-success.ts --batch-size=50
 *
 * ÜRETİMDE ÖNCE `--dry-run` ile koş: hiçbir şey yazılmaz, sayımlar raporlanır.
 */

import { PrismaClient } from "@prisma/client";
import { computeOutcomeMastery, evidenceToSignal } from "../lib/student-success/mastery";

const prisma = new PrismaClient();
function flag(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

function dateFlag(name: string): Date | undefined {
  const raw = flag(name);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`--${name} geçerli bir tarih değil: ${raw}`);
  }
  return parsed;
}

const dryRun = process.argv.includes("--dry-run");
const studentIdArg = flag("student-id");

/**
 * Kaynak kaydın GERÇEKLEŞME anına göre pencere. Ders `startsAt`, ödev
 * `completedAt`, deneme `submittedAt` üzerinden filtrelenir — kanıtın
 * `occurredAt` alanıyla aynı alanlar, yani pencere raporlandığı gibi çalışır.
 */
const fromDate = dateFlag("from");
const toDate = dateFlag("to");

/** Öğrenci sayfa boyutu. Tek seferde 10.000 öğrenci çekmek sessizce kırpıyordu. */
const BATCH_SIZE = Math.max(1, Math.min(1000, Number(flag("batch-size") ?? 100) || 100));

/** `undefined` döner ki Prisma `where`'e boş bir aralık koymasın. */
function dateRange(): { gte?: Date; lte?: Date } | undefined {
  if (!fromDate && !toDate) return undefined;
  return { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) };
}

type Stats = {
  lessonEvidence: number;
  assignmentEvidence: number;
  mockExamEvidence: number;
  masteryRows: number;
  errors: Array<{ scope: string; id: string; error: string }>;
};

async function backfillLessonEvidence(studentId: string, stats: Stats): Promise<void> {
  const rows = await prisma.lessonOutcome.findMany({
    where: {
      lesson: {
        status: "COMPLETED",
        ...(dateRange() ? { startsAt: dateRange() } : {}),
        group: { enrollments: { some: { studentId, endedAt: null } } },
      },
    },
    select: {
      outcomeId: true,
      evidenceType: true,
      lessonId: true,
      lesson: { select: { title: true, startsAt: true } },
    },
    take: 5000,
  });

  for (const row of rows) {
    try {
      if (!dryRun) {
        await prisma.studentProgressEvidence.upsert({
          where: {
            studentId_outcomeId_sourceType_sourceId: {
              studentId,
              outcomeId: row.outcomeId,
              sourceType: "LESSON",
              sourceId: row.lessonId,
            },
          },
          create: {
            studentId,
            outcomeId: row.outcomeId,
            sourceType: "LESSON",
            sourceId: row.lessonId,
            productCode: "OD",
            summary: `${row.lesson.title} dersinde işlendi (${row.evidenceType}).`,
            metrics: { evidenceType: row.evidenceType },
            occurredAt: row.lesson.startsAt,
          },
          update: {},
        });
      }
      stats.lessonEvidence += 1;
    } catch (error) {
      stats.errors.push({ scope: "lesson", id: row.lessonId, error: String(error) });
    }
  }
}

async function backfillAssignmentEvidence(studentId: string, stats: Stats): Promise<void> {
  const progress = await prisma.assignmentProgress.findMany({
    where: { studentId, status: "DONE", ...(dateRange() ? { completedAt: dateRange() } : {}) },
    select: {
      assignmentId: true,
      completedAt: true,
      assignment: {
        select: {
          title: true,
          outcomeLinks: { select: { outcomeId: true } },
        },
      },
    },
    take: 5000,
  });

  for (const row of progress) {
    for (const link of row.assignment.outcomeLinks) {
      try {
        if (!dryRun) {
          await prisma.studentProgressEvidence.upsert({
            where: {
              studentId_outcomeId_sourceType_sourceId: {
                studentId,
                outcomeId: link.outcomeId,
                sourceType: "ASSIGNMENT",
                sourceId: row.assignmentId,
              },
            },
            create: {
              studentId,
              outcomeId: link.outcomeId,
              sourceType: "ASSIGNMENT",
              sourceId: row.assignmentId,
              productCode: "OD",
              summary: `${row.assignment.title} ödevi tamamlandı.`,
              metrics: { completed: true },
              occurredAt: row.completedAt ?? new Date(),
            },
            update: {},
          });
        }
        stats.assignmentEvidence += 1;
      } catch (error) {
        stats.errors.push({ scope: "assignment", id: row.assignmentId, error: String(error) });
      }
    }
  }
}

async function backfillMockExamEvidence(studentId: string, userId: string, stats: Stats): Promise<void> {
  const attempts = await prisma.odkExamAttempt.findMany({
    where: {
      studentUserId: userId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      ...(dateRange() ? { submittedAt: dateRange() } : {}),
      score: { is: { publicationStatus: "PUBLISHED" } },
    },
    select: {
      id: true,
      submittedAt: true,
      exam: { select: { title: true } },
      score: {
        select: {
          outcomeScores: {
            select: {
              outcomeId: true,
              questionCount: true,
              correctCount: true,
              accuracyRate: true,
            },
          },
        },
      },
    },
    take: 500,
  });

  for (const attempt of attempts) {
    if (!attempt.score) continue;
    for (const row of attempt.score.outcomeScores) {
      try {
        if (!dryRun) {
          await prisma.studentProgressEvidence.upsert({
            where: {
              studentId_outcomeId_sourceType_sourceId: {
                studentId,
                outcomeId: row.outcomeId,
                sourceType: "MOCK_EXAM",
                sourceId: attempt.id,
              },
            },
            create: {
              studentId,
              outcomeId: row.outcomeId,
              sourceType: "MOCK_EXAM",
              sourceId: attempt.id,
              productCode: "ODK",
              summary: `${attempt.exam.title}: ${row.correctCount}/${row.questionCount} doğru.`,
              metrics: {
                questionCount: row.questionCount,
                correctCount: row.correctCount,
                accuracyRate: Number(row.accuracyRate),
              },
              occurredAt: attempt.submittedAt ?? new Date(),
            },
            update: {},
          });
        }
        stats.mockExamEvidence += 1;
      } catch (error) {
        stats.errors.push({ scope: "mock-exam", id: attempt.id, error: String(error) });
      }
    }
  }
}

async function rescoreMastery(studentId: string, stats: Stats): Promise<void> {
  const evidence = await prisma.studentProgressEvidence.findMany({
    where: { studentId },
    select: {
      outcomeId: true,
      sourceType: true,
      sourceId: true,
      productCode: true,
      summary: true,
      metrics: true,
      occurredAt: true,
    },
  });

  const byOutcome = new Map<string, typeof evidence>();
  for (const row of evidence) {
    const list = byOutcome.get(row.outcomeId) ?? [];
    list.push(row);
    byOutcome.set(row.outcomeId, list);
  }

  const now = new Date();
  for (const [outcomeId, rows] of byOutcome) {
    const signals = rows.map((row) =>
      evidenceToSignal({
        studentId,
        outcomeId: row.outcomeId,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        productCode: row.productCode,
        summary: row.summary,
        metrics: row.metrics as Record<string, unknown>,
        occurredAt: row.occurredAt,
      }),
    );
    const result = computeOutcomeMastery(signals, now);
    try {
      if (!dryRun) {
        await prisma.studentOutcomeMastery.upsert({
          where: { studentId_outcomeId: { studentId, outcomeId } },
          create: {
            studentId,
            outcomeId,
            status: result.status,
            explanation: result.explanation,
            evidenceCount: result.evidenceCount,
            computedAt: now,
          },
          update: {
            status: result.status,
            explanation: result.explanation,
            evidenceCount: result.evidenceCount,
            computedAt: now,
          },
        });
      }
      stats.masteryRows += 1;
    } catch (error) {
      stats.errors.push({ scope: "mastery", id: outcomeId, error: String(error) });
    }
  }
}

async function main() {
  const totals: Stats = {
    lessonEvidence: 0,
    assignmentEvidence: 0,
    mockExamEvidence: 0,
    masteryRows: 0,
    errors: [],
  };

  let studentCount = 0;
  // Cursor sayfalama: eski hâl tek sorguda `take: 10000` yapıyordu ve daha fazla
  // öğrenci varsa fazlası SESSİZCE atlanıyordu — backfill "başarılı" raporlarken
  // bir kısım öğrencinin kanıtı hiç oluşmuyordu.
  let cursor: string | undefined;
  for (;;) {
    const students = studentIdArg
      ? await prisma.studentProfile.findMany({ where: { id: studentIdArg }, select: { id: true, userId: true } })
      : await prisma.studentProfile.findMany({
          select: { id: true, userId: true },
          orderBy: { id: "asc" },
          take: BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
    if (!students.length) break;

    for (const student of students) {
      await backfillLessonEvidence(student.id, totals);
      await backfillAssignmentEvidence(student.id, totals);
      await backfillMockExamEvidence(student.id, student.userId, totals);
      await rescoreMastery(student.id, totals);
    }
    studentCount += students.length;
    console.error(
      JSON.stringify({ event: "backfill.progress", studentCount, errorCount: totals.errors.length }),
    );

    if (studentIdArg) break;
    cursor = students[students.length - 1].id;
    if (students.length < BATCH_SIZE) break;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        from: fromDate?.toISOString() ?? null,
        to: toDate?.toISOString() ?? null,
        batchSize: BATCH_SIZE,
        studentCount,
        ...totals,
        errorCount: totals.errors.length,
      },
      null,
      2,
    ),
  );

  if (totals.errors.length) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
