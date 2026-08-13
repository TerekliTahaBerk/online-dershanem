import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { LoginForm } from "@/components/panel/login-form";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { getSession } from "@/lib/auth/session";
import { postAuthenticationPath } from "@/lib/auth/products";

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: "Öğrenci Girişi",
    description: "Online Dershanem öğrenci, veli ve öğretmen paneli girişi.",
    canonical: "/giris",
  }),
  robots: { index: false, follow: false },
};

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
    <main
      id="main-content"
      tabIndex={-1}
      className="site-scope grid min-h-dvh place-items-center px-6 py-10 text-center"
    >
      <div className="w-full max-w-[460px]">
        <Image
          src="/panel-yenileniyor-seffaf.png"
          alt="Bilgisayar başında çalışan Online Dershanem karakteri"
          width={1333}
          height={1180}
          priority
          sizes="(max-width: 520px) 88vw, 460px"
          className="mx-auto h-auto w-full"
        />
        <h1 className="sr-only">Panelimizi yeniliyoruz</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--site-body)]">
          Panelimizi yeniliyoruz, çok yakında buradayız. {" "}
          <Link href="/" className="font-semibold text-[var(--brand-olive)] underline underline-offset-4">
            Ana sayfaya dön
          </Link>
        </p>
      </div>
    </main>
  );
}
