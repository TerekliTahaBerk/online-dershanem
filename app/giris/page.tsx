import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "Online Dershanem öğrenci, öğretmen ve veli panellerine giriş yapın.",
};

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
    <AuthShell
      title="Tekrar hoş geldin."
      subtitle="Bıraktığın sayfa, çözdüğün son soru, kurduğun plan — hepsi seni bekliyor."
      footer={
        <p>
          İlk kez mi geliyorsun?{" "}
          <Link href="/kayit" className="font-semibold text-white hover:underline">
            Hesap oluştur
          </Link>
        </p>
      }
    >
      {justRegistered ? (
        <p className="mb-4 rounded-lg bg-[#15321F] px-3 py-2 text-center text-[13px] font-medium text-[#7BD8A6]">
          Hesabın hazır. Giriş yapıp kaldığın yerden devam edebilirsin.
        </p>
      ) : null}
      <LoginForm callbackUrl={params?.callbackUrl} />
    </AuthShell>
  );
}
