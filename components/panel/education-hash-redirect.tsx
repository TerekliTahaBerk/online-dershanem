"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Eğitim sayfası sekmelere bölündü; eski çapalı bağlantılar
 * (`/panel/yonetim/egitim#ders-planla`) sekme parametresi olmadan gelirse
 * doğru sekmeye yönlendirilir. Yalnız `sekme` yokken çalışır.
 */
const HASH_TAB: Record<string, string> = {
  "#yeni-grup": "planlama",
  "#ders-planla": "planlama",
  "#odev-merkezi": "odevler",
};

export function EducationHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const tab = HASH_TAB[window.location.hash];
    if (!tab || new URLSearchParams(window.location.search).has("sekme")) return;
    router.replace(`/panel/yonetim/egitim?sekme=${tab}${window.location.hash}`);
  }, [router]);
  return null;
}
