import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

// Kamp ürünü matematik-odaklı yeni katalogda yer almıyor.
// Sayfa ana matematik ders akışına kalıcı yönlendirilir.
export const metadata: Metadata = {
  alternates: {
    canonical: "/"
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function CampsRedirectPage() {
  permanentRedirect("/");
}
