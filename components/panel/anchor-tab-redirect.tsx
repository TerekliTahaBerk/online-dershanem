"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Sekmeye bölünmüş sayfalarda eski bölüm çapaları (`#adim-sonuc`,
 * `#eposta-kuyrugu` vb.) doğru `?sekme=` değerini açar: başka sayfalardaki
 * bağlantılar kırılmaz. Çapa korunur ki sekme açıldıktan sonra bölüme
 * kaydırılsın. Kullananlar: deneme çalışma alanı (§15.2), aktivasyon masası.
 */
export function AnchorTabRedirect({ anchors, activeTab }: { anchors: Record<string, string>; activeTab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace(/^#/, "");
      const target = anchors[hash];
      if (!target || target === activeTab) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("sekme", target);
      router.replace(`${pathname}?${params.toString()}#${hash}`);
    };
    sync();
    // Aynı sayfada yalnız çapa değişirse (ör. sayfa içi bağlantı) de sekmeye geç.
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [anchors, activeTab, pathname, router, searchParams]);
  return null;
}
