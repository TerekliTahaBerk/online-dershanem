import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelDestination } from "@/lib/panel-access";
import { isPublicRegisterEnabled, PANEL_MAINTENANCE_PATH } from "@/lib/panel-config";

export const metadata: Metadata = {
  title: "Kayıt Ol",
  description: "Online Dershanem'e ücretsiz hesap oluşturun; TYT, AYT ve LGS hazırlığına başlayın.",
};

export default async function KayitPage() {
  // Yeni ürün kuralı: public self-register kapalı. Sayfa, panel bakım/açıklama
  // sayfasına yönlenir (middleware panel kapalıyken zaten yakalar; burası
  // defense-in-depth ve PANEL_ENABLED=true ama register kapalı senaryosu için).
  // Reversible: PUBLIC_REGISTER_ENABLED=true ile eski kayıt ekranı geri gelir.
  if (!isPublicRegisterEnabled()) redirect(PANEL_MAINTENANCE_PATH);

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
