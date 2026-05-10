import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";

export default async function SifremiUnuttumPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect(getPanelDestination(session.user));

  return (
    <AuthShell
      title="Şifreni sıfırlayalım."
      subtitle="E-posta adresini gir; tek seferlik bir kodla yeni şifreni belirleyebilirsin."
      footer={
        <p>
          Hatırladın mı?{" "}
          <Link href="/giris" className="font-semibold text-white hover:underline">
            Giriş yap
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
