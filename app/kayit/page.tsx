import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, CreditCard, TrendingUp } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";
import { RegisterForm } from "@/components/auth/register-form";

export default async function KayitPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect(getPanelDestination(session.user));

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[24px] border border-line bg-[#f5f7f6] p-8 sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Kayıt
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
            Hesabını oluştur,
            <br className="hidden sm:block" /> paneline yerleş.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
            Öğrenci sürecini, ders programını, öğretmenlerini ve tüm panel erişimlerini tek hesapta topla. Kayıt e-posta
            doğrulaması ile tamamlanır.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { icon: CalendarDays, label: "Takvim", desc: "Programını tek yerden gör" },
              { icon: BookOpen, label: "Ders erişimi", desc: "Süreç ve içerikler aynı panelde" },
              { icon: CreditCard, label: "Ödeme takibi", desc: "Tüm detaylar görünür" },
              { icon: TrendingUp, label: "İlerleme", desc: "Düzenli takip alanı" }
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
          <RegisterForm />

          <p className="mt-6 text-center text-sm text-stone-500">
            Zaten hesabın var mı?{" "}
            <Link href="/giris" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Giriş Yap
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
