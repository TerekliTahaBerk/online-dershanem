import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell
      title="Hoş geldin."
      subtitle="Çalışmana kaldığın yerden devam et."
      footer={
        <p>
          Hesabın yok mu?{" "}
          <Link href="/kayit" className="font-semibold text-white hover:underline">
            Kayıt Ol
          </Link>
        </p>
      }
    >
      {justRegistered ? (
        <p className="mb-4 rounded-lg bg-[#15321F] px-3 py-2 text-center text-[13px] font-medium text-[#7BD8A6]">
          Hesabın açıldı. Şimdi giriş yapabilirsin.
        </p>
      ) : null}
      <LoginForm callbackUrl={params?.callbackUrl} />
    </AuthShell>
  );
}
