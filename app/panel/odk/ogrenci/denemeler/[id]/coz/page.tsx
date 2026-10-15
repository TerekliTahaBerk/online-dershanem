import { notFound, redirect } from "next/navigation";
import { requireProductRole } from "@/lib/auth/guards";
import { getStudentExam, loadAttemptRunnerVersion } from "@/lib/odk/student-exam-server";
import { StudentExamRunner } from "@/components/odk/student-exam-runner";
import { loadAttemptSessionState } from "@/lib/odk/attempt-sessions-server";
import { sessionForSection } from "@/lib/odk/exam-sessions";
import { orderQuestionsForBooklet } from "@/lib/odk/booklets";

export const dynamic = "force-dynamic";

export default async function OdkStudentExamRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireProductRole("ODK", "STUDENT");
  const { id } = await params;
  const data = await getStudentExam(id, session.userId);
  if (!data?.exam.currentVersion) notFound();
  if (!data.attempt || data.attempt.status !== "IN_PROGRESS")
    redirect(`/panel/odk/ogrenci/denemeler/${id}`);
  const version = await loadAttemptRunnerVersion(data.attempt.versionId, data.attempt.bookletCode);
  if (!version) notFound();
  // Oturumlu sınav (LGS): açık oturum, kilitli oturumlar ve ara durumu sunucuda hesaplanır.
  const sessionState = await loadAttemptSessionState({
    id: data.attempt.id,
    startedAt: data.attempt.startedAt,
    deadlineAt: data.attempt.deadlineAt,
    settings: version.settings,
  });
  // Sorular öğrencinin kitapçık sırası ve numarasıyla; cevaplar kanonik soru kimliğiyle yazılır.
  const canonical = version.sections.flatMap((section) =>
    section.questions.map((question) => ({ id: question.id, sectionId: section.id, sectionCode: section.code, sectionTitle: section.title, questionNumber: question.questionNumber, bookletPage: question.bookletPage })),
  );
  const questions = orderQuestionsForBooklet(canonical, version.bookletOrders, data.attempt.bookletCode).map((question) => ({
    id: question.id,
    questionNumber: question.displayNumber,
    sectionTitle: question.sectionTitle,
    bookletPage: question.bookletPage,
    sessionKey: sessionState ? sessionForSection(sessionState.plan, question.sectionCode)?.key ?? null : null,
  }));
  const timeline = sessionState?.timeline ?? null;
  const runnerSession =
    timeline && timeline.phase !== "FINISHED" && timeline.current
      ? {
          phase: timeline.phase,
          currentKey: timeline.current.key,
          currentTitle: timeline.current.title,
          isLast: timeline.isLastSession,
          deadlineAt: timeline.current.deadlineAt.toISOString(),
          breakEndsAt: timeline.breakEndsAt?.toISOString() ?? null,
          sessions: timeline.sessions.map((item) => ({ key: item.key, title: item.title, status: item.status, durationMinutes: item.durationMinutes })),
        }
      : null;
  const initialAnswers = Object.fromEntries(
    data.attempt.answers.map((answer) => [
      answer.questionId,
      {
        selectedOption: answer.selectedOption,
        isMarked: answer.isMarked,
        revision: answer.revision,
      },
    ]),
  );
  return (
    <StudentExamRunner
      examId={id}
      attemptId={data.attempt.id}
      deadlineAt={data.attempt.deadlineAt.toISOString()}
      serverNow={data.serverNow.toISOString()}
      questions={questions}
      bookletCode={version._count.bookletOrders ? data.attempt.bookletCode : null}
      initialAnswers={initialAnswers}
      session={runnerSession}
    />
  );
}
