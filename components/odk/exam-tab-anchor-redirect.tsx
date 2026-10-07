"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Eski bölüm çapaları (`#adim-sonuc` vb.) sekmeli çalışma alanında doğru
 * sekmeyi açar: başka sayfalardaki bağlantılar kırılmaz (§15.2). Çapa korunur
 * ki sekme açıldıktan sonra bölüme kaydırılsın.
 */
export function ExamTabAnchorRedirect({ anchors, activeTab }: { anchors: Record<string, string>; activeTab: string }) {
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
