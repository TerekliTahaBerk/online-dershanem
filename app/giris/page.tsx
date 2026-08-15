import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/panel/login-form";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { PANEL_ENABLED, PUBLIC_REGISTER_ENABLED } from "@/lib/panel-config";
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
function LoginScreen({ resetSuccess, registered }: { resetSuccess: boolean; registered: boolean }) {
  return (
    <AuthCard title="Tekrar hoş geldin" googleLabel="Google ile giriş yap">
      <LoginForm resetSuccess={resetSuccess} registered={registered} />

      {/* Kayıt kapalıyken var olmayan bir sayfaya bağlantı gösterme. */}
      {PUBLIC_REGISTER_ENABLED ? (
        <p className="mt-5 text-center text-[13px] text-dc-ink-muted">
          Hesabın yok mu?{" "}
          <Link href="/kayit" className="font-semibold text-dc-brand-strong hover:text-dc-brand-hover">
            Kayıt ol
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-[13px] text-dc-ink-muted">
          Hesabınızı ekibimiz açar.
        </p>
      )}
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
