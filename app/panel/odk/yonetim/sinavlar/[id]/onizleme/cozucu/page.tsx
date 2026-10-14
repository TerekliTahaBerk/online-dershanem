import { notFound } from "next/navigation";
import { requireStaffPermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { StudentExamRunner } from "@/components/odk/student-exam-runner";
import { resolveBookletFile } from "@/lib/odk/booklet-access";
import { readSessionPlan, sessionForSection } from "@/lib/odk/exam-sessions";
import { buildPreviewSession } from "@/lib/odk/runner-preview";

export const dynamic = "force-dynamic";

/**
 * YÖNETİCİ ÇÖZÜCÜ ÖNİZLEMESİ (Faz 5 / P1-3): öğrencinin göreceği çözücünün
 * aynısı. Attempt yaratılmaz, hiçbir öğrenci ucu çağrılmaz; cevaplar yalnız
 * sayfada tutulur. Kitapçık yönetici dosya ucundan (odk:exam:edit) ve öğrenci
 * kuralıyla (oturumlu sınavda yalnız seçili oturumun PDF'i) gelir.
 */
export default async function OdkAdminRunnerPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ oturum?: string }>;
}) {
  await requireStaffPermission("odk:exam:edit");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: {
      id: true,
      currentVersion: {
        select: {
          durationMinutes: true,
          settings: true,
          sections: { orderBy: { position: "asc" }, select: { code: true, title: true, questions: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, questionNumber: true, bookletPage: true } } } },
          files: { where: { type: "BOOKLET_PDF" }, select: { id: true, sessionKey: true } },
        },
      },
    },
  });
  if (!exam?.currentVersion) notFound();
  const version = exam.currentVersion;
  const plan = readSessionPlan(version.settings);
  const now = new Date();
  const preview = buildPreviewSession({ plan, requestedKey: typeof query.oturum === "string" ? query.oturum : null, now, durationMinutes: version.durationMinutes });
  const questions = version.sections.flatMap((section) =>
    section.questions.map((question) => ({
      id: question.id,
      questionNumber: question.questionNumber,
      sectionTitle: section.title,
      bookletPage: question.bookletPage,
      sessionKey: plan ? sessionForSection(plan, section.code)?.key ?? null : null,
    })),
  );
  const booklet = resolveBookletFile(version.files, preview.session ? { phase: "SESSION", currentKey: preview.session.currentKey } : null);
  const base = `/panel/odk/yonetim/sinavlar/${exam.id}`;
  return (
    <StudentExamRunner
      examId={exam.id}
      attemptId={`onizleme-${exam.id}`}
      deadlineAt={preview.deadlineAt.toISOString()}
      serverNow={now.toISOString()}
      questions={questions}
      initialAnswers={{}}
      session={preview.session}
      bookletUrl={booklet.ok ? `/api/odk/admin/files/${booklet.fileId}` : null}
      preview={{ exitHref: `${base}?sekme=onizleme`, nextSessionHref: preview.nextSessionKey ? `${base}/onizleme/cozucu?oturum=${preview.nextSessionKey}` : null }}
    />
  );
}
