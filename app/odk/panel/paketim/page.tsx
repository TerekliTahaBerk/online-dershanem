import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Package, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import Link from "next/link";

async function getMyPackages(userId: string) {
  const now = new Date();

  const userTags = await prisma.odkUserAccessTag.findMany({
    where: { userId },
    select: {
      id: true,
      source: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      accessTag: {
        select: {
          id: true,
          title: true,
          description: true,
          examTags: {
            select: {
              exam: {
                select: {
                  id: true,
                  title: true,
                  cadenceFamily: true,
                  durationMinutes: true,
                  status: true,
                  sections: { select: { questionCount: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const attemptMap = await prisma.odkExamAttempt.findMany({
    where: { userId },
    select: { examId: true, status: true, score: true },
  }).then((rows) => new Map(rows.map((r) => [r.examId, r])));

  return userTags.map((uat) => {
    const isActive = !uat.revokedAt && (!uat.expiresAt || uat.expiresAt > now);
    const daysLeft = uat.expiresAt && !uat.revokedAt
      ? Math.max(0, Math.ceil((uat.expiresAt.getTime() - now.getTime()) / 86400000))
      : null;
    return {
      ...uat,
      isActive,
      daysLeft,
      exams: uat.accessTag.examTags
        .map((et) => ({
          ...et.exam,
          totalQuestions: et.exam.sections.reduce((s, sec) => s + sec.questionCount, 0),
          myAttempt: attemptMap.get(et.exam.id) ?? null,
        }))
        .filter((e) => e.status === "PUBLISHED"),
    };
  });
}

const familyLabels: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", LGS: "LGS", KPSS: "KPSS", ALES: "ALES",
};

export default async function PaketimPage() {
  const session = await getServerAuthSession();
  const packages = await getMyPackages(session!.user.id);

  const active = packages.filter((p) => p.isActive);
  const inactive = packages.filter((p) => !p.isActive);

  if (packages.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-20 text-center">
          <Package className="h-8 w-8 text-stone-300 mb-3" />
          <p className="text-sm font-medium text-stone-500">Henüz aktif paketin yok</p>
          <p className="text-xs text-stone-400 mt-1">Paket satın aldığında sınavlara erişim otomatik açılacak.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Paketim</h1>
        <p className="text-sm text-stone-500 mt-0.5">Erişim etiketlerin ve sınavların</p>
      </div>

      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-700">Aktif Erişimler</h2>
          {active.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-500">Süresi Dolan / İptal Erişimler</h2>
          {inactive.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  );
}

type PkgItem = {
  id: string;
  isActive: boolean;
  daysLeft: number | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  source: string;
  createdAt: Date;
  accessTag: { title: string; description: string | null };
  exams: Array<{
    id: string;
    title: string;
    cadenceFamily: string;
    durationMinutes: number;
    totalQuestions: number;
    myAttempt: { status: string; score: unknown } | null;
  }>;
};

function PackageCard({ pkg }: { pkg: PkgItem }) {
  const completedCount = pkg.exams.filter((e) => e.myAttempt?.status === "SUBMITTED").length;

  return (
    <div className={`rounded-xl border ${pkg.isActive ? "border-emerald-200 bg-white" : "border-stone-200 bg-stone-50 opacity-70"} overflow-hidden`}>
      <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-stone-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {pkg.isActive
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              : <XCircle className="h-4 w-4 text-stone-400 shrink-0" />}
            <h3 className="font-semibold text-stone-900">{pkg.accessTag.title}</h3>
          </div>
          {pkg.accessTag.description && (
            <p className="text-xs text-stone-400 mt-0.5 ml-6">{pkg.accessTag.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {pkg.isActive && pkg.daysLeft !== null && (
            <span className={`flex items-center gap-1 text-xs font-medium ${pkg.daysLeft <= 7 ? "text-red-600" : "text-stone-500"}`}>
              <Clock className="h-3.5 w-3.5" />
              {pkg.daysLeft} gün kaldı
            </span>
          )}
          {pkg.isActive && pkg.expiresAt && (
            <p className="text-xs text-stone-400 mt-0.5">
              {new Date(pkg.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          {pkg.revokedAt && (
            <span className="text-xs text-red-500 font-medium">İptal edildi</span>
          )}
          {!pkg.expiresAt && !pkg.revokedAt && (
            <span className="text-xs text-emerald-600 font-medium">Süresiz</span>
          )}
        </div>
      </div>

      {pkg.exams.length > 0 ? (
        <div className="divide-y divide-stone-50">
          <div className="px-5 py-2.5 flex items-center justify-between text-xs text-stone-400">
            <span>{pkg.exams.length} sınav · {completedCount} tamamlandı</span>
            <span>{Math.round((completedCount / pkg.exams.length) * 100)}% ilerleme</span>
          </div>
          {pkg.exams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{exam.title}</p>
                  <p className="text-xs text-stone-400">
                    {familyLabels[exam.cadenceFamily] ?? exam.cadenceFamily} · {exam.durationMinutes} dk · {exam.totalQuestions} soru
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {exam.myAttempt?.status === "SUBMITTED" && exam.myAttempt.score != null && (
                  <span className="text-xs font-bold text-stone-600">
                    {Number(exam.myAttempt.score).toFixed(2)} net
                  </span>
                )}
                {pkg.isActive && (
                  <Link
                    href={`/odk/panel/sinavlar/${exam.id}`}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      exam.myAttempt?.status === "SUBMITTED"
                        ? "border-stone-200 text-stone-600 hover:bg-stone-50"
                        : exam.myAttempt?.status === "IN_PROGRESS"
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {exam.myAttempt?.status === "SUBMITTED"
                      ? "Sonuç"
                      : exam.myAttempt?.status === "IN_PROGRESS"
                      ? "Devam Et"
                      : "Başla"}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-4 text-xs text-stone-400">Bu etikete bağlı sınav yok.</p>
      )}
    </div>
  );
}
