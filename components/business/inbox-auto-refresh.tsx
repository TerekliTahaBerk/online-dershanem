"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function InboxAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return <span className="sr-only" aria-live="polite">Mesaj kutusu 15 saniyede bir güncellenir.</span>;
}
