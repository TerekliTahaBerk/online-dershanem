import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Headphones, Lock, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { LoginForm } from "@/components/panel/login-form";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { getSession } from "@/lib/auth/session";
import { postAuthenticationPath } from "@/lib/auth/products";
import { waHref } from "@/lib/site-content";

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: "Öğrenci Girişi",
    description: "Online Dershanem öğrenci, veli ve öğretmen paneli girişi.",
    canonical: "/giris",
  }),
  robots: { index: false, follow: false },
};

const supportBenefits = [
  { Icon: Headphones, label: "Ders ve program desteği" },
  { Icon: ShieldCheck, label: "Güvenli iletişim kanalları" },
  { Icon: CheckCircle2, label: "Paket ve ödeme kaydı desteği" },
];

/**
 * Panel girişi.
 *
 * Panel KAPALIYKEN çalışan bir form göstermek yerine durumu açıkça söyleyip
 * destek kanallarına yönlendiriyoruz — kullanıcıdan çalışmayan bir formda
 * parola istemek en kötüsü olurdu.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ "password-reset"?: string }> }) {
  if (!PANEL_ENABLED) return <RenewingNotice />;

  // Zaten girmiş kullanıcıyı giriş ekranında tutmanın anlamı yok.
  const session = await getSession();
  if (session) {
    redirect(await postAuthenticationPath(session));
  }

  const params = await searchParams;
  return <LoginScreen resetSuccess={params["password-reset"] === "success"} />;
}

function LoginScreen({ resetSuccess }: { resetSuccess: boolean }) {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="site-container flex justify-center py-16 sm:py-24">
          <div className="w-full max-w-[440px]">
            <p className="site-kicker">Panel girişi</p>
            <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.6rem)] leading-[1.1] text-[var(--site-ink)]">
              Tekrar hoş geldiniz.
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-[var(--site-body)]">
              Öğrenci, veli ve öğretmen paneli aynı kapıdan açılır — rolünüze göre doğru sayfaya yönlendirilirsiniz.
            </p>

            <div className="mt-8 rounded-[24px] border border-[var(--site-line)] bg-white p-6 sm:p-8">
              <LoginForm resetSuccess={resetSuccess} />
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[12px] text-[var(--site-muted)]">
              <Lock size={12} aria-hidden="true" />
              Hesap oluşturma yoktur; hesabınızı ekibimiz açar.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Panel kapalıyken gösterilen ekran — çalışan bir giriş formu yok. */
function RenewingNotice() {
  return (
    <div className="site-scope min-h-dvh">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative overflow-hidden border-b border-[var(--site-line)]"
      >
        <div aria-hidden="true" className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[#dce9d5]/70 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[var(--brand-orange-soft)]/70 blur-3xl" />

        <section className="site-container relative grid min-h-[calc(100dvh-70px)] items-center gap-10 py-14 lg:grid-cols-[.92fr_1.08fr] lg:gap-16 lg:py-16">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--site-line)] bg-white/85 px-4 py-2 text-[12px] font-bold uppercase tracking-[.08em] text-[var(--brand-olive)] shadow-sm backdrop-blur">
              <Sparkles size={15} aria-hidden="true" />
              Daha iyisi hazırlanıyor
            </div>

            <h1 className="mt-6 max-w-2xl font-display text-[clamp(2.7rem,6vw,5.25rem)] leading-[.98] tracking-[-.055em] text-[var(--site-ink)]">
              Panelimizi sizin için <span className="site-hl">yeniliyoruz.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-8 text-[var(--site-body)] sm:text-[17px]">
              Daha hızlı, daha sade ve daha kullanışlı bir deneyim için panel girişini kısa bir süreliğine kapattık. Çok yakında yepyeni haliyle buradayız.
            </p>

            <ul className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {supportBenefits.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-3 rounded-2xl border border-[var(--site-line)] bg-white/75 px-4 py-3 text-[13px] font-semibold leading-5 text-[var(--site-body)] backdrop-blur">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="site-btn site-btn-primary site-btn-lg">
                <MessageCircle size={18} aria-hidden="true" />
                WhatsApp’tan destek al
              </a>
              <Link href="/" className="site-btn site-btn-secondary site-btn-lg">
                Ana sayfaya dön
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-5 text-[12px] leading-5 text-[var(--site-muted)]">
              Güvenliğiniz için bu süreçte sizden parola veya tek kullanımlık kod istemiyoruz.
            </p>
          </div>

          <div className="order-1 mx-auto w-full max-w-[620px] lg:order-2">
            <div className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/65 p-3 shadow-[0_32px_90px_-48px_rgba(31,45,25,.48)] backdrop-blur sm:p-5">
              <div className="absolute left-7 top-7 z-10 inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/90 px-3.5 py-2 text-[11px] font-bold text-[var(--brand-olive)] shadow-sm backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                Geliştirme sürüyor
              </div>
              <Image
                src="/panel-yenileniyor.png"
                alt="Bilgisayar başında paneli geliştiren Online Dershanem karakteri"
                width={1334}
                height={1179}
                priority
                sizes="(max-width: 1024px) 92vw, 52vw"
                className="h-auto w-full rounded-[26px]"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
