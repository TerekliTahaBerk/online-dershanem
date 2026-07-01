import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { CheckoutResultCard } from "@/components/checkout/checkout-result-card";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ status?: string }>;

export const metadata: Metadata = {
  title: "Ödeme Sonucu · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdkCheckoutResultPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const { status } = await searchParams;
  const isSuccess = status === "success";

  return (
    <>
      <Navbar />
      <main className="od-public min-h-screen bg-[var(--od-cream)] py-16">
        <div className="px-4">
          {isSuccess ? (
            <CheckoutResultCard
              status="success"
              eyebrow="Deneme Kulübü"
              title="Ödemeniz alındı"
              description="Siparişiniz onaylandığında paket erişiminiz otomatik aktive olur. Bu işlem genellikle birkaç saniye sürer."
              nextStepNote={
                <>
                  <strong>Sıradaki adım:</strong> Deneme planınızı
                  kişiselleştirmek için <strong>hocalarımız 24 saat içinde</strong>{" "}
                  sizinle iletişime geçecektir. Şimdilik bir aksiyon almanıza
                  gerek yok.
                </>
              }
              primaryAction={{
                href: "/panel/ogrenci/odk",
                label: "ODK Panelime Git",
                variant: "primary",
              }}
              secondaryAction={{
                href: `/odk-paketleri/${slug}`,
                label: "Pakete Dön",
              }}
            />
          ) : (
            <CheckoutResultCard
              status="failed"
              eyebrow="Deneme Kulübü"
              description="İşleminiz banka tarafından onaylanmadı ya da yarıda kaldı. Hesabınızdan herhangi bir tutar çekilmediyse tekrar deneyebilirsiniz."
              primaryAction={{
                href: `/odk-paketleri/${slug}/satin-al`,
                label: "Tekrar Dene",
                variant: "primary",
              }}
              secondaryAction={{ href: "/iletisim", label: "Destek" }}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
