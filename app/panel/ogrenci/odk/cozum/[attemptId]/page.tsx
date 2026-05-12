import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { ExamSolver } from "@/components/panel/odk/student/exam-solver";

export const metadata: Metadata = {
  title: "Deneme Çözümü · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudentSolveExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const ctx = await requireOdkPanel("ogrenci");
  const { attemptId } = await params;

  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      cheatViolationCount: true,
      exam: {
        select: {
          id: true,
          title: true,
          slug: true,
          durationMinutes: true,
          settings: true,
          cadenceFamily: true,
          classLevel: true,
          sections: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, title: true, questionCount: true, orderIndex: true },
          },
          files: {
            where: { fileType: "BOOKLET_PDF" },
            select: { publicUrl: true, originalFileName: true },
            take: 1,
          },
        },
      },
      opticalAnswers: {
        select: { sectionId: true, questionNumber: true, selectedOption: true },
      },
    },
  });
  if (!attempt) notFound();
  if (attempt.userId !== ctx.userId && ctx.actualRole !== "ADMIN") notFound();

  if (attempt.status !== "IN_PROGRESS") {
    redirect(`/panel/ogrenci/odk/sonuc/${attemptId}`);
  }

  const totalQuestions = attempt.exam.sections.reduce((a, s) => a + s.questionCount, 0);
  const bookletUrl = attempt.exam.files[0]?.publicUrl ?? null;

  // Bölüm aralıklarını öğrencisine yolluyoruz
  let cursor = 1;
  const sections = attempt.exam.sections.map((s) => {
    const fromQ = cursor;
    const toQ = cursor + s.questionCount - 1;
    cursor += s.questionCount;
    return { id: s.id, title: s.title, fromQ, toQ };
  });

  return (
    <ExamSolver
      attemptId={attempt.id}
      examTitle={attempt.exam.title}
      durationMinutes={attempt.exam.durationMinutes}
      startedAt={attempt.startedAt.toISOString()}
      bookletUrl={bookletUrl}
      sections={sections}
      totalQuestions={totalQuestions}
      initialAnswers={attempt.opticalAnswers}
      initialViolations={attempt.cheatViolationCount}
      examSettings={(attempt.exam.settings ?? null) as Record<string, unknown> | null}
    />
  );
}
