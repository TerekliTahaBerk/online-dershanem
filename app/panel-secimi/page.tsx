import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess, getPanelDestination, getPanelLabel, getPanelLink, type PanelKey } from "@/lib/panel-access";

type PanelChoicePageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

const panelCards: Array<{
  panel: PanelKey;
  icon: typeof ShieldCheck;
  eyebrow: string;
  description: string;
}> = [
  {
    panel: "admin",
    icon: ShieldCheck,
    eyebrow: "Yönetim alanı",
    description: "Öğrenci, ödeme ve operasyon akışlarını yönet."
  },
  {
    panel: "teacher",
    icon: GraduationCap,
    eyebrow: "Ders alanı",
    description: "Takvimini, derslerini ve öğrenci notlarını aç."
  }
];

export default async function PanelChoicePage({ searchParams }: PanelChoicePageProps) {
  const session = await getServerAuthSession();
  const params = await searchParams;

  if (!session?.user) {
    redirect(`/giris${params?.callbackUrl ? `?callbackUrl=${encodeURIComponent(params.callbackUrl)}` : ""}`);
  }

  const access = getPanelAccess(session.user);

  if (!access.requiresPanelChoice) {
    redirect(getPanelDestination(session.user, params?.callbackUrl));
  }

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center">
        <div className="rounded-[28px] border border-stone-200 bg-white shadow-xl">
          <div className="border-b border-stone-200 bg-[var(--pd-ink)] px-8 py-8 text-white sm:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Giriş sonrası yönlendirme
                </p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                  Hangi panelle devam edeceğini seç.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">
                  Bu hesap hem öğretmen hem de admin yetkisine sahip. Bu oturumda açmak istediğin alanı seçerek devam et.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white sm:flex">
                  {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{session.user.name ?? session.user.email}</p>
                  <p className="text-xs text-stone-400">Çift panel erişimi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-8 sm:px-10 sm:py-10">
            <div className="grid gap-4 lg:grid-cols-2">
              {panelCards.map(({ panel, icon: Icon, eyebrow, description }) => (
                <Link
                  key={panel}
                  href={getPanelLink(panel, params?.callbackUrl)}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-stone-50 p-6 transition hover:border-emerald-300 hover:bg-white hover:shadow-lg"
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {eyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-stone-900">{getPanelLabel(panel)}</h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">{description}</p>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-5 text-sm font-semibold text-stone-900">
                    <span>Devam et</span>
                    <BookOpen className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
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
