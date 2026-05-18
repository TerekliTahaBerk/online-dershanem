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
              eyebrow="Online Dershane"
              nextStepNote={
                <>
                  <strong>Sıradaki adım:</strong> Hocalarımız{" "}
                  <strong>24 saat içinde</strong> sizinle iletişime geçerek
                  programınızı planlayacak. Henüz öğrenci için ders veya
                  öğretmen ataması yapılmadı; planlama birlikte yapılır.
                </>
              }
              primaryAction={{
                href: "/panel/ogrenci",
                label: "Panele Git",
                variant: "primary",
              }}
              secondaryAction={{ href: "/iletisim", label: "İletişim" }}
            />
          )}

          {normalizedStatus === "pending" && (
            <CheckoutResultCard
              status="pending"
              eyebrow="Online Dershane"
              title="Bilgileriniz alındı"
              description="Talebiniz kayıt altına alındı. Hocalarımız 24 saat içinde sizinle iletişime geçecek."
              primaryAction={{
                href: "/panel/ogrenci",
                label: "Panele Git",
                variant: "primary",
              }}
              secondaryAction={{ href: "/iletisim", label: "İletişim" }}
            />
          )}

          {normalizedStatus === "failed" && (
            <CheckoutResultCard
              status="failed"
              eyebrow="Online Dershane"
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
