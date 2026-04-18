import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, TrendingDown, TrendingUp, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  hasOdkExamAttemptSectionScoresColumn,
  hasOdkExamAttemptTabSwitchCountColumn,
} from "@/lib/odk-exam-schema";

type SectionScore = {
  sectionId: string;
  title: string;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
};

async function getExamStats(examId: string) {
  const [hasSectionScoresColumn, hasTabSwitchCountColumn] = await Promise.all([
    hasOdkExamAttemptSectionScoresColumn(),
    hasOdkExamAttemptTabSwitchCountColumn(),
  ]);

  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: { id: true, title: true, cadenceFamily: true, sections: { select: { id: true, title: true, questionCount: true } } },
  });
  if (!exam) return null;

  const attempts = await prisma.odkExamAttempt.findMany({
    where: { examId, status: "SUBMITTED" },
    select: {
      id: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      durationSeconds: true,
      ...(hasTabSwitchCountColumn ? { tabSwitchCount: true } : {}),
      ...(hasSectionScoresColumn ? { sectionScores: true } : {}),
      submittedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const inProgressCount = await prisma.odkExamAttempt.count({
    where: { examId, status: "IN_PROGRESS" },
  });

  return {
    exam,
    attempts: attempts.map((attempt) => ({
      ...attempt,
      sectionScores: "sectionScores" in attempt ? attempt.sectionScores : null,
      tabSwitchCount: "tabSwitchCount" in attempt ? attempt.tabSwitchCount : 0,
    })) as unknown as typeof attempts,
    inProgressCount,
  };
}

function aggregateSections(attempts: { sectionScores: unknown }[]) {
  const map: Record<string, { correct: number; wrong: number; blank: number; total: number; count: number }> = {};
  for (const a of attempts) {
    const sections = a.sectionScores as SectionScore[] | null;
    if (!sections) continue;
    for (const sec of sections) {
      if (!map[sec.title]) map[sec.title] = { correct: 0, wrong: 0, blank: 0, total: 0, count: 0 };
      map[sec.title].correct += sec.correct;
      map[sec.title].wrong += sec.wrong;
      map[sec.title].blank += sec.blank;
      map[sec.title].total += sec.questionCount;
      map[sec.title].count += 1;
    }
  }
  return Object.entries(map).map(([title, v]) => ({
    title,
    avgCorrect: v.count > 0 ? v.correct / v.count : 0,
    avgWrong: v.count > 0 ? v.wrong / v.count : 0,
    pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    total: v.total / (v.count || 1),
  })).sort((a, b) => a.pct - b.pct);
}

export default async function ExamStatsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const data = await getExamStats(examId);
  if (!data) notFound();

  const { exam, attempts, inProgressCount } = data;

  const scores = attempts.map((a) => Number(a.score ?? 0));
  const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
  const maxScore = scores.length > 0 ? Math.max(...scores) : null;
  const minScore = scores.length > 0 ? Math.min(...scores) : null;
  const highViolationAttempts = attempts.filter((a) => (a.tabSwitchCount ?? 0) > 0);

  const sectionStats = aggregateSections(attempts as { sectionScores: unknown }[]);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <Link
          href={`/odk/admin/sinavlar/${examId}`}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Sınav detayına dön
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">{exam.title}</h1>
            <p className="text-sm text-stone-500 mt-0.5">İstatistikler & Analiz</p>
          </div>
          <a
            href={`/api/odk/admin/exams/${examId}/export-csv`}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
          >
            <Download className="h-3.5 w-3.5" />
            CSV İndir
          </a>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tamamlayan", value: attempts.length },
          { label: "Devam Eden", value: inProgressCount },
          { label: "Ortalama Net", value: avgScore !== null ? avgScore.toFixed(2) : "—" },
          { label: "En Yüksek Net", value: maxScore !== null ? maxScore.toFixed(2) : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Section averages */}
      {sectionStats.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-stone-900 mb-4">Bölüm Bazlı Sınıf Ortalaması</h2>
          <div className="space-y-3">
            {sectionStats.map((sec) => {
              const barColor = sec.pct >= 70 ? "bg-emerald-500" : sec.pct >= 40 ? "bg-amber-400" : "bg-red-400";
              const Icon = sec.pct >= 60 ? TrendingUp : TrendingDown;
              const iconColor = sec.pct >= 60 ? "text-emerald-500" : "text-red-400";
              return (
                <div key={sec.title}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                      <span className="text-sm font-medium text-stone-700">{sec.title}</span>
                    </div>
                    <span className="text-sm font-bold text-stone-900">{sec.pct}% doğru</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${sec.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Ortalama {sec.avgCorrect.toFixed(1)} doğru / {sec.total.toFixed(0)} soru
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score range */}
      {attempts.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-stone-900 mb-1">Net Dağılımı</h2>
          <p className="text-xs text-stone-400 mb-4">
            Min: {minScore?.toFixed(2)} · Maks: {maxScore?.toFixed(2)} · Ortalama: {avgScore?.toFixed(2)}
          </p>
          <div className="flex gap-1 items-end h-16">
            {(() => {
              if (!maxScore || !minScore) return null;
              const buckets = 10;
              const range = (maxScore - minScore) || 1;
              const counts = Array(buckets).fill(0);
              scores.forEach((s) => {
                const idx = Math.min(Math.floor(((s - minScore) / range) * buckets), buckets - 1);
                counts[idx]++;
              });
              const maxCount = Math.max(...counts, 1);
              return counts.map((count, i) => (
                <div
                  key={i}
                  className="flex-1 bg-emerald-400 rounded-t-sm min-h-[2px] transition-all"
                  style={{ height: `${(count / maxCount) * 100}%` }}
                  title={`${count} öğrenci`}
                />
              ));
            })()}
          </div>
        </div>
      )}

      {/* Violations */}
      {highViolationAttempts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" /> İhlal Tespit Edilenler ({highViolationAttempts.length})
          </h2>
          <div className="divide-y divide-amber-100 rounded-lg border border-amber-200 bg-white overflow-hidden">
            {highViolationAttempts
              .sort((a, b) => (b.tabSwitchCount ?? 0) - (a.tabSwitchCount ?? 0))
              .map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {a.user.name ?? a.user.email}
                    </p>
                    <p className="text-xs text-stone-400">{a.user.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-stone-700">{Number(a.score ?? 0).toFixed(2)} net</span>
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      {a.tabSwitchCount} ihlal
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All results table */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-stone-900">Tüm Sonuçlar</h2>
        </div>
        {attempts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-stone-400">Henüz tamamlanan girişim yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-xs text-stone-500">
                  <th className="px-4 py-2.5 text-left font-medium">Öğrenci</th>
                  <th className="px-4 py-2.5 text-right font-medium">Net</th>
                  <th className="px-4 py-2.5 text-right font-medium">D</th>
                  <th className="px-4 py-2.5 text-right font-medium">Y</th>
                  <th className="px-4 py-2.5 text-right font-medium">B</th>
                  <th className="px-4 py-2.5 text-right font-medium">Süre</th>
                  <th className="px-4 py-2.5 text-right font-medium">İhlal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[...attempts]
                  .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
                  .map((a, idx) => (
                    <tr key={a.id} className="hover:bg-stone-50 transition">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-stone-900">{a.user.name ?? "—"}</p>
                        <p className="text-xs text-stone-400">{a.user.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-stone-900">
                        {Number(a.score ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">{a.correctCount}</td>
                      <td className="px-4 py-2.5 text-right text-red-500 font-medium">{a.wrongCount}</td>
                      <td className="px-4 py-2.5 text-right text-stone-400">{a.blankCount}</td>
                      <td className="px-4 py-2.5 text-right text-stone-500">
                        {a.durationSeconds ? `${Math.floor(a.durationSeconds / 60)}dk` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {(a.tabSwitchCount ?? 0) > 0 ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                            {a.tabSwitchCount}
                          </span>
                        ) : (
                          <span className="text-stone-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
