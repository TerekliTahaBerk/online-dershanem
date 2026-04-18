import Link from "next/link";
import { FileText, BarChart2, CheckCircle2, Clock } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PanelAttempt = {
  id: string;
  status: string;
  startedAt: Date;
  score: unknown;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  exam: { title: string; cadenceFamily: string };
};

async function getStudentData(userId: string) {
  const now = new Date();

  const [accessTags, rawAttempts, availableExams] = await Promise.all([
    prisma.odkUserAccessTag.findMany({
      where: {
        userId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { accessTagId: true },
    }),

    prisma.odkExamAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        startedAt: true,
        score: true,
        correctCount: true,
        wrongCount: true,
        blankCount: true,
        exam: { select: { title: true, cadenceFamily: true } },
      },
    }),

    prisma.odkExam.count({ where: { status: "PUBLISHED" } }),
  ]);

  const recentAttempts = rawAttempts as unknown as PanelAttempt[];
  const completedCount = recentAttempts.filter((a) => a.status === "SUBMITTED").length;

  return { accessTags: accessTags.length, recentAttempts, availableExams, completedCount };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  IN_PROGRESS: { label: "Devam ediyor", className: "bg-amber-50 text-amber-700 border border-amber-100" },
  SUBMITTED:   { label: "Tamamlandı",   className: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  ABANDONED:   { label: "Terk edildi",  className: "bg-stone-100 text-stone-500 border border-stone-200" },
};

export default async function OdkPanelPage() {
  const session = await getServerAuthSession();
  const userId = session!.user.id;
  const { accessTags, recentAttempts, availableExams, completedCount } = await getStudentData(userId);

  const firstName = session!.user.name?.split(" ")[0] ?? "Öğrenci";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-lg md:text-xl font-semibold text-stone-900">{greeting}, {firstName}!</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Erişim Paketi", value: accessTags, icon: CheckCircle2, href: "/odk/panel/sinavlar" },
          { label: "Mevcut Sınav", value: availableExams, icon: FileText, href: "/odk/panel/sinavlar" },
          { label: "Tamamlanan", value: completedCount, icon: BarChart2, href: "/odk/panel/sonuclar" },
          { label: "Son Girişim", value: recentAttempts.length, icon: Clock, href: "/odk/panel/sonuclar" },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-stone-200 bg-white p-5 hover:border-emerald-200 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-stone-500">{label}</p>
                <p className="mt-1.5 text-3xl font-bold text-stone-900">{value}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent attempts */}
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-stone-900">Son Deneme Girişimleri</h2>
          <Link href="/odk/panel/sinavlar" className="text-xs text-emerald-600 hover:text-emerald-700">
            Sınavlara git →
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-stone-400">Henüz deneme çözmedin.</p>
            <Link
              href="/odk/panel/sinavlar"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Sınavlara Göz At
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentAttempts.map((attempt) => {
              const badge = statusConfig[attempt.status] ?? statusConfig.ABANDONED;
              return (
                <div key={attempt.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{attempt.exam.title}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(attempt.startedAt).toLocaleDateString("tr-TR")}
                      {attempt.status === "SUBMITTED" && ` · D:${attempt.correctCount} Y:${attempt.wrongCount} B:${attempt.blankCount}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {attempt.score != null && (
                      <span className="text-sm font-bold text-stone-700">{Number(attempt.score).toFixed(2)}</span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
