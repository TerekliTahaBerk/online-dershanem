import type { Metadata } from "next";
import { HesapSilPage } from "@/app/panel/_shared/hesap-sil-page";

export const metadata: Metadata = {
  title: "Hesabımı sil",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function Page() {
  return <HesapSilPage segment="ogretmen" />;
}
