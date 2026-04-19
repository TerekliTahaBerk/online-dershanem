import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, CreditCard, TrendingUp } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    registered?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerAuthSession();
  const params = await searchParams;

  if (session?.user) {
    redirect(getPanelDestination(session.user, params?.callbackUrl));
  }

  const justRegistered = params?.registered === "1";

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[24px] border border-[#1f2f2b] bg-[#0b1211] p-8 text-white shadow-soft sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
            Online Dershanem
          </div>

          <div className="mt-6 inline-flex rounded-[16px] border border-white/10 bg-white px-4 py-3 shadow-soft">
            <Image
              src="/onlinedershanem_.png"
              alt="Online Dershanem"
              width={520}
              height={84}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            Düzenin bozulmasın.
            <br className="hidden sm:block" /> Akışın sende kalsın.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
            Takvim, dersler, ödemeler ve sürecin tek ekranda. Kaldığın yerden temiz, hızlı ve net biçimde devam et.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { icon: CalendarDays, label: "Takvim", desc: "Haftalık akış görünür" },
              { icon: BookOpen, label: "Dersler", desc: "Tüm içerik tek yerde" },
              { icon: CreditCard, label: "Ödemeler", desc: "Güncel detaylar hazır" },
              { icon: TrendingUp, label: "İlerleme", desc: "Süreç net biçimde izlenir" }
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-[18px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <Icon className="h-4 w-4 text-emerald-300" />
                <p className="mt-3 text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-xs leading-6 text-white/55">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-line bg-white p-8 shadow-soft sm:p-10 lg:p-12">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-[#f8faf9] px-3 py-1.5 text-xs font-semibold tracking-[0.01em] text-ink">
              <span>👋</span>
              <span>Hoş geldin</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-ink">Devam etmeye hazırsın.</h2>
            <p className="mt-2 text-sm leading-7 text-muted">Hesabınla giriş yap ve akışına kaldığın yerden dön.</p>
          </div>

          {justRegistered ? (
            <div className="mb-5 rounded-[16px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Hesabın açıldı. Şimdi giriş yapabilirsin.
            </div>
          ) : null}

          <LoginForm callbackUrl={params?.callbackUrl} />

          <p className="mt-5 text-center text-sm">
            <Link href="/sifremi-unuttum" className="text-stone-500 hover:text-emerald-700">
              Şifremi unuttum
            </Link>
          </p>

          <p className="mt-5 text-center text-sm text-stone-500">
            Henüz hesabın yok mu?{" "}
            <Link href="/kayit" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Kayıt Ol
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
