import Link from "next/link";
import { FileText, Package, Users, Tag, TrendingUp, Plus, Calendar, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { calcDaysLeft } from "@/lib/admin";

type RecentAttempt = {
  id: string;
  status: string;
  startedAt: Date;
  score: unknown;
  exam: { title: string; cadenceFamily: string };
  user: { name: string | null; email: string };
};

type UpcomingExam = {
  id: string;
  title: string;
  cadenceFamily: string;
  startsAt: Date;
  endsAt: Date | null;
};

async function getStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 86_400_000);

  const [totalExams, publishedExams, totalPackages, activePackages, activeStudents, attemptsLast30d, activeEntitlements, rawAttempts, rawUpcoming, expiringEntitlements] =
    await Promise.all([
      prisma.odkExam.count(),
      prisma.odkExam.count({ where: { status: "PUBLISHED" } }),
      prisma.odkPackage.count(),
      prisma.odkPackage.count({ where: { isActive: true } }),
      prisma.odkUserAccessTag.count({
        where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      }),
      prisma.odkExamAttempt.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
      prisma.odkEntitlement.count({
        where: { revokedAt: null, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      }),
      prisma.odkExamAttempt.findMany({
        take: 8,
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          startedAt: true,
          score: true,
          exam: { select: { title: true, cadenceFamily: true } },
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.odkExam.findMany({
        where: { status: "PUBLISHED", startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: { id: true, title: true, cadenceFamily: true, startsAt: true, endsAt: true },
      }),
      prisma.odkEntitlement.findMany({
        where: {
          revokedAt: null,
          status: "ACTIVE",
          expiresAt: { gte: now, lte: sevenDaysLater },
        },
        select: {
          id: true,
          expiresAt: true,
          user: { select: { id: true, name: true, email: true } },
          package: { select: { title: true } },
        },
        orderBy: { expiresAt: "asc" },
        take: 6,
      }),
    ]);

  const recentAttempts = rawAttempts as unknown as RecentAttempt[];
  const upcomingExams = rawUpcoming as unknown as UpcomingExam[];
  return { totalExams, publishedExams, totalPackages, activePackages, activeStudents, attemptsLast30d, activeEntitlements, recentAttempts, upcomingExams, expiringEntitlements };
}

const statusLabels: Record<string, { label: string; className: string }> = {
  IN_PROGRESS: { label: "Devam ediyor", className: "bg-amber-50 text-amber-700 border border-amber-100" },
  SUBMITTED:   { label: "Tamamlandı",   className: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  ABANDONED:   { label: "Terk edildi",  className: "bg-stone-100 text-stone-500 border border-stone-200" },
};

export default async function OdkAdminDashboard() {
  const { totalExams, publishedExams, totalPackages, activePackages, activeStudents, attemptsLast30d, activeEntitlements, recentAttempts, upcomingExams, expiringEntitlements } =
    await getStats();
  const now = new Date();

  const stats = [
    { label: "Toplam Sınav", value: totalExams, sub: `${publishedExams} yayında`, icon: FileText, href: "/odk/admin/sinavlar" },
    { label: "Paketler", value: totalPackages, sub: `${activePackages} aktif`, icon: Package, href: "/odk/admin/paketler" },
    { label: "Aktif Entitlement", value: activeEntitlements, sub: "paket erişimi", icon: Users, href: "/odk/admin/ogrenciler" },
    { label: "Son 30 Gün Çözüm", value: attemptsLast30d, sub: "deneme girişimi", icon: TrendingUp, href: "/odk/admin/sinavlar" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Genel Bakış</h1>
          <p className="text-sm text-stone-500 mt-0.5">Online Deneme Kulübü yönetim paneli</p>
        </div>
        <Link
          href="/odk/admin/sinavlar/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" />
          Yeni Sınav
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-stone-200 bg-white p-5 hover:border-emerald-200 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-stone-500">{label}</p>
                <p className="mt-1.5 text-3xl font-bold text-stone-900">{value}</p>
                <p className="mt-1 text-xs text-stone-400">{sub}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Expiring entitlements warning */}
      {expiringEntitlements.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-amber-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Yakında Dolacak Paket Erişimleri
              <span className="rounded-full bg-amber-600 text-white text-xs font-bold px-2 py-0.5">
                {expiringEntitlements.length}
              </span>
            </h2>
            <Link href="/odk/admin/ogrenciler" className="text-xs text-amber-700 hover:text-amber-900">
              Yönet →
            </Link>
          </div>
          <div className="divide-y divide-amber-100">
            {expiringEntitlements.map((ent) => {
              const dLeft = ent.expiresAt ? calcDaysLeft(ent.expiresAt, now) : null;
              return (
                <div key={ent.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {ent.user.name ?? ent.user.email}
                    </p>
                    <p className="text-xs text-stone-400 truncate">{ent.package.title}</p>
                  </div>
                  <div className="shrink-0 ml-4 text-right">
                    {dLeft !== null && (
                      <span className={`text-sm font-bold ${dLeft <= 2 ? "text-red-600" : "text-amber-700"}`}>
                        {dLeft === 0 ? "Bugün" : `${dLeft} gün`}
                      </span>
                    )}
                    {ent.expiresAt && (
                      <p className="text-xs text-stone-400">
                        {new Date(ent.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent attempts */}
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-stone-900">Son Deneme Girişimleri</h2>
          <Link href="/odk/admin/sinavlar" className="text-xs text-emerald-600 hover:text-emerald-700">
            Tümünü gör →
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-stone-400">Henüz deneme girişimi yok.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentAttempts.map((attempt) => {
              const badge = statusLabels[attempt.status] ?? statusLabels.ABANDONED;
              return (
                <div key={attempt.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{attempt.exam.title}</p>
                    <p className="text-xs text-stone-400">
                      {attempt.user.name ?? attempt.user.email} ·{" "}
                      {new Date(attempt.startedAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {attempt.score != null && (
                      <span className="text-sm font-semibold text-stone-700">{Number(attempt.score).toFixed(1)}</span>
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

      {/* Upcoming exams */}
      {upcomingExams.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" /> Yaklaşan Sınavlar
            </h2>
            <Link href="/odk/admin/sinavlar" className="text-xs text-emerald-600 hover:text-emerald-700">
              Tümünü gör →
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-900">{exam.title}</p>
                  <p className="text-xs text-stone-400">
                    {new Date(exam.startsAt).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                    {exam.cadenceFamily}
                  </span>
                  <Link
                    href={`/odk/admin/sinavlar/${exam.id}`}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-600 border border-stone-200 hover:border-emerald-300 hover:text-emerald-700 transition"
                  >
                    Düzenle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/odk/admin/sinavlar/yeni", label: "Sınav Oluştur", icon: FileText },
          { href: "/odk/admin/paketler", label: "Paket Yönet", icon: Package },
          { href: "/odk/admin/ogrenciler", label: "Öğrenci Erişimi", icon: Users },
          { href: "/odk/admin/etiketler", label: "Erişim Etiketleri", icon: Tag },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-medium text-stone-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition"
          >
            <Icon className="h-4 w-4 text-emerald-600" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
