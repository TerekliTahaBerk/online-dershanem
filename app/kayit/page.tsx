import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { PUBLIC_REGISTER_ENABLED } from "@/lib/panel-config";
import { getSession } from "@/lib/auth/session";
import { postAuthenticationPath } from "@/lib/auth/products";

/**
 * Statik `metadata` kapalıyken bile "Kayıt Ol" başlığını basıyordu: sayfa
 * 404 gövdesi gösterirken sekmede var olmayan bir ekranın adı duruyordu.
 */
export async function generateMetadata(): Promise<Metadata> {
  if (!PUBLIC_REGISTER_ENABLED) {
    return { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  }
  return {
    title: "Kayıt Ol",
    description: "Online Dershanem hesabı oluşturun.",
    robots: { index: false, follow: false },
  };
}

/**
 * Public kayıt ekranı — onaylı tasarım (Web.dc.html → isLogin, "KAYIT OL").
 *
 * Kayıt bir hesap açar ama ÜRÜN ERİŞİMİ VERMEZ; erişimi ödeme/onay sonrası
 * admin açar. Bu kural sunucuda `app/api/auth/register/route.ts` içinde
 * uygulanır — buradaki ekran yalnızca sunumdur.
 *
 * Panel kapalıyken kayıt da kapalıdır: kimsenin giremeyeceği bir panele hesap
 * açtırmanın anlamı yok.
 */
export default async function RegisterPage() {
  if (!PUBLIC_REGISTER_ENABLED) notFound();

  const session = await getSession();
  if (session) redirect(await postAuthenticationPath(session));

  return (
    <AuthCard title="Hesap oluştur" googleLabel="Google ile kayıt ol">
      <RegisterForm />

      <p className="mt-5 text-center text-[13px] text-dc-ink-muted">
        Hesabın var mı?{" "}
        <Link href="/giris" className="font-semibold text-dc-brand-strong hover:text-dc-brand-hover">
          Giriş yap
        </Link>
      </p>

      <p className="mt-4 rounded-xl border border-dc-line bg-white px-4 py-3 text-[12.5px] leading-[1.6] text-dc-ink-muted">
        Kayıt olmak ürün erişimi başlatmaz. Ders, koçluk ve deneme erişimin
        paketin tanımlandıktan sonra açılır.
      </p>
    </AuthCard>
  );
}
