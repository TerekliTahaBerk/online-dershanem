import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { application } from "@/lib/application";
import { AuthBrandLogos, AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/panel/login-form";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { getSession } from "@/lib/auth/session";
import { postAuthenticationPath } from "@/lib/auth/products";

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: "Giriş",
    description: "onlinedershanem. öğrenci, veli ve öğretmen paneli girişi.",
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
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ "password-reset"?: string; kayit?: string }>;
}) {
  if (!PANEL_ENABLED) return <RenewingNotice />;

  // Zaten girmiş kullanıcıyı giriş ekranında tutmanın anlamı yok.
  const session = await getSession();
  if (session) {
    redirect(await postAuthenticationPath(session));
  }

  const params = await searchParams;
  return (
    <LoginScreen
      resetSuccess={params["password-reset"] === "success"}
      registered={params.kayit === "tamam"}
    />
  );
}

/** Onaylı tasarım (Web.dc.html → isLogin, "GİRİŞ"). */
function LoginScreen({
  resetSuccess,
  registered,
}: {
  resetSuccess: boolean;
  registered: boolean;
}) {
  return (
    <AuthCard title="Tekrar hoş geldin" googleLabel="Google ile giriş yap" showDenemeLigiLogo>
      <LoginForm resetSuccess={resetSuccess} registered={registered} />

      <p className="mt-5 text-center text-[13px] leading-relaxed text-dc-ink-muted">
        Henüz hesabın yok mu?{" "}
        <Link href={application.href} className="font-semibold text-dc-brand-strong underline underline-offset-4">
          Başvur
        </Link>
        <span className="mt-1 block">Başvurunun ardından hesabını ekibimiz açar.</span>
      </p>
    </AuthCard>
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
        <AuthBrandLogos showDenemeLigiLogo />
        <Image
          src="/panel-yenileniyor-seffaf.png"
          alt="Bilgisayar başında çalışan onlinedershanem. karakteri"
          width={1333}
          height={1180}
          priority
          sizes="(max-width: 520px) 88vw, 460px"
          className="mx-auto h-auto w-full"
        />
        <h1 className="sr-only">Panelimizi yeniliyoruz</h1>
        <p className="mt-3 text-sm leading-6 text-(--site-body)">
          Panelimizi yeniliyoruz, çok yakında buradayız.{" "}
          <Link
            href="/"
            className="font-semibold text-(--brand-olive) underline underline-offset-4"
          >
            Ana sayfaya dön
          </Link>
        </p>
      </div>
    </main>
  );
}
