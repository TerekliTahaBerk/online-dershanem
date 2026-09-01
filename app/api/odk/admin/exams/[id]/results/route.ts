import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { buildExamResultsSummary } from "@/lib/odk/results-ops";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      family: true,
      status: true,
      resultsReleasedAt: true,
      _count: { select: { assignments: { where: { isActive: true } } } },
      attempts: {
        where: { status: { not: "VOID" } },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          integrityLevel: true,
          integrityReviewedAt: true,
          startedAt: true,
          submittedAt: true,
          student: { select: { fullName: true, email: true } },
          score: {
            select: {
              correctCount: true,
              wrongCount: true,
              blankCount: true,
              totalNet: true,
              publicationStatus: true,
              activeDurationMs: true,
              sectionBreakdown: true,
            },
          },
        },
      },
    },
  });
  if (!exam) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });

  const summary = buildExamResultsSummary({
    assignmentCount: exam._count.assignments,
    attempts: exam.attempts.map((attempt) => ({
      id: attempt.id,
      studentName: attempt.student.fullName || attempt.student.email,
      status: attempt.status,
      integrityLevel: attempt.integrityLevel,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score
        ? {
            correctCount: attempt.score.correctCount,
            wrongCount: attempt.score.wrongCount,
            blankCount: attempt.score.blankCount,
            totalNet: Number(attempt.score.totalNet),
            publicationStatus: attempt.score.publicationStatus,
            activeDurationMs: attempt.score.activeDurationMs,
            sectionBreakdown: Array.isArray(attempt.score.sectionBreakdown)
              ? (attempt.score.sectionBreakdown as Array<{ code: string; title: string; net?: number; accuracy?: number }>)
              : null,
          }
        : null,
    })),
  });

  return NextResponse.json({
    exam: { id: exam.id, title: exam.title, family: exam.family, status: exam.status, resultsReleasedAt: exam.resultsReleasedAt },
    summary,
    attempts: exam.attempts.map((attempt) => ({
      id: attempt.id,
      studentName: attempt.student.fullName || attempt.student.email,
      status: attempt.status,
      integrityLevel: attempt.integrityLevel,
      integrityReviewedAt: attempt.integrityReviewedAt,
    })),
  });
}
