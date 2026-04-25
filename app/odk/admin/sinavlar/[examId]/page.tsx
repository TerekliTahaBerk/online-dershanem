import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { updateExamStatus, releaseExamResults, releaseAnswerKey, addExamAccessTag, removeExamAccessTag } from "@/app/odk/admin/actions";
import { AnswerKeyEditor, AnswerKeyJsonImporter, DeleteExamButton, ExamFilesEditor, ExamMetaEditor, ExamMeetLinkEditor, OutcomesJsonImporter } from "@/components/odk/admin/exam-detail-editor";
import {
  hasOdkExamAnswerKeyReleasedAtColumn,
  hasOdkExamGoogleMeetLinkColumn,
  hasOdkExamResultsReleasedAtColumn,
} from "@/lib/odk-exam-schema";

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Taslak",  className: "bg-stone-100 text-stone-600" },
  PUBLISHED: { label: "Yayında", className: "bg-emerald-50 text-emerald-700" },
  ARCHIVED:  { label: "Arşiv",   className: "bg-amber-50 text-amber-700" },
};

type ExamDetail = {
  id: string;
  title: string;
  status: string;
  cadenceFamily: string;
  durationMinutes: number;
  startsAt: Date | null;
  endsAt: Date | null;
  description: string | null;
  googleMeetLink: string | null;
  resultsReleasedAt: Date | null;
  answerKeyReleasedAt: Date | null;
  sections: Array<{
    id: string;
    title: string;
    questionCount: number;
    orderIndex: number;
    officialAnswers: Array<{ id: string; questionNumber: number; correctOption: string }>;
  }>;
  files: Array<{ id: string; fileType: string; publicUrl: string }>;
  examAccessTags: Array<{ accessTag: { id: string; title: string } }>;
  _count: { attempts: number };
};

