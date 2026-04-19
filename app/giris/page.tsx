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
        <section className="rounded-[24px] border border-line bg-[#f5f7f6] p-8 sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Panel Girişi
          </div>

          <Image
            src="/onlinedershanem_.png"
            alt="Online Dershanem"
            width={520}
            height={84}
            className="mt-6 h-10 w-auto object-contain"
            priority
          />

          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
            Ritmini yeniden
            <br className="hidden sm:block" /> yakala.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
            Ders programın, öğretmen notların, ödeme detayların ve panel erişimlerin tek yerde. Hesabın ile giriş yapıp kaldığın
            yerden devam et.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { icon: CalendarDays, label: "Ders takvimi", desc: "Haftalık planın görünür" },
              { icon: BookOpen, label: "Canlı ders", desc: "Derse doğrudan geçiş" },
              { icon: CreditCard, label: "Ödemeler", desc: "Güncel detayların tek yerde" },
              { icon: TrendingUp, label: "İlerleme", desc: "Süreç ve tamamlanan dersler" }
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-[18px] border border-line bg-white p-4 shadow-soft">
                <Icon className="h-4 w-4 text-brand" />
                <p className="mt-3 text-sm font-semibold text-ink">{label}</p>
                <p className="mt-1 text-xs leading-6 text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-line bg-white p-8 shadow-soft sm:p-10 lg:p-12">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-[#f8faf9] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Giriş Yap
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-ink">Hesabınla devam et.</h2>
            <p className="mt-2 text-sm leading-7 text-muted">E-posta adresin ve şifren ile paneline giriş yapabilirsin.</p>
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
