import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";

export default async function KayitPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect(getPanelDestination(session.user));

  return (
    <AuthShell
      title="Aramıza katıl."
      subtitle="Birkaç adımda hesabını oluştur ve başla."
      footer={
        <p>
          Hesabın var mı?{" "}
          <Link href="/giris" className="font-semibold text-white hover:underline">
            Giriş Yap
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
