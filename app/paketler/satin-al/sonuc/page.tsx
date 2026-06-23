import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import {
  CheckoutResultCard,
  type CheckoutResultStatus,
} from "@/components/checkout/checkout-result-card";

type Search = Promise<{ status?: string }>;

export const metadata: Metadata = {
  title: "Teşekkürler · Online Dershanem",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdCheckoutThankYouPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { status } = await searchParams;
  const normalizedStatus: CheckoutResultStatus =
    status === "failed" ? "failed" : status === "pending" ? "pending" : "success";

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] min-h-screen py-16">
        <div className="px-4">
          {normalizedStatus === "success" && (
            <CheckoutResultCard
              status="success"
              eyebrow="Online Matematik Dershanesi"
              description="Ödemeniz alındı. Ekibimiz öğrenci hesabınızı hazırlayıp giriş bilgilerinizi sizinle paylaşacak."
              nextStepNote={
                <>
                  <strong>Sıradaki adım:</strong> Hesap açmanıza gerek yok.
                  Ekibimiz <strong>24 saat içinde</strong> sizinle iletişime
                  geçerek öğrenci hesabınızı oluşturacak ve matematik programınızı
                  birlikte planlayacak. Satın alma için ayrıca kayıt olmanız
                  gerekmez; bilgilendirme telefon veya e-posta üzerinden yapılacaktır.
                </>
              }
              primaryAction={{ href: "/", label: "Ana Sayfa", variant: "primary" }}
              secondaryAction={{ href: "/iletisim", label: "İletişim" }}
            />
          )}

          {normalizedStatus === "pending" && (
            <CheckoutResultCard
              status="pending"
              eyebrow="Online Matematik Dershanesi"
              title="Bilgileriniz alındı"
              description="Talebiniz kayıt altına alındı. Ekibimiz 24 saat içinde sizinle iletişime geçecek."
              primaryAction={{ href: "/", label: "Ana Sayfa", variant: "primary" }}
              secondaryAction={{ href: "/iletisim", label: "İletişim" }}
            />
          )}

          {normalizedStatus === "failed" && (
            <CheckoutResultCard
              status="failed"
              eyebrow="Online Matematik Dershanesi"
              primaryAction={{
                href: "/paketler",
                label: "Paketlere Dön",
                variant: "primary",
              }}
              secondaryAction={{ href: "/iletisim", label: "İletişim" }}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
