import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Clock, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExamAttemptForm } from "@/components/odk/student/exam-attempt-form";

const familyLabels: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", LGS: "LGS", KPSS: "KPSS", ALES: "ALES",
};

type ExamWithSections = {
  id: string;
  title: string;
  cadenceFamily: string;
  durationMinutes: number;
  sections: Array<{
    id: string;
    title: string;
    questionCount: number;
    orderIndex: number;
    officialAnswers: Array<{ id: string; questionNumber: number; correctOption: string }>;
  }>;
  files: Array<{ id: string; fileType: string; publicUrl: string }>;
};

type AttemptWithOptical = {
  id: string;
  status: string;
  score: unknown;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  opticalAnswers: Array<{ sectionId: string; questionNumber: number; selectedOption: string }>;
};

async function getExamData(examId: string, userId: string) {
  const rawExam = await prisma.odkExam.findFirst({
    where: { id: examId, status: "PUBLISHED" },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: { officialAnswers: true },
      },
      files: true,
    },
  });

  if (!rawExam) return null;
  const exam = rawExam as unknown as ExamWithSections;

  const rawAttempt = await prisma.odkExamAttempt.findFirst({
    where: { userId, examId },
    include: { opticalAnswers: true },
  });
  const attempt = rawAttempt as unknown as AttemptWithOptical | null;

  return { exam, attempt };
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const session = await getServerAuthSession();
  const userId = session!.user.id;

  const data = await getExamData(examId, userId);
  if (!data) notFound();

  const { exam, attempt } = data;

  const totalQuestions = exam.sections.reduce((s, sec) => s + sec.questionCount, 0);
  const booklet = exam.files.find((f) => f.fileType === "BOOKLET_PDF");
  const answerKey = exam.files.find((f) => f.fileType === "ANSWER_KEY_PDF");

  // Build section data for the form
  const sections = exam.sections.map((sec) => {
    const existingAnswers: Record<number, string> = {};
    if (attempt) {
      for (const oa of attempt.opticalAnswers.filter(
        (o) => o.sectionId === sec.id,
      )) {
        existingAnswers[oa.questionNumber] = oa.selectedOption;
      }
    }
    return {
      id: sec.id,
      title: sec.title,
      questionCount: sec.questionCount,
      orderIndex: sec.orderIndex,
      existingAnswers,
      officialAnswerCount: sec.officialAnswers.length,
    };
  });

  const isSubmitted = attempt?.status === "SUBMITTED";
  const isInProgress = attempt?.status === "IN_PROGRESS";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-stone-900">{exam.title}</h1>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
              {familyLabels[exam.cadenceFamily] ?? exam.cadenceFamily}
            </span>
            {isSubmitted && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Tamamlandı
              </span>
            )}
            {isInProgress && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Devam ediyor
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {exam.durationMinutes} dakika
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {totalQuestions} soru
            </span>
            {exam.sections.length > 1 && (
              <span>{exam.sections.length} bölüm</span>
            )}
          </div>
        </div>
        <Link
          href="/odk/panel/sinavlar"
          className="shrink-0 text-xs text-stone-500 hover:text-stone-700 transition"
        >
          ← Sınavlara dön
        </Link>
      </div>

      {/* PDF links */}
      {(booklet || answerKey) && (
        <div className="flex flex-wrap gap-3">
          {booklet && (
            <a
              href={booklet.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-emerald-200 hover:text-emerald-700 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Sınav Kitapçığını Aç
            </a>
          )}
          {answerKey && isSubmitted && (
            <a
              href={answerKey.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-emerald-200 hover:text-emerald-700 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Cevap Anahtarı
            </a>
          )}
        </div>
      )}

      {/* Results — shown when submitted */}
      {isSubmitted && attempt && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-sm font-semibold text-emerald-900 mb-4">Sonucun</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Net", value: attempt.score != null ? Number(attempt.score).toFixed(2) : "—", strong: true },
              { label: "Doğru", value: attempt.correctCount, strong: false },
              { label: "Yanlış", value: attempt.wrongCount, strong: false },
              { label: "Boş", value: attempt.blankCount, strong: false },
            ].map(({ label, value, strong }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${strong ? "text-emerald-700" : "text-stone-900"}`}>
                  {value}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam not yet started */}
      {!attempt && (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-600 mb-4">
            Sınava başlamak için aşağıdaki butona tıkla. Başladıktan sonra cevaplarını işaretleyip gönderebilirsin.
          </p>
          <ExamAttemptForm
            examId={examId}
            attemptId={null}
            sections={sections}
            durationMinutes={exam.durationMinutes}
          />
        </div>
      )}

      {/* Answer entry — in progress */}
      {isInProgress && attempt && (
        <ExamAttemptForm
          examId={examId}
          attemptId={attempt.id}
          sections={sections}
          durationMinutes={exam.durationMinutes}
        />
      )}

      {/* Readonly answers — submitted */}
      {isSubmitted && attempt && sections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-700">Cevapların</h2>
          {sections.map((sec) => {
            const official = exam.sections.find((s) => s.id === sec.id);
            const officialMap: Record<number, string> = {};
            if (official) {
              for (const oa of official.officialAnswers) {
                officialMap[oa.questionNumber] = oa.correctOption;
              }
            }
            return (
              <div key={sec.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                <div className="border-b border-stone-100 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-stone-900">{sec.title}</h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: sec.questionCount }, (_, i) => i + 1).map((qNum) => {
                      const selected = sec.existingAnswers[qNum];
                      const correct = officialMap[qNum];
                      const isCorrect = selected && correct && selected === correct;
                      const isWrong = selected && correct && selected !== correct;
                      return (
                        <div key={qNum} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-right font-mono text-stone-400">{qNum}</span>
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded font-semibold ${
                              isCorrect
                                ? "bg-emerald-100 text-emerald-700"
                                : isWrong
                                ? "bg-red-100 text-red-600"
                                : selected
                                ? "bg-stone-200 text-stone-600"
                                : "bg-stone-50 text-stone-300"
                            }`}
                          >
                            {selected ?? "—"}
                          </span>
                          {correct && selected !== correct && (
                            <span className="text-emerald-600 font-semibold">{correct}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
