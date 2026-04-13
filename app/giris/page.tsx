import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";
import { BookOpen, CalendarDays, CreditCard, TrendingUp } from "lucide-react";

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
    <main className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="grid gap-0 lg:grid-cols-[1fr_420px] rounded-2xl overflow-hidden shadow-xl border border-stone-200">

          {/* Left — Brand panel */}
          <div className="bg-[#091413] text-white p-10 sm:p-14 flex flex-col justify-between">
            <div>
              <div className="mb-12">
                <Image
                  src="/logo.png"
                  alt="Online Dershanem"
                  width={180}
                  height={42}
                  className="h-10 w-auto"
                  priority
                />
              </div>

              <h1 className="text-3xl sm:text-4xl font-semibold leading-tight text-white">
                Ritmini yeniden<br />
                <span className="text-emerald-400">yakala.</span>
              </h1>
              <p className="mt-4 text-stone-400 text-sm leading-relaxed max-w-xs">
                Ders programın, öğretmen notların ve ödeme detayların tek yerde.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: "Ders takvimi", desc: "Haftalık programın" },
                { icon: BookOpen, label: "Canlı ders", desc: "Anında katıl" },
                { icon: CreditCard, label: "Ödemeler", desc: "Güncel detaylar" },
                { icon: TrendingUp, label: "İlerleme", desc: "Tamamlanan dersler" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <Icon className="w-4 h-4 text-emerald-400 mb-2" />
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Login form */}
          <div className="bg-white p-8 sm:p-10 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-stone-900">Giriş Yap</h2>
              <p className="mt-1.5 text-sm text-stone-500">
                Hesabınızla devam edin.
              </p>
            </div>

            {justRegistered && (
              <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700">
                Hesabınız açıldı. Devam edebilirsiniz.
              </div>
            )}

            <LoginForm callbackUrl={params?.callbackUrl} />

            <p className="mt-4 text-center text-sm">
              <Link href="/sifremi-unuttum" className="text-stone-500 hover:text-emerald-700">
                Şifremi unuttum
              </Link>
            </p>

            <p className="mt-4 text-center text-sm text-stone-500">
              Henüz hesabınız yok mu?{" "}
              <Link href="/kayit" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Kayıt Ol
              </Link>
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
