import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Clock, FileText, CheckCircle2, AlertCircle, Trophy } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExamProctor } from "@/components/odk/student/exam-proctor";
import {
  hasOdkExamAnswerKeyReleasedAtColumn,
  hasOdkExamAttemptSectionScoresColumn,
  hasOdkExamGoogleMeetLinkColumn,
  hasOdkExamResultsReleasedAtColumn,
} from "@/lib/odk-exam-schema";

const familyLabels: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", LGS: "LGS", KPSS: "KPSS", ALES: "ALES",
};

async function getExamData(examId: string, userId: string) {
  const [
    hasResultsReleasedAtColumn,
    hasAnswerKeyReleasedAtColumn,
    hasGoogleMeetLinkColumn,
    hasSectionScoresColumn,
  ] = await Promise.all([
    hasOdkExamResultsReleasedAtColumn(),
    hasOdkExamAnswerKeyReleasedAtColumn(),
    hasOdkExamGoogleMeetLinkColumn(),
    hasOdkExamAttemptSectionScoresColumn(),
  ]);

  const rawExam = await prisma.odkExam.findFirst({
    where: { id: examId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      cadenceFamily: true,
      durationMinutes: true,
      startsAt: true,
      endsAt: true,
      ...(hasAnswerKeyReleasedAtColumn ? { answerKeyReleasedAt: true } : {}),
      ...(hasGoogleMeetLinkColumn ? { googleMeetLink: true } : {}),
      ...(hasResultsReleasedAtColumn ? { resultsReleasedAt: true } : {}),
      sections: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          questionCount: true,
          orderIndex: true,
          officialAnswers: true,
        },
      },
      files: true,
    },
  });

  if (!rawExam) return null;

  const rawAttempt = await prisma.odkExamAttempt.findFirst({
    where: { userId, examId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      durationSeconds: true,
      ...(hasSectionScoresColumn ? { sectionScores: true } : {}),
      opticalAnswers: true,
    },
  });

  return {
    exam: {
      ...rawExam,
      answerKeyReleasedAt: "answerKeyReleasedAt" in rawExam ? rawExam.answerKeyReleasedAt ?? null : null,
      googleMeetLink: "googleMeetLink" in rawExam ? rawExam.googleMeetLink ?? null : null,
      resultsReleasedAt: "resultsReleasedAt" in rawExam ? rawExam.resultsReleasedAt ?? null : null,
    },
    attempt: rawAttempt
      ? {
          ...rawAttempt,
          sectionScores: "sectionScores" in rawAttempt ? rawAttempt.sectionScores ?? null : null,
        }
      : null,
  };
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

  // Enforce time window
  const now = new Date();
  const rawExam = exam as unknown as { startsAt?: Date | null; endsAt?: Date | null };
  if (rawExam.startsAt && rawExam.startsAt > now && !attempt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-lg font-semibold text-stone-800">Sınav Henüz Başlamadı</p>
        <p className="text-sm text-stone-500 mt-2">
          Bu sınav {new Date(rawExam.startsAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} tarihinde başlayacak.
        </p>
      </div>
    );
  }
  if (rawExam.endsAt && rawExam.endsAt < now && !attempt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-lg font-semibold text-stone-800">Sınavın Süresi Doldu</p>
        <p className="text-sm text-stone-500 mt-2">Bu sınav artık çözülemez.</p>
      </div>
    );
  }

  const totalQuestions = exam.sections.reduce((s, sec) => s + sec.questionCount, 0);
  const booklet = exam.files.find((f) => f.fileType === "BOOKLET_PDF");
  const answerKey = exam.files.find((f) => f.fileType === "ANSWER_KEY_PDF");

  const sections = exam.sections.map((sec) => {
    const existingAnswers: Record<number, string> = {};
    if (attempt) {
      for (const oa of attempt.opticalAnswers.filter((o) => o.sectionId === sec.id)) {
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

  const rawExamMeta = exam as unknown as {
    resultsReleasedAt?: Date | null;
    answerKeyReleasedAt?: Date | null;
    googleMeetLink?: string | null;
  };
  const resultsReleased = rawExamMeta.resultsReleasedAt != null &&
    new Date(rawExamMeta.resultsReleasedAt) <= new Date();
  const answerKeyReleased = rawExamMeta.answerKeyReleasedAt != null &&
    new Date(rawExamMeta.answerKeyReleasedAt) <= new Date();

  // Submitted but results not yet released
  if (isSubmitted && !resultsReleased) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="rounded-full bg-emerald-100 p-5 mb-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-stone-900">Sınav Tamamlandı!</h1>
        <p className="text-stone-500 mt-2 max-w-sm">
          Cevapların başarıyla kaydedildi. Sonuçlar öğretmenler tarafından kontrol edildikten sonra
          sana e-posta ile bildirim gönderilecek.
        </p>
        <Link href="/odk/panel/sinavlar" className="mt-6 text-xs text-emerald-600 hover:underline">
          ← Sınavlara dön
        </Link>
      </div>
    );
  }

  // Active exam — render fullscreen proctor
  if (!isSubmitted) {
    return (
      <ExamProctor
        examId={examId}
        examTitle={exam.title}
        durationMinutes={exam.durationMinutes}
        attemptId={attempt?.id ?? null}
        attemptStartedAt={attempt?.startedAt?.toISOString() ?? null}
        sections={sections}
        bookletUrl={booklet?.publicUrl ?? null}
        googleMeetLink={(exam as { googleMeetLink?: string }).googleMeetLink ?? null}
      />
    );
  }

  // Submitted — show results page
  const score = attempt?.score != null ? Number(attempt.score) : null;
  const sectionScores = (attempt?.sectionScores as Array<{
    sectionId: string;
    title: string;
    questionCount: number;
    correct: number;
    wrong: number;
    blank: number;
    net: number;
  }> | null) ?? null;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
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
          </div>
        </div>
        <Link
          href="/odk/panel/sinavlar"
          className="shrink-0 text-xs text-stone-500 hover:text-stone-700 transition"
        >
          ← Sınavlara dön
        </Link>
      </div>

      {/* Leaderboard link */}
      {isSubmitted && resultsReleased && (
        <Link
          href={`/odk/panel/sinavlar/${examId}/siralama`}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-emerald-200 hover:text-emerald-700 transition"
        >
          <Trophy className="h-3.5 w-3.5" />
          Sıralamayı Gör
        </Link>
      )}

      {/* PDF links */}
      {(booklet || (answerKey && isSubmitted && answerKeyReleased)) && (
        <div className="flex flex-wrap gap-3">
          {booklet && (
            <a
              href={booklet.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-emerald-200 hover:text-emerald-700 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Sınav Kitapçığı
            </a>
          )}
          {answerKey && isSubmitted && answerKeyReleased && (
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

      {/* Overall results */}
      {isSubmitted && attempt && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-sm font-semibold text-emerald-900 mb-4">Genel Sonuç</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Net", value: score != null ? score.toFixed(2) : "—", strong: true },
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
          {attempt.durationSeconds && (
            <p className="text-xs text-stone-400 mt-3 text-center">
              Süre: {Math.floor(attempt.durationSeconds / 60)} dk {attempt.durationSeconds % 60} sn
            </p>
          )}
        </div>
      )}

      {/* Per-section scores */}
      {isSubmitted && sectionScores && sectionScores.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-700">Bölüm Bazlı Analiz</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {sectionScores.map((sec) => {
              const pct = sec.questionCount > 0
                ? Math.round((sec.correct / sec.questionCount) * 100)
                : 0;
              const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
              return (
                <div key={sec.sectionId} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stone-800">{sec.title}</h3>
                    <span className="text-sm font-bold text-stone-900">{sec.net.toFixed(2)} net</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-stone-100 mb-3">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-3 text-xs text-stone-500">
                    <span className="text-emerald-600 font-medium">{sec.correct} D</span>
                    <span className="text-red-500 font-medium">{sec.wrong} Y</span>
                    <span className="text-stone-400">{sec.blank} B</span>
                    <span className="ml-auto">{pct}% doğru</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Readonly answer grid */}
      {isSubmitted && attempt && sections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-700">Cevaplarım</h2>
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
