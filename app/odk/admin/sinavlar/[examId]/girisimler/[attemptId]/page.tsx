import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, XCircle, Circle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  hasOdkExamAttemptSectionScoresColumn,
  hasOdkExamAttemptTabSwitchCountColumn,
} from "@/lib/odk-exam-schema";

type Outcome = { konu?: string; kazanim?: string; altKazanim?: string } | null;

type SectionScore = {
  sectionId: string;
  title: string;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
};

type KazanimStat = {
  konu: string;
  kazanim: string;
  correct: number;
  wrong: number;
  blank: number;
};

type IntegrityFlags = {
  avgAnswerIntervalMs?: number;
  minAnswerIntervalMs?: number;
  suspiciouslyFastAnswers?: number;
  burstAnswerGroups?: number;
  totalTimestamped?: number;
};

async function getAttemptDetail(examId: string, attemptId: string) {
  const [hasSectionScores, hasTabSwitch] = await Promise.all([
    hasOdkExamAttemptSectionScoresColumn(),
    hasOdkExamAttemptTabSwitchCountColumn(),
  ]);

  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      sections: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          questionCount: true,
          orderIndex: true,
          officialAnswers: {
            select: { questionNumber: true, correctOption: true, outcomes: true },
          },
        },
      },
    },
  });
  if (!exam) return null;

  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { id: attemptId, examId },
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
      suspiciousScore: true,
      resultPayload: true,
      ...(hasSectionScores ? { sectionScores: true } : {}),
      ...(hasTabSwitch ? { tabSwitchCount: true } : {}),
      user: { select: { id: true, name: true, email: true } },
      opticalAnswers: {
        select: { sectionId: true, questionNumber: true, selectedOption: true, answeredAt: true },
      },
    },
  });
  if (!attempt) return null;

  const a = attempt as typeof attempt & {
    sectionScores?: unknown;
    tabSwitchCount?: number;
  };

  return {
    exam,
    attempt: {
      ...a,
      sectionScores: (a.sectionScores ?? null) as SectionScore[] | null,
      tabSwitchCount: a.tabSwitchCount ?? 0,
    },
  };
}

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}dk ${s}sn`;
}

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ examId: string; attemptId: string }>;
}) {
  const { examId, attemptId } = await params;
  const data = await getAttemptDetail(examId, attemptId);
  if (!data) notFound();
  const { exam, attempt } = data;

  // Build per-section, per-question rows
  type Row = {
    sectionId: string;
    sectionTitle: string;
    questionNumber: number;
    selected: string | null;
    correct: string | null;
    outcome: Outcome;
    state: "correct" | "wrong" | "blank" | "no-key";
  };

  const rowsBySection: Array<{ section: typeof exam.sections[number]; rows: Row[] }> = [];
  for (const section of exam.sections) {
    const officialMap = new Map<number, { correctOption: string; outcomes: Outcome }>();
    for (const o of section.officialAnswers) {
      officialMap.set(o.questionNumber, {
        correctOption: o.correctOption,
        outcomes: (o.outcomes as Outcome) ?? null,
      });
    }
    const userMap = new Map<number, string>();
    for (const oa of attempt.opticalAnswers.filter((o) => o.sectionId === section.id)) {
      userMap.set(oa.questionNumber, oa.selectedOption);
    }

    const rows: Row[] = [];
    for (let q = 1; q <= section.questionCount; q++) {
      const off = officialMap.get(q);
      const sel = userMap.get(q) ?? null;
      let state: Row["state"];
      if (!off) state = "no-key";
      else if (!sel) state = "blank";
      else if (sel === off.correctOption) state = "correct";
      else state = "wrong";
      rows.push({
        sectionId: section.id,
        sectionTitle: section.title,
        questionNumber: q,
        selected: sel,
        correct: off?.correctOption ?? null,
        outcome: off?.outcomes ?? null,
        state,
      });
    }
    rowsBySection.push({ section, rows });
  }

  const integrityFlags =
    (attempt.resultPayload as { integrityFlags?: IntegrityFlags } | null)?.integrityFlags ?? null;
  const kazanimBreakdown =
    (attempt.resultPayload as { kazanimBreakdown?: KazanimStat[] } | null)?.kazanimBreakdown ?? [];

  const score = attempt.score != null ? Number(attempt.score) : null;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <Link
          href={`/odk/admin/sinavlar/${examId}/istatistikler`}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          İstatistiklere dön
        </Link>
        <h1 className="text-xl font-semibold text-stone-900">{exam.title}</h1>
        <p className="text-sm text-stone-500 mt-1">
          {attempt.user.name ?? "—"} · <span className="text-stone-400">{attempt.user.email}</span>
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Net", value: score != null ? score.toFixed(2) : "—" },
          { label: "Doğru", value: attempt.correctCount, color: "text-emerald-700" },
          { label: "Yanlış", value: attempt.wrongCount, color: "text-red-600" },
          { label: "Boş", value: attempt.blankCount, color: "text-stone-500" },
          { label: "Süre", value: formatDuration(attempt.durationSeconds ?? null) },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs text-stone-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color ?? "text-stone-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Anti-cheat flags */}
      {(attempt.tabSwitchCount > 0 || integrityFlags || attempt.suspiciousScore != null) && (
        <div className={`rounded-xl border p-4 space-y-3 ${
          (attempt.suspiciousScore ?? 0) >= 0.6
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
        }`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-semibold flex items-center gap-2 ${(attempt.suspiciousScore ?? 0) >= 0.6 ? "text-red-900" : "text-amber-900"}`}>
              <AlertTriangle className="h-4 w-4" /> Bütünlük Sinyalleri
            </h2>
            {attempt.suspiciousScore != null && (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                attempt.suspiciousScore >= 0.6
                  ? "bg-red-200 text-red-800"
                  : attempt.suspiciousScore >= 0.3
                    ? "bg-orange-200 text-orange-800"
                    : "bg-stone-200 text-stone-700"
              }`}>
                Şüphe skoru {(attempt.suspiciousScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-sm text-amber-900">
            {attempt.tabSwitchCount > 0 && (
              <div>
                <span className="font-semibold">{attempt.tabSwitchCount}</span> sekme/odak ihlali
              </div>
            )}
            {integrityFlags?.avgAnswerIntervalMs != null && (
              <div>
                Ort. cevap aralığı:{" "}
                <span className="font-semibold">
                  {Math.round(integrityFlags.avgAnswerIntervalMs / 1000)}s
                </span>
              </div>
            )}
            {integrityFlags?.minAnswerIntervalMs != null && (
              <div>
                Min. cevap aralığı:{" "}
                <span className="font-semibold">
                  {(integrityFlags.minAnswerIntervalMs / 1000).toFixed(1)}s
                </span>
              </div>
            )}
            {integrityFlags?.suspiciouslyFastAnswers != null && (
              <div>
                Çok hızlı cevap (3sn altı):{" "}
                <span className="font-semibold">{integrityFlags.suspiciouslyFastAnswers}</span>
              </div>
            )}
            {integrityFlags?.burstAnswerGroups != null && integrityFlags.burstAnswerGroups > 0 && (
              <div>
                Hızlı seri grup sayısı:{" "}
                <span className="font-semibold">{integrityFlags.burstAnswerGroups}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-question detail */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-stone-700">Soru Bazlı Cevaplar</h2>
        {rowsBySection.map(({ section, rows }) => {
          const correctCnt = rows.filter((r) => r.state === "correct").length;
          const wrongCnt = rows.filter((r) => r.state === "wrong").length;
          const blankCnt = rows.filter((r) => r.state === "blank" || r.state === "no-key").length;
          return (
            <div key={section.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
              <div className="border-b border-stone-100 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-stone-900">{section.title}</h3>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-600 font-semibold">{correctCnt} D</span>
                  <span className="text-red-500 font-semibold">{wrongCnt} Y</span>
                  <span className="text-stone-400">{blankCnt} B</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50 text-xs text-stone-500">
                      <th className="px-3 py-2 text-center font-medium w-12">#</th>
                      <th className="px-3 py-2 text-center font-medium w-20">Cevap</th>
                      <th className="px-3 py-2 text-center font-medium w-20">Doğru</th>
                      <th className="px-3 py-2 text-center font-medium w-24">Durum</th>
                      <th className="px-3 py-2 text-left font-medium">Konu</th>
                      <th className="px-3 py-2 text-left font-medium">Kazanım</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {rows.map((r) => {
                      const stateUI =
                        r.state === "correct"
                          ? { Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Doğru" }
                          : r.state === "wrong"
                          ? { Icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Yanlış" }
                          : r.state === "blank"
                          ? { Icon: Circle, color: "text-stone-400", bg: "bg-stone-50", label: "Boş" }
                          : { Icon: Circle, color: "text-stone-300", bg: "bg-white", label: "—" };
                      return (
                        <tr key={r.questionNumber} className={`hover:bg-stone-50 transition ${stateUI.bg}`}>
                          <td className="px-3 py-2 text-center font-mono text-xs text-stone-500">
                            {r.questionNumber}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded font-bold text-xs ${
                                r.state === "wrong"
                                  ? "bg-red-100 text-red-700"
                                  : r.state === "correct"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-stone-100 text-stone-400"
                              }`}
                            >
                              {r.selected ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-100 font-bold text-xs text-emerald-700">
                              {r.correct ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${stateUI.color}`}>
                              <stateUI.Icon className="h-3.5 w-3.5" /> {stateUI.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-stone-700 text-xs">
                            {r.outcome?.konu ?? <span className="text-stone-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-stone-600 text-xs">
                            {r.outcome?.kazanim ?? <span className="text-stone-300">—</span>}
                            {r.outcome?.altKazanim && (
                              <span className="block text-[11px] text-stone-400">
                                {r.outcome.altKazanim}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kazanım breakdown */}
      {kazanimBreakdown.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-700">Kazanım Özeti</h2>
          <div className="rounded-xl border border-stone-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-xs text-stone-500">
                  <th className="px-4 py-2.5 text-left font-medium">Konu</th>
                  <th className="px-4 py-2.5 text-left font-medium">Kazanım</th>
                  <th className="px-3 py-2.5 text-center font-medium text-emerald-600">D</th>
                  <th className="px-3 py-2.5 text-center font-medium text-red-500">Y</th>
                  <th className="px-3 py-2.5 text-center font-medium text-stone-400">B</th>
                  <th className="px-3 py-2.5 text-right font-medium">Oran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {kazanimBreakdown.map((k, i) => {
                  const total = k.correct + k.wrong + k.blank;
                  const pct = total > 0 ? Math.round((k.correct / total) * 100) : 0;
                  const pctColor = pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-500";
                  return (
                    <tr key={i} className="hover:bg-stone-50 transition">
                      <td className="px-4 py-2.5 font-medium text-stone-800 whitespace-nowrap">{k.konu}</td>
                      <td className="px-4 py-2.5 text-stone-600">{k.kazanim}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-emerald-600">{k.correct}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-red-500">{k.wrong}</td>
                      <td className="px-3 py-2.5 text-center text-stone-400">{k.blank}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${pctColor}`}>{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-500 flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Başlangıç:{" "}
          {new Date(attempt.startedAt).toLocaleString("tr-TR")}
        </span>
        {attempt.submittedAt && (
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Gönderim:{" "}
            {new Date(attempt.submittedAt).toLocaleString("tr-TR")}
          </span>
        )}
        <span>Süre: {formatDuration(attempt.durationSeconds ?? null)}</span>
      </div>
    </div>
  );
}