async function getExam(examId: string) {
  const [
    hasResultsReleasedAtColumn,
    hasAnswerKeyReleasedAtColumn,
    hasGoogleMeetLinkColumn,
  ] = await Promise.all([
    hasOdkExamResultsReleasedAtColumn(),
    hasOdkExamAnswerKeyReleasedAtColumn(),
    hasOdkExamGoogleMeetLinkColumn(),
  ]);

  const [row, allTags] = await Promise.all([
    prisma.odkExam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        status: true,
        cadenceFamily: true,
        durationMinutes: true,
        startsAt: true,
        endsAt: true,
        description: true,
        ...(hasGoogleMeetLinkColumn ? { googleMeetLink: true } : {}),
        ...(hasAnswerKeyReleasedAtColumn ? { answerKeyReleasedAt: true } : {}),
        ...(hasResultsReleasedAtColumn ? { resultsReleasedAt: true } : {}),
        sections: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            title: true,
            questionCount: true,
            orderIndex: true,
            officialAnswers: { orderBy: { questionNumber: "asc" } },
          },
        },
        files: { select: { id: true, fileType: true, publicUrl: true } },
        examAccessTags: { include: { accessTag: true } },
        _count: { select: { attempts: true } },
      },
    }),
    prisma.odkAccessTag.findMany({
      where: { isActive: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!row) return null;
  return {
    exam: {
      ...row,
      startsAt: row.startsAt ?? null,
      endsAt: row.endsAt ?? null,
      description: row.description ?? null,
      googleMeetLink: "googleMeetLink" in row ? row.googleMeetLink ?? null : null,
      answerKeyReleasedAt: "answerKeyReleasedAt" in row ? row.answerKeyReleasedAt ?? null : null,
      resultsReleasedAt: "resultsReleasedAt" in row ? row.resultsReleasedAt ?? null : null,
    } as ExamDetail,
    allTags,
    hasAnswerKeyReleasedAtColumn,
    hasGoogleMeetLinkColumn,
    hasResultsReleasedAtColumn,
  };
}

export default async function ExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const data = await getExam(examId);
  if (!data) notFound();

  const {
    exam,
    allTags,
    hasAnswerKeyReleasedAtColumn,
    hasGoogleMeetLinkColumn,
    hasResultsReleasedAtColumn,
  } = data;
  const status = statusConfig[exam.status] ?? statusConfig.DRAFT;
  const bookletFile = exam.files.find((f) => f.fileType === "BOOKLET_PDF");
  const answerKeyFile = exam.files.find((f) => f.fileType === "ANSWER_KEY_PDF");

  const totalQuestions = exam.sections.reduce((s, sec) => s + sec.questionCount, 0);
  const answeredQuestions = exam.sections.reduce((s, sec) => s + sec.officialAnswers.length, 0);
  const linkedTagIds = new Set(exam.examAccessTags.map((et) => et.accessTag.id));
  const availableTags = allTags.filter((t) => !linkedTagIds.has(t.id));

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
            <Link
              href={`/odk/admin/sinavlar/${examId}/istatistikler`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
            >
              <BarChart2 className="h-3.5 w-3.5" /> İstatistikler
            </Link>
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

      {/* Exam metadata editor */}
      <ExamMetaEditor
        examId={examId}
        current={{
          title: exam.title,
          cadenceFamily: exam.cadenceFamily,
          durationMinutes: exam.durationMinutes,
          startsAt: exam.startsAt ? exam.startsAt.toISOString() : null,
          endsAt: exam.endsAt ? exam.endsAt.toISOString() : null,
          description: exam.description,
        }}
      />

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

      {/* Results & Answer Key Release */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900 mb-4">Sonuç & Cevap Anahtarı Yayını</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Results */}
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Sonuçlar</p>
            {exam.resultsReleasedAt ? (
              <p className="text-sm text-emerald-700 font-medium">
                ✓ {new Date(exam.resultsReleasedAt).toLocaleString("tr-TR")} tarihinde yayınlandı
              </p>
            ) : !hasResultsReleasedAtColumn ? (
              <p className="text-xs text-amber-700">
                Sonuc yayinlama ozelligi gecici olarak kapali. Veritabaninda
                <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[11px]">odk_exams.results_released_at</code>
                kolonu eksik.
              </p>
            ) : (
              <>
                <p className="text-xs text-stone-400 mb-3">Öğrenciler henüz sonuçlarını göremiyor.</p>
                <form action={async () => { "use server"; await releaseExamResults(examId); }}>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    Sonuçları Yayınla & E-posta Gönder
                  </button>
                </form>
              </>
            )}
          </div>
          {/* Answer key */}
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Cevap Anahtarı</p>
            {exam.answerKeyReleasedAt ? (
              <p className="text-sm text-emerald-700 font-medium">
                ✓ {new Date(exam.answerKeyReleasedAt).toLocaleString("tr-TR")} tarihinde yayınlandı
              </p>
            ) : !hasAnswerKeyReleasedAtColumn ? (
              <p className="text-xs text-amber-700">
                Cevap anahtari yayini gecici olarak kapali. Veritabaninda
                <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[11px]">odk_exams.answer_key_released_at</code>
                kolonu eksik.
              </p>
            ) : (
              <>
                <p className="text-xs text-stone-400 mb-3">Cevap anahtarı PDF&apos;i öğrencilere kapalı.</p>
                <form action={async () => { "use server"; await releaseAnswerKey(examId); }}>
                  <button
                    type="submit"
                    className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
                  >
                    Cevap Anahtarını Aç
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
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

      {/* Google Meet link */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900 mb-4">Gözetim (Proctoring)</h2>
        {hasGoogleMeetLinkColumn ? (
          <ExamMeetLinkEditor
            examId={examId}
            currentLink={exam.googleMeetLink ?? ""}
          />
        ) : (
          <p className="text-xs text-amber-700">
            Google Meet alani bu veritabaninda henuz yok.
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[11px]">odk_exams.google_meet_link</code>
            kolonu eklendiginde bu alan kullanilabilir.
          </p>
        )}
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

      {/* JSON Import */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-6">
        <h2 className="text-sm font-semibold text-stone-900">JSON İçe Aktarma</h2>
        <AnswerKeyJsonImporter examId={examId} />
        <div className="border-t border-stone-100 pt-6">
          <OutcomesJsonImporter examId={examId} />
        </div>
      </div>

      {/* Access Tags */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Erişim Etiketleri</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Yalnızca bu etiketlere sahip öğrenciler sınavı görebilir. Etiket yoksa herkese açık.
          </p>
        </div>

        {exam.examAccessTags.length === 0 ? (
          <p className="text-sm text-stone-400">Henüz etiket eklenmemiş — sınav herkese açık.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {exam.examAccessTags.map(({ accessTag }) => (
              <div key={accessTag.id} className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 pl-3 pr-1.5 py-1">
                <span className="text-xs font-medium text-emerald-700">{accessTag.title}</span>
                <form action={async () => { "use server"; await removeExamAccessTag(examId, accessTag.id); }}>
                  <button
                    type="submit"
                    className="rounded-full h-4 w-4 flex items-center justify-center text-emerald-500 hover:bg-emerald-200 hover:text-emerald-800 transition text-xs font-bold"
                  >
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {availableTags.length > 0 && (
          <form
            action={async (fd: FormData) => {
              "use server";
              const tagId = fd.get("tagId") as string;
              if (tagId) await addExamAccessTag(examId, tagId);
            }}
            className="flex items-center gap-2 pt-2 border-t border-stone-100"
          >
            <select
              name="tagId"
              defaultValue=""
              className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="" disabled>Etiket seç…</option>
              {availableTags.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shrink-0"
            >
              Ekle
            </button>
          </form>
        )}
      </div>
      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-red-50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-red-800">Tehlikeli İşlemler</h2>
        <p className="text-xs text-red-600">
          Sınavı silmek geri alınamaz. Tüm katılım kayıtları ve cevaplar da silinir.
        </p>
        <DeleteExamButton examId={examId} />
      </div>
    </div>
  );
}
