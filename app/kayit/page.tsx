import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { registerAction } from "./actions";
import { BookOpen, CalendarDays, CreditCard, TrendingUp } from "lucide-react";

const errorMessages: Record<string, string> = {
  missing: "Lütfen tüm zorunlu alanları doldurun.",
  "password-short": "Şifre en az 6 karakter olmalıdır.",
  "password-mismatch": "Şifreler eşleşmiyor.",
  "email-taken": "Bu e-posta adresi zaten kullanılıyor.",
};

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function KayitPage({ searchParams }: Props) {
  const session = await getServerAuthSession();
  if (session?.user?.role === "STUDENT") redirect("/panel");
  if (session?.user?.role === "TEACHER") redirect("/ogretmen");
  if (session?.user?.role === "ADMIN") redirect("/admin");

  const params = await searchParams;
  const errorMsg = params?.error ? errorMessages[params.error] ?? "Bir hata oluştu." : null;

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
                Öğrenci hesabını<br />
                <span className="text-emerald-400">oluştur.</span>
              </h1>
              <p className="mt-4 text-stone-400 text-sm leading-relaxed max-w-xs">
                Hesabın açıldığında ders programını, öğretmen notlarını ve ödeme sürecini tek yerden takip edebilirsin.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: "Ders takvimi", desc: "Haftalık planın" },
                { icon: BookOpen, label: "Ders bağlantısı", desc: "Saatinde katıl" },
                { icon: CreditCard, label: "Ödemeler", desc: "İşlem geçmişin" },
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

          {/* Right — Register form */}
          <div className="bg-white p-8 sm:p-10 flex flex-col justify-center">
            <div className="mb-7">
              <h2 className="text-xl font-semibold text-stone-900">Öğrenci Hesabı Oluştur</h2>
              <p className="mt-1.5 text-sm text-stone-500">
                Panel erişiminizi başlatmak için bilgilerinizi girin.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-700">
                {errorMsg}
              </div>
            )}

            <form action={registerAction} className="space-y-4">
              <label className="block text-sm font-medium text-stone-700">
                Ad Soyad <span className="text-red-400">*</span>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  required
                  className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="Adınız ve soyadınız"
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Telefon <span className="text-red-400">*</span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  required
                  className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="05xx xxx xx xx"
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                E-posta <span className="text-red-400">*</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="ornek@email.com"
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Şifre <span className="text-red-400">*</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="En az 6 karakter girin"
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                Şifre Tekrar <span className="text-red-400">*</span>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  className="mt-1.5 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="Şifrenizi tekrar girin"
                />
              </label>

              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Hesabı Oluştur
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-500">
              Zaten hesabınız var mı?{" "}
              <Link href="/giris" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Giriş Yap
              </Link>
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
