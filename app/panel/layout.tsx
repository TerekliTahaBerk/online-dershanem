import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

/**
 * Panelin dış kapısı.
 *
 * `requireSession()` panel kapalıysa 404, oturum yoksa /giris'e yollar.
 * BURASI tek başına yeterli DEĞİL: her sayfa kendi rol kontrolünü de yapar
 * (layout, alt sayfaların RSC isteklerinde her zaman yeniden çalışmaz).
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <>{children}</>;
}
