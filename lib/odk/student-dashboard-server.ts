import "server-only";

import { prisma } from "@/lib/prisma";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import { releasedResultsWithDelta, studentExamState, type StudentExamState, type StudentExamTab } from "@/lib/odk/student-exam-state";

/**
 * Deneme Ligi öğrenci LİSTE ve BUGÜN okumaları — TEK yerde. Web
 * (`app/panel/odk/ogrenci/denemeler`, `components/odk/student-dl-home.tsx`) ve
 * mobil JSON uçları (`/api/odk/student/exams`, `/api/odk/student/home`) aynı
 * fonksiyonları çağırır: aynı durum makinesi (`studentExamState`), aynı
 * sıralama, aynı yayın koşulu (net yalnız RESULT_RELEASED + PUBLISHED skor).
 */

export type OdkExamListView = "tumu" | StudentExamTab;
export const ODK_EXAM_LIST_LIMIT = 50;

type ListedExam = Awaited<ReturnType<typeof listStudentExams>>[number];
export type OdkExamRow = { exam: ListedExam; state: StudentExamState };

async function publishedNets(rows: OdkExamRow[]) {
  const ids = rows.filter((row) => row.state.key === "RESULT_RELEASED" && row.exam.attempts[0]).map((row) => row.exam.attempts[0]!.id);
  const scores = ids.length
    ? await prisma.odkExamAttempt.findMany({
        where: { id: { in: ids }, score: { is: { publicationStatus: "PUBLISHED" } } },
        select: { id: true, score: { select: { totalNet: true } } },
      })
    : [];
  return new Map(scores.map((row) => [row.id, row.score ? Number(row.score.totalNet) : null]));
}

export async function loadOdkStudentExamList(studentUserId: string, view: OdkExamListView) {
  // Bir fazlası istenir: liste kesildiyse ekran "tüm geçmiş" iddia etmez.
  const fetched = await listStudentExams(studentUserId, { limit: ODK_EXAM_LIST_LIMIT + 1 });
  const truncated = fetched.length > ODK_EXAM_LIST_LIMIT;
  const exams = fetched.slice(0, ODK_EXAM_LIST_LIMIT);
  const rows: OdkExamRow[] = exams.map((exam) => ({ exam, state: studentExamState(exam) }));
  const active = rows.find((row) => row.state.key === "IN_PROGRESS") ?? null;
  const netByAttempt = await publishedNets(rows);
  const counts = {
    tumu: rows.length,
    yaklasan: rows.filter((row) => row.state.tab === "yaklasan").length,
    acik: rows.filter((row) => row.state.tab === "acik").length,
    tamamlanan: rows.filter((row) => row.state.tab === "tamamlanan").length,
  };
  // Tümü: önce açık, sonra yaklaşan (yakın tarih önce), sonra tamamlanan (yeni önce).
  const order = { acik: 0, yaklasan: 1, tamamlanan: 2 } as const;
  const visible = rows
    .filter((row) => view === "tumu" || row.state.tab === view)
    .sort((a, b) => {
      if (order[a.state.tab] !== order[b.state.tab]) return order[a.state.tab] - order[b.state.tab];
      const at = a.exam.startsAt?.getTime() ?? 0;
      const bt = b.exam.startsAt?.getTime() ?? 0;
      return a.state.tab === "tamamlanan" ? bt - at : at - bt;
    });
  const netOf = (row: OdkExamRow) => (row.exam.attempts[0] ? (netByAttempt.get(row.exam.attempts[0].id) ?? null) : null);
  return { rows, visible, active, counts, netOf, truncated };
}

export async function loadOdkStudentHome(studentUserId: string, now = new Date()) {
  const exams = await listStudentExams(studentUserId);
  const states: OdkExamRow[] = exams.map((exam) => ({ exam, state: studentExamState(exam) }));

  const active = states.find((item) => item.state.key === "IN_PROGRESS") ?? null;
  const available = states
    .filter((item) => item.state.key === "AVAILABLE")
    .sort((a, b) => (a.exam.startsAt?.getTime() ?? 0) - (b.exam.startsAt?.getTime() ?? 0))[0];
  const upcoming = states
    .filter((item) => item.state.key === "UPCOMING")
    .sort((a, b) => (a.exam.startsAt?.getTime() ?? 0) - (b.exam.startsAt?.getTime() ?? 0))[0];
  const next = active ?? available ?? upcoming ?? null;

  const releasedAttempts = states
    .filter((item) => item.state.key === "RESULT_RELEASED" && item.exam.attempts[0])
    .map((item) => ({ exam: item.exam, attemptId: item.exam.attempts[0]!.id }));
  const scores = releasedAttempts.length
    ? await prisma.odkExamAttempt.findMany({
        where: { id: { in: releasedAttempts.map((item) => item.attemptId) }, score: { is: { publicationStatus: "PUBLISHED" } } },
        select: {
          id: true,
          submittedAt: true,
          score: {
            select: {
              totalNet: true,
              outcomeScores: {
                orderBy: [{ accuracyRate: "asc" }, { outcome: { code: "asc" } }],
                take: 3,
                select: { accuracyRate: true, questionCount: true, outcome: { select: { code: true, title: true } } },
              },
            },
          },
        },
      })
    : [];
  const scoreById = new Map(scores.map((row) => [row.id, row]));
  const results = releasedResultsWithDelta(
    releasedAttempts
      .filter((item) => scoreById.get(item.attemptId)?.score)
      .map((item) => ({
        examId: item.exam.id,
        title: item.exam.title,
        family: item.exam.family,
        at: item.exam.resultsReleasedAt ?? item.exam.startsAt ?? scoreById.get(item.attemptId)!.submittedAt ?? now,
        net: Number(scoreById.get(item.attemptId)!.score!.totalNet),
      })),
  );
  const latest = results[0] ?? null;
  const trendFamily = latest?.family ?? null;
  // Gelişim yalnız AYNI aile içinde (TYT ile AYT/LGS netleri karşılaştırılmaz).
  const trend = results.filter((row) => row.family === trendFamily).slice().reverse();
  const latestAttemptId = latest ? releasedAttempts.find((item) => item.exam.id === latest.examId)?.attemptId : null;
  const focus = latestAttemptId ? (scoreById.get(latestAttemptId)?.score?.outcomeScores ?? []) : [];

  return { next, results, latest, trend, trendFamily, focus, now };
}
