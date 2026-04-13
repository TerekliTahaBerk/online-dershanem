import Link from "next/link";
import { BarChart2, ArrowRight } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const familyLabels: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", LGS: "LGS", KPSS: "KPSS", ALES: "ALES",
};

type AttemptRow = {
  id: string;
  status: string;
  startedAt: Date;
  score: unknown;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  exam: {
    id: string;
    title: string;
    cadenceFamily: string;
    durationMinutes: number;
    sections: Array<{ questionCount: number }>;
  };
};

async function getAttempts(userId: string): Promise<AttemptRow[]> {
  const rows = await prisma.odkExamAttempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          cadenceFamily: true,
          durationMinutes: true,
          sections: { select: { questionCount: true } },
        },
      },
    },
  });
  return rows as unknown as AttemptRow[];
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  SUBMITTED:   { label: "Tamamlandı",   cls: "bg-emerald-50 text-emerald-700" },
  IN_PROGRESS: { label: "Devam ediyor", cls: "bg-amber-50 text-amber-700" },
  ABANDONED:   { label: "Terk edildi",  cls: "bg-stone-100 text-stone-500" },
};

export default async function OdkSonuclarPage() {
  const session = await getServerAuthSession();
  const attempts = await getAttempts(session!.user.id);

  const submitted = attempts.filter((a) => a.status === "SUBMITTED");
  const inProgress = attempts.filter((a) => a.status === "IN_PROGRESS");

  const avgScore =
    submitted.length > 0
      ? submitted.reduce((s, a) => s + Number(a.score ?? 0), 0) / submitted.length
      : null;

  const bestAttempt =
    submitted.length > 0
      ? submitted.reduce((best, a) =>
          Number(a.score ?? 0) > Number(best.score ?? 0) ? a : best,
        )
      : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Sonuçlarım</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {submitted.length} tamamlanan sınav
        </p>
      </div>

      {/* Summary cards */}
      {submitted.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium text-stone-500">Toplam Sınav</p>
            <p className="mt-1.5 text-3xl font-bold text-stone-900">{submitted.length}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium text-stone-500">Ortalama Net</p>
            <p className="mt-1.5 text-3xl font-bold text-stone-900">
              {avgScore !== null ? avgScore.toFixed(2) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-xs font-medium text-stone-500">En Yüksek Net</p>
            <p className="mt-1.5 text-3xl font-bold text-emerald-600">
              {bestAttempt ? Number(bestAttempt.score).toFixed(2) : "—"}
            </p>
          </div>
        </div>
      )}

      {attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-16 text-center">
          <BarChart2 className="h-8 w-8 text-stone-300 mb-3" />
          <p className="text-sm font-medium text-stone-500">Henüz sınav sonucun yok</p>
          <p className="text-xs text-stone-400 mt-1">Sınavlarım sayfasından bir sınav çöz.</p>
          <Link
            href="/odk/panel/sinavlar"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Sınavlara Git <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-stone-900">Tüm Girişimler</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {attempts.map((attempt) => {
              const badge = statusConfig[attempt.status] ?? statusConfig.ABANDONED;
              const totalQuestions = attempt.exam.sections.reduce(
                (s, sec) => s + sec.questionCount, 0,
              );
              return (
                <div key={attempt.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {attempt.exam.title}
                      </p>
                      <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                        {familyLabels[attempt.exam.cadenceFamily] ?? attempt.exam.cadenceFamily}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {new Date(attempt.startedAt).toLocaleDateString("tr-TR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                      {attempt.status === "SUBMITTED" && (
                        <> · {totalQuestions} soru · D:{attempt.correctCount} Y:{attempt.wrongCount} B:{attempt.blankCount}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {attempt.score != null && attempt.status === "SUBMITTED" && (
                      <span className="text-sm font-bold text-stone-700">
                        {Number(attempt.score).toFixed(2)} net
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <Link
                      href={`/odk/panel/sinavlar/${attempt.exam.id}`}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-emerald-200 hover:text-emerald-700 transition"
                    >
                      {attempt.status === "IN_PROGRESS" ? "Devam Et" : "Detay"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
