import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Trophy } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess, getOdPanelDestination } from "@/lib/panel-access";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function ServisSecimiPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/giris");
  }

  const access = getPanelAccess(session.user);

  // Pure teacher or no access — redirect appropriately
  if (!access.hasAdminPanel && !access.hasStudentPanel) {
    if (access.hasTeacherPanel) redirect("/ogretmen");
    else redirect("/giris");
  }

  const odHref = getOdPanelDestination(session.user);
  const isAdmin = access.hasAdminPanel;

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center">
        <div className="rounded-[28px] border border-stone-200 bg-white shadow-xl">

          {/* Header */}
          <div className="border-b border-stone-200 bg-[#091413] px-8 py-8 text-white sm:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Hizmet seçimi
                </p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                  Hangi hizmetle devam edeceğini seç.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">
                  {isAdmin
                    ? "Yönetmek istediğin platformu seç."
                    : "Devam etmek istediğin platformu seç."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white sm:flex">
                  {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {session.user.name ?? session.user.email}
                  </p>
                  <p className="text-xs text-stone-400">
                    {isAdmin ? "Yönetici" : "Öğrenci"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="px-8 py-8 sm:px-10 sm:py-10">
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Online Dershanem */}
              <Link
                href={odHref}
                className="group flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-stone-50 p-6 transition hover:border-emerald-300 hover:bg-white hover:shadow-lg"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Birebir ders platformu
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-900">Online Dershanem</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
                    {isAdmin
                      ? "Öğrenci kayıtları, ders takibi ve operasyon yönetimi."
                      : "Ders takvimine, öğretmenlerine ve ödeme detaylarına ulaş."}
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-5 text-sm font-semibold text-stone-900">
                  <span>Devam et</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>

              {/* Online Deneme Kulübü */}
              {isAdmin ? (
                <Link
                  href="/odk/admin"
                  className="group flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-stone-50 p-6 transition hover:border-emerald-300 hover:bg-white hover:shadow-lg"
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Deneme sınavı platformu
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-stone-900">Online Deneme Kulübü</h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
                      Deneme sınavlarını yönet, sonuçları analiz et, öğrenci performansını takip et.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-5 text-sm font-semibold text-stone-900">
                    <span>Devam et</span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ) : (
                <div className="flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-stone-50 p-6">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Yakında
                      </span>
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                      Deneme sınavı platformu
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-stone-400">Online Deneme Kulübü</h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-stone-400">
                      Deneme sınavları ve performans takibi çok yakında hizmetinde olacak.
                    </p>
                  </div>
                  <div className="mt-8 border-t border-stone-200 pt-5 text-sm font-medium text-stone-400">
                    Çok yakında
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-500">
                Yanlış hesapla giriş yaptıysan çıkış yapıp farklı bir hesapla devam edebilirsin.
              </p>
              <LogoutButton />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
