import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

// Kamp ürünü matematik-odaklı yeni katalogda yer almıyor (eski ₺2.000 fiyatlı
// içerik). Sayfa /paketler'e kalıcı yönlendirilir.
export const metadata: Metadata = {
  alternates: {
    canonical: "/paketler/"
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function CampsRedirectPage() {
  permanentRedirect("/paketler/");
}
