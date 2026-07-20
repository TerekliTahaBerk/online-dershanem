import { notFound, redirect } from "next/navigation";
import { requireProductRole } from "@/lib/auth/guards";
import { getStudentExam } from "@/lib/odk/student-exam-server";
import { StudentExamRunner } from "@/components/odk/student-exam-runner";

export const dynamic = "force-dynamic";

export default async function OdkStudentExamRunnerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireProductRole("ODK", "STUDENT");
  const { id } = await params;
  const data = await getStudentExam(id, session.userId);
  if (!data?.exam.currentVersion) notFound();
  if (!data.attempt || data.attempt.status !== "IN_PROGRESS") redirect(`/panel/odk/ogrenci/denemeler/${id}`);
  const questions = data.exam.currentVersion.sections.flatMap((section) => section.questions).map((question) => ({ id: question.id, questionNumber: question.questionNumber }));
  const initialAnswers = Object.fromEntries(data.attempt.answers.map((answer) => [answer.questionId, { selectedOption: answer.selectedOption, isMarked: answer.isMarked, revision: answer.revision }]));
  return <StudentExamRunner examId={id} attemptId={data.attempt.id} deadlineAt={data.attempt.deadlineAt.toISOString()} serverNow={data.serverNow.toISOString()} questions={questions} initialAnswers={initialAnswers} />;
}
