import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    return {
      title: "Giriş",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "Kayıt Ol",
    description: "onlinedershanem. hesabı oluşturun.",
    robots: { index: false, follow: false },
  };
}

/**
 * Public kayıt ekranı — çok adımlı (Öğrenci / Veli).
 *
 * Kayıt bir hesap açar ama ÜRÜN ERİŞİMİ VERMEZ; erişim ödeme sonrası
 * provisioning ya da admin eliyle açılır. Bu kural sunucuda `app/api/auth/register/route.ts` içinde
 * uygulanır — buradaki ekran yalnızca sunumdur.
 *
 * Panel kapalıyken kayıt da kapalıdır: kimsenin giremeyeceği bir panele hesap
 * açtırmanın anlamı yok.
 */
export default async function RegisterPage() {
  // notFound() kök loading sınırı yüzünden 200 + 404 gövdesi (soft 404) döndürüyordu;
  // kayıt kapalıyken giriş ekranına yönlendirmek hem doğru durum kodu hem net yoldur.
  if (!PUBLIC_REGISTER_ENABLED) redirect("/giris");

  const session = await getSession();
  if (session) redirect(await postAuthenticationPath(session));

  return (
    <AuthCard
      title="Hesap oluştur"
      wide
      description="Öğrenci ya da veli olarak birkaç adımda hesabını aç; seni hemen arayalım."
    >
      <RegisterForm />

      <p className="mt-5 text-center text-[13px] text-dc-ink-muted">
        Hesabın var mı?{" "}
        <Link
          href="/giris"
          className="font-semibold text-dc-brand-strong hover:text-dc-brand-hover"
        >
          Giriş yap
        </Link>
      </p>

      <p className="mt-4 rounded-xl border border-dc-line bg-white px-4 py-3 text-[12.5px] leading-[1.6] text-dc-ink-muted">
        Kayıt olmak ürün erişimi başlatmaz. Paket satın aldığında erişimin
        otomatik açılır; öğretmen ataması için seninle iletişime geçeriz.
      </p>
    </AuthCard>
  );
}
