import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { updateExamStatus } from "@/app/odk/admin/actions";
import { AnswerKeyEditor, ExamFilesEditor } from "@/components/odk/admin/exam-detail-editor";

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Taslak",  className: "bg-stone-100 text-stone-600" },
  PUBLISHED: { label: "Yayında", className: "bg-emerald-50 text-emerald-700" },
  ARCHIVED:  { label: "Arşiv",   className: "bg-amber-50 text-amber-700" },
};

async function getExam(examId: string) {
  return prisma.odkExam.findUnique({
    where: { id: examId },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          officialAnswers: { orderBy: { questionNumber: "asc" } },
        },
      },
      files: true,
      examAccessTags: { include: { accessTag: true } },
      _count: { select: { attempts: true } },
    },
  });
}

export default async function ExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const exam = await getExam(examId);
  if (!exam) notFound();

  const status = statusConfig[exam.status] ?? statusConfig.DRAFT;
  const bookletFile = exam.files.find((f) => f.fileType === "BOOKLET_PDF");
  const answerKeyFile = exam.files.find((f) => f.fileType === "ANSWER_KEY_PDF");

  const totalQuestions = exam.sections.reduce((s, sec) => s + sec.questionCount, 0);
  const answeredQuestions = exam.sections.reduce((s, sec) => s + sec.officialAnswers.length, 0);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/odk/admin/sinavlar"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Sınavlara dön
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-stone-900">{exam.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-stone-500 mt-1">
              {exam.cadenceFamily} · {exam.durationMinutes} dk · {exam.sections.length} bölüm · {totalQuestions} soru
            </p>
          </div>
          <div className="flex items-center gap-2">
            {exam.status === "DRAFT" && (
              <form action={async () => { "use server"; await updateExamStatus(examId, "PUBLISHED"); }}>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Yayınla
                </button>
              </form>
            )}
            {exam.status === "PUBLISHED" && (
              <form action={async () => { "use server"; await updateExamStatus(examId, "ARCHIVED"); }}>
                <button type="submit" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition">
                  Arşivle
                </button>
              </form>
            )}
            {exam.status === "ARCHIVED" && (
              <form action={async () => { "use server"; await updateExamStatus(examId, "DRAFT"); }}>
                <button type="submit" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition">
                  Taslağa al
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Toplam Soru", value: totalQuestions },
          { label: "Cevap Girildi", value: `${answeredQuestions}/${totalQuestions}` },
          { label: "Deneme Girişimi", value: exam._count.attempts },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{value}</p>
          </div>
        ))}
      </div>

      {/* PDF Files */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900 mb-4">PDF Dosyaları</h2>
        <ExamFilesEditor
          examId={examId}
          bookletUrl={bookletFile?.publicUrl ?? ""}
          answerKeyUrl={answerKeyFile?.publicUrl ?? ""}
        />
      </div>

      {/* Sections + Answer Keys */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-stone-900">Bölümler ve Cevap Anahtarları</h2>
        {exam.sections.map((section) => (
          <div key={section.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{section.title}</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  {section.questionCount} soru · {section.officialAnswers.length} cevap girildi
                </p>
              </div>
              {section.officialAnswers.length === section.questionCount && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Tamamlandı
                </span>
              )}
            </div>
            <AnswerKeyEditor section={{
              id: section.id,
              title: section.title,
              questionCount: section.questionCount,
              orderIndex: section.orderIndex,
              officialAnswers: section.officialAnswers,
            }} />
          </div>
        ))}
      </div>

      {/* Access Tags */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900 mb-3">Erişim Etiketleri</h2>
        {exam.examAccessTags.length === 0 ? (
          <p className="text-sm text-stone-400">
            Bu sınav herhangi bir erişim etiketiyle ilişkilendirilmemiş.{" "}
            <Link href="/odk/admin/etiketler" className="text-emerald-600 hover:underline">
              Etiketleri yönet →
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {exam.examAccessTags.map(({ accessTag }) => (
              <span
                key={accessTag.id}
                className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
              >
                {accessTag.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
