import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";

export const metadata: Metadata = {
  title: "Kayıt Ol",
  description: "Online Dershanem'e ücretsiz hesap oluşturun; TYT, AYT ve LGS hazırlığına başlayın.",
};

export default async function KayitPage() {
  const session = await getServerAuthSession();
  if (session?.user) redirect(getPanelDestination(session.user));

  return (
    <AuthShell
      title="Bir hesap, kişisel bir yol."
      subtitle="Birkaç dakikada hesabını aç; gerisini birlikte planlayalım."
      footer={
        <p>
          Hesabın var mı?{" "}
          <Link href="/giris" className="font-semibold text-white hover:underline">
            Giriş yap
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
