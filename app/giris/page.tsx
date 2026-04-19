import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, FileText, LineChart, Sparkles } from "lucide-react";
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
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl gap-8 rounded-[28px] bg-[#fbfaf7] p-6 sm:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
        <section className="flex flex-col justify-between rounded-[24px] bg-[#fbfaf7] px-2 py-2 sm:px-4">
          <div>
            <div className="inline-flex items-center gap-3">
              <Image src="/logo.png" alt="Online Dershanem" width={42} height={42} className="h-9 w-9 object-contain" priority />
              <Image src="/onlinedershanem_.png" alt="Online Dershanem" width={360} height={58} className="h-8 w-auto object-contain" priority />
            </div>

            <h1 className="mt-10 max-w-md font-serif text-5xl leading-[0.94] tracking-[-0.05em] text-[#201a17] sm:text-6xl">
              Çalışma akışına
              <br />
              yeniden dön.
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-7 text-[#5f554d]">
              Derslerin, notların, takvimin ve tüm öğrenci akışın tek yerde. Sakin, hızlı ve net bir giriş deneyimiyle devam et.
            </p>

            <div className="mt-10 max-w-md rounded-[28px] border border-[#ded4c6] bg-[#fbf8f2] p-6 shadow-[0_18px_40px_-28px_rgba(80,61,45,0.35)]">
              <h2 className="text-[28px] font-medium tracking-[-0.03em] text-[#201a17]">👋🏻 Hoş geldin.</h2>
              <p className="mt-2 text-sm leading-7 text-[#6a6058]">Hesabınla devam et.</p>

              {justRegistered ? (
                <div className="mt-5 rounded-[16px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  Hesabın açıldı. Şimdi giriş yapabilirsin.
                </div>
              ) : null}

              <div className="mt-6">
                <LoginForm callbackUrl={params?.callbackUrl} />
              </div>

              <p className="mt-5 text-center text-sm text-[#6a6058]">
                <Link href="/sifremi-unuttum" className="transition hover:text-[#201a17]">
                  Şifremi unuttum
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 px-1 text-sm text-[#6a6058]">
            <p>
              Henüz hesabın yok mu?{" "}
              <Link href="/kayit" className="font-semibold text-[#201a17]">
                Kayıt Ol
              </Link>
            </p>
            <Link href="/" className="font-medium text-[#201a17]">
              Ana sayfa
            </Link>
          </div>
        </section>

        <section className="hidden rounded-[28px] bg-[#f3f0ea] p-6 lg:block">
          <div className="relative h-full min-h-[720px] overflow-hidden rounded-[24px] bg-[#f7f4ee] p-6">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,43,33,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,43,33,0.035)_1px,transparent_1px)] bg-[size:34px_34px]" />

            <div className="relative h-full">
              <div className="absolute left-8 top-8 max-w-[280px] rounded-[22px] bg-white px-5 py-4 shadow-[0_12px_40px_-24px_rgba(80,61,45,0.45)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg text-[#6e4d3c]">“</span>
                  <p className="text-[15px] leading-7 text-[#3f342d]">Bu hafta hangi konulara dönmem gerektiğini tek bakışta görmek istiyorum.</p>
                </div>
              </div>

              <div className="absolute left-24 top-40 w-[300px] rounded-[26px] bg-white p-8 shadow-[0_18px_50px_-28px_rgba(80,61,45,0.45)]">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#f4efe8] text-[#c86d43]">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-[28px] font-medium tracking-[-0.03em] text-[#201a17]">Net, sade ve odaklı.</h3>
                <p className="mt-3 text-sm leading-7 text-[#6a6058]">
                  Günün akışı, yaklaşan dersler ve ihtiyaç duyduğun her şey tek görünümde.
                </p>
              </div>

              <div className="absolute bottom-20 left-14 right-10 rounded-[28px] bg-[#c7e2f3] p-6 shadow-[0_18px_50px_-28px_rgba(80,61,45,0.35)]">
                <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
                  <div className="rounded-[20px] bg-white/70 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#4b5a63]">
                      <LineChart className="h-4 w-4" />
                      Haftalık görünüm
                    </div>
                    <div className="mt-5 space-y-4">
                      {[
                        { label: "Matematik", value: 78, tone: "bg-[#d16641]" },
                        { label: "Paragraf", value: 54, tone: "bg-[#2d4a59]" },
                        { label: "Fen", value: 66, tone: "bg-[#4b7f6d]" }
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between text-sm text-[#203139]">
                            <span>{item.label}</span>
                            <span>%{item.value}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white/80">
                            <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-[#8fbfe3] p-5 text-[#153447]">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                      <CalendarDays className="h-4 w-4" />
                      Sıradaki akış
                    </div>
                    <div className="mt-5 space-y-3">
                      {[
                        "Yarın 19.00 Matematik dersi",
                        "Hafta sonu genel deneme",
                        "Eksik konu listesi güncellendi"
                      ].map((item) => (
                        <div key={item} className="rounded-[16px] bg-white/70 px-4 py-3 text-sm leading-6">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 right-8 max-w-[280px] rounded-[22px] bg-white px-5 py-4 shadow-[0_12px_40px_-24px_rgba(80,61,45,0.45)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg text-[#6e4d3c]">“</span>
                  <p className="text-[15px] leading-7 text-[#3f342d]">Takvimimi, derslerimi ve ilerlememi tek yerden takip etmek istiyorum.</p>
                </div>
              </div>

              <div className="absolute right-16 top-20 rounded-[20px] bg-white px-5 py-4 shadow-[0_12px_40px_-24px_rgba(80,61,45,0.45)]">
                <div className="flex items-center gap-2 text-sm font-medium text-[#3f342d]">
                  <FileText className="h-4 w-4 text-[#c86d43]" />
                  Tüm süreç tek görünümde
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
