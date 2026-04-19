import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, LifeBuoy, LockKeyhole, RefreshCcw } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function SifremiUnuttumPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect(getPanelDestination(session.user));

  return (
    <main className="min-h-screen bg-[#f6f3ec] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl gap-8 rounded-[28px] border border-[#e7e0d3] bg-[#f7f4ee] p-6 sm:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
        <section className="flex flex-col justify-between rounded-[24px] bg-[#f7f4ee] px-2 py-2 sm:px-4">
          <div>
            <div className="inline-flex items-center gap-3">
              <Image src="/logo.png" alt="Online Dershanem" width={42} height={42} className="h-9 w-9 object-contain" priority />
              <Image src="/onlinedershanem_.png" alt="Online Dershanem" width={360} height={58} className="h-8 w-auto object-contain" priority />
            </div>

            <h1 className="mt-10 max-w-md font-serif text-5xl leading-[0.94] tracking-[-0.05em] text-[#201a17] sm:text-6xl">
              Erişimi yenile,
              <br />
              kaldığın yerden devam et.
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-7 text-[#5f554d]">
              Şifreni birkaç adımda güncelle. Kod doğrulamasıyla hesabına güvenli biçimde yeniden eriş.
            </p>

            <div className="mt-10 max-w-md rounded-[28px] border border-[#e2d9ca] bg-[#f8f5ef] p-6 shadow-[0_18px_40px_-30px_rgba(67,52,40,0.18)]">
              <h2 className="text-[28px] font-medium tracking-[-0.03em] text-[#201a17]">🔐 Erişimi yenile.</h2>
              <p className="mt-2 text-sm leading-7 text-[#6a6058]">E-postanı doğrula, yeni şifreni belirle ve tekrar giriş yap.</p>

              <div className="mt-6">
                <ForgotPasswordForm />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 px-1 text-sm text-[#6a6058]">
            <p>
              Şifreni hatırladın mı?{" "}
              <Link href="/giris" className="font-semibold text-[#201a17]">
                Giriş Yap
              </Link>
            </p>
            <Link href="/" className="font-medium text-[#201a17]">
              Ana sayfa
            </Link>
          </div>
        </section>

        <section className="hidden rounded-[28px] border border-[#e4ddd0] bg-[#f1ece3] p-6 lg:block">
          <div className="relative h-full min-h-[720px] overflow-hidden rounded-[24px] bg-[#f5f1e8] p-6">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,43,33,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,43,33,0.035)_1px,transparent_1px)] bg-[size:34px_34px]" />

            <div className="relative h-full">
              <div className="absolute left-8 top-8 max-w-[300px] rounded-[22px] border border-[#ebe3d8] bg-[#faf7f2] px-5 py-4 shadow-[0_12px_40px_-30px_rgba(67,52,40,0.16)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg text-[#6e4d3c]">“</span>
                  <p className="text-[15px] leading-7 text-[#3f342d]">Şifremi hızlıca sıfırlayıp hesabıma güvenli şekilde yeniden girmek istiyorum.</p>
                </div>
              </div>

              <div className="absolute left-24 top-40 w-[300px] rounded-[26px] border border-[#ebe3d8] bg-[#faf7f2] p-8 shadow-[0_18px_50px_-34px_rgba(67,52,40,0.18)]">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#f1ebe1] text-[#b96641]">
                  <RefreshCcw className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-[28px] font-medium tracking-[-0.03em] text-[#201a17]">Temiz ve güvenli akış.</h3>
                <p className="mt-3 text-sm leading-7 text-[#6a6058]">
                  Kod doğrulama ve yeni şifre belirleme tek akışta çözülsün diye kurgulandı.
                </p>
              </div>

              <div className="absolute bottom-20 left-14 right-10 rounded-[28px] border border-[#d8e2e9] bg-[#d6e7f1] p-6 shadow-[0_18px_50px_-32px_rgba(67,52,40,0.16)]">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: KeyRound, title: "Kod ile doğrulama", text: "Erişim yalnızca e-posta onayıyla yenilenir." },
                    { icon: LockKeyhole, title: "Yeni şifre", text: "Şifreni güncelleyip doğrudan devam edersin." },
                    { icon: LifeBuoy, title: "Yön kaybı yok", text: "Adımlar net, ekran sade ve dikkat dağıtmıyor." },
                    { icon: RefreshCcw, title: "Hızlı dönüş", text: "Sıfırlama sonrası girişe hemen dönersin." }
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="rounded-[20px] border border-white/40 bg-[#f7f4ef]/85 p-5">
                      <Icon className="h-4 w-4 text-[#204052]" />
                      <h4 className="mt-4 text-sm font-semibold text-[#203139]">{title}</h4>
                      <p className="mt-2 text-sm leading-6 text-[#415862]">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-8 right-8 max-w-[280px] rounded-[22px] border border-[#ebe3d8] bg-[#faf7f2] px-5 py-4 shadow-[0_12px_40px_-30px_rgba(67,52,40,0.16)]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg text-[#6e4d3c]">“</span>
                  <p className="text-[15px] leading-7 text-[#3f342d]">Hesabıma yeniden girerken süreç hızlı olsun ama güven duygusu da korunsun.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
