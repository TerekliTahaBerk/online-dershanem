import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";
import { RegisterForm } from "@/components/auth/register-form";
import { BookOpen, CalendarDays, CreditCard, TrendingUp } from "lucide-react";

export default async function KayitPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect(getPanelDestination(session.user));

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
                Online Dershanem&apos;e<br />
                <span className="text-emerald-400">katıl.</span>
              </h1>
              <p className="mt-4 text-stone-400 text-sm leading-relaxed max-w-xs">
                Ders programın, öğretmenlerin ve tüm sürecin tek yerde olsun.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: "Ders takvimi", desc: "Haftalık programın" },
                { icon: BookOpen, label: "Canlı ders", desc: "Anında katıl" },
                { icon: CreditCard, label: "Ödemeler", desc: "Tüm detaylar" },
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
            <RegisterForm />

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
