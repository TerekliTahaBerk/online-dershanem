import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, MailCheck, NotebookTabs, Sparkles } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";
import { RegisterForm } from "@/components/auth/register-form";

export default async function KayitPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect(getPanelDestination(session.user));

  return (
    <main className="min-h-screen bg-[#f4f2ee] px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl gap-6 rounded-[24px] border border-[#e4e2de] bg-[#f4f2ee] p-4 sm:gap-8 sm:rounded-[28px] sm:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
        <section className="flex flex-col justify-between rounded-[20px] bg-[#f4f2ee] px-1 py-1 sm:rounded-[24px] sm:px-4">
          <div>
            <div className="inline-flex items-center">
              <Image src="/onlinedershanem_.png" alt="Online Dershanem" width={360} height={58} className="h-9 w-auto object-contain" priority />
            </div>

            <h1 className="mt-8 max-w-md font-serif text-4xl leading-[0.94] tracking-[-0.05em] text-[#201a17] sm:mt-10 sm:text-5xl lg:text-6xl">
              Düzeni kur,
              <br />
              hesabını aç.
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-7 text-[#5f554d]">
              Dersler, paketler, öğretmen notları ve süreç takibi için giriş noktanı birkaç adımda tamamla.
            </p>

            <div className="mt-8 max-w-md rounded-[24px] border border-[#e4e2de] bg-white p-5 shadow-[0_18px_40px_-30px_rgba(67,52,40,0.10)] sm:mt-10 sm:rounded-[28px] sm:p-6">
              <h2 className="text-[28px] font-medium tracking-[-0.03em] text-[#201a17]">✨ Başlayalım.</h2>
              <p className="mt-2 text-sm leading-7 text-[#6a6058]">Bilgilerini gir, kodu doğrula ve hesabını tamamla.</p>

              <div className="mt-6">
                <RegisterForm />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 px-1 text-sm text-[#6a6058]">
            <p>
              Zaten hesabın var mı?{" "}
              <Link href="/giris" className="font-semibold text-[#201a17]">
                Giriş Yap
              </Link>
            </p>
            <Link href="/" className="font-medium text-[#201a17]">
              Ana sayfa
            </Link>
          </div>
        </section>

        <section className="hidden rounded-[28px] border border-[#e4e2de] bg-[#eceae7] p-6 lg:block">
          <div className="relative h-full min-h-[720px] overflow-hidden rounded-[24px] bg-[#f3f2ef] p-6">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,43,33,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,43,33,0.035)_1px,transparent_1px)] bg-[size:34px_34px]" />

            <div className="relative h-full">
              <div className="absolute left-8 top-8 max-w-[300px] rounded-[22px] border border-[#e6e4df] bg-[#fefdfb] px-5 py-4 shadow-[0_12px_40px_-30px_rgba(67,52,40,0.12)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg text-[#6e4d3c]">“</span>
                  <p className="text-[15px] leading-7 text-[#3f342d]">Kayıt sürecinin hızlı olmasını, sonrasında her şeye tek yerden ulaşmayı istiyorum.</p>
                </div>
              </div>

              <div className="absolute left-24 top-40 w-[300px] rounded-[26px] border border-[#e6e4df] bg-[#fefdfb] p-8 shadow-[0_18px_50px_-34px_rgba(67,52,40,0.14)]">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#e8e6e2] text-[#b96641]">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-[28px] font-medium tracking-[-0.03em] text-[#201a17]">Sade başla, net ilerle.</h3>
                <p className="mt-3 text-sm leading-7 text-[#6a6058]">
                  Kayıt, doğrulama ve panel erişimi tek akışta çözülür. Gereksiz adım yok.
                </p>
              </div>

              <div className="absolute bottom-20 left-14 right-10 rounded-[28px] border border-[#2e2d2a] bg-[#1c1b18] p-6 shadow-[0_18px_50px_-32px_rgba(0,0,0,0.28)]">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: MailCheck, title: "Kod doğrulama", text: "E-posta onayı ile hesap tamamlanır." },
                    { icon: BookOpenCheck, title: "Paket erişimi", text: "Kayıttan sonra tüm içerik akışı hazır olur." },
                    { icon: NotebookTabs, title: "Tek görünüm", text: "Ders, program ve duyurular aynı yerde toplanır." },
                    { icon: Sparkles, title: "Hızlı başlangıç", text: "Bekletmeyen sade bir kayıt deneyimi." }
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="rounded-[20px] border border-white/10 bg-[#2d2c29]/85 p-5">
                      <Icon className="h-4 w-4 text-[#a8a5a0]" />
                      <h4 className="mt-4 text-sm font-semibold text-[#e6e3de]">{title}</h4>
                      <p className="mt-2 text-sm leading-6 text-[#c0bdb8]">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-8 right-8 max-w-[280px] rounded-[22px] border border-[#e6e4df] bg-[#fefdfb] px-5 py-4 shadow-[0_12px_40px_-30px_rgba(67,52,40,0.12)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg text-[#6e4d3c]">“</span>
                  <p className="text-[15px] leading-7 text-[#3f342d]">Hesabım açıldıktan sonra ders düzenimi ve panelimi doğrudan görmek istiyorum.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
