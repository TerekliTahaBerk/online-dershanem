import { notFound, redirect } from "next/navigation";
import { requireProductRole } from "@/lib/auth/guards";
import { getStudentExam } from "@/lib/odk/student-exam-server";
import { StudentExamRunner } from "@/components/odk/student-exam-runner";
import { loadAttemptSessionState } from "@/lib/odk/attempt-sessions-server";
import { sessionForSection } from "@/lib/odk/exam-sessions";

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
  // Oturumlu sınav (LGS): açık oturum, kilitli oturumlar ve ara durumu sunucuda hesaplanır.
  const sessionState = await loadAttemptSessionState({
    id: data.attempt.id,
    startedAt: data.attempt.startedAt,
    deadlineAt: data.attempt.deadlineAt,
    settings: data.exam.currentVersion.settings,
  });
  const questions = data.exam.currentVersion.sections.flatMap((section) =>
    section.questions.map((question) => ({
      id: question.id,
      questionNumber: question.questionNumber,
      sectionTitle: section.title,
      sessionKey: sessionState ? sessionForSection(sessionState.plan, section.code)?.key ?? null : null,
    })),
  );
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
      initialAnswers={initialAnswers}
      session={runnerSession}
    />
  );
}
