import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Medal } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getLeaderboard(examId: string, userId: string) {
  const exam = await prisma.odkExam.findFirst({
    where: { id: examId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      cadenceFamily: true,
      resultsReleasedAt: true,
    },
  });

  if (!exam) return null;

  // Only show if results released
  const released = exam.resultsReleasedAt && new Date(exam.resultsReleasedAt) <= new Date();
  if (!released) return { exam, released: false, rows: [], myRank: null };

  const attempts = await prisma.odkExamAttempt.findMany({
    where: { examId, status: "SUBMITTED" },
    select: {
      userId: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      durationSeconds: true,
      user: { select: { name: true } },
    },
    orderBy: [{ score: "desc" }, { durationSeconds: "asc" }],
  });

  const rows = attempts.map((a, idx) => ({
    rank: idx + 1,
    userId: a.userId,
    name: a.user.name ?? "Öğrenci",
    score: Number(a.score ?? 0),
    correct: a.correctCount,
    wrong: a.wrongCount,
    blank: a.blankCount,
    duration: a.durationSeconds,
    isMe: a.userId === userId,
  }));

  const myRank = rows.find((r) => r.isMe)?.rank ?? null;

  return { exam, released: true, rows, myRank };
}

export default async function SiralamaPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const session = await getServerAuthSession();
  const data = await getLeaderboard(examId, session!.user.id);

  if (!data) notFound();

  if (!data.released) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <Trophy className="h-10 w-10 text-stone-300 mb-3" />
        <p className="text-sm font-medium text-stone-500">Sıralama henüz yayınlanmadı</p>
        <p className="text-xs text-stone-400 mt-1">Sonuçlar açıklandığında sıralama burada görünecek.</p>
        <Link href={`/odk/panel/sinavlar/${examId}`} className="mt-4 text-xs text-emerald-600 hover:underline">
          ← Sınava dön
        </Link>
      </div>
    );
  }

  const { rows, myRank, exam } = data;
  const medalColors: Record<number, string> = {
    1: "text-yellow-500",
    2: "text-stone-400",
    3: "text-amber-600",
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/odk/panel/sinavlar/${examId}`}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Sonuçlara dön
        </Link>
        <h1 className="text-xl font-semibold text-stone-900">{exam.title}</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Sıralama · {rows.length} katılımcı
          {myRank && <> · Sıran: <strong className="text-emerald-700">#{myRank}</strong></>}
        </p>
      </div>

      {myRank && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
            #{myRank}
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Senin Sıran</p>
            <p className="text-xs text-emerald-700">{rows.length} katılımcı arasında {myRank}. sıradasın</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-emerald-700">
              {rows.find((r) => r.isMe)?.score.toFixed(2)} net
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-stone-900">Genel Sıralama</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-xs text-stone-500">
                <th className="px-4 py-2.5 text-left font-medium w-12">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Öğrenci</th>
                <th className="px-4 py-2.5 text-right font-medium">Net</th>
                <th className="px-4 py-2.5 text-right font-medium">D</th>
                <th className="px-4 py-2.5 text-right font-medium">Y</th>
                <th className="px-4 py-2.5 text-right font-medium">B</th>
                <th className="px-4 py-2.5 text-right font-medium">Süre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr
                  key={row.userId}
                  className={`transition ${row.isMe ? "bg-emerald-50 font-semibold" : "hover:bg-stone-50"}`}
                >
                  <td className="px-4 py-2.5 w-12">
                    {row.rank <= 3 ? (
                      <Medal className={`h-4 w-4 ${medalColors[row.rank]}`} />
                    ) : (
                      <span className="text-stone-400 text-xs font-mono">{row.rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={row.isMe ? "text-emerald-800" : "text-stone-800"}>
                      {row.isMe ? `${row.name} (Sen)` : row.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-stone-900">
                    {row.score.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-emerald-600">{row.correct}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{row.wrong}</td>
                  <td className="px-4 py-2.5 text-right text-stone-400">{row.blank}</td>
                  <td className="px-4 py-2.5 text-right text-stone-400 text-xs">
                    {row.duration ? `${Math.floor(row.duration / 60)}dk` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
