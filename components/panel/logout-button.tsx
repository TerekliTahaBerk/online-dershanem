"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useOfflineSync } from "@/components/panel/offline-sync-provider";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { clearDeviceQueue } = useOfflineSync();

  async function onLogout() {
    setPending(true);
    await clearDeviceQueue();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Sunucuya ulaşılamasa bile kullanıcıyı dışarı al: çerez geçersiz olmasa
      // da panelde bırakmak yanlış sinyal verir. Oturum sunucuda ayakta kalırsa
      // sonraki girişte zaten temizlenir.
    }
    router.replace("/giris");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className={`flex items-center gap-1.5 text-[12px] font-semibold text-[var(--site-body)] transition-colors hover:text-[var(--site-ink)] disabled:opacity-60 ${compact ? "w-full rounded-xl px-1 py-1.5" : "rounded-full border border-[var(--site-line)] px-3 py-1.5"}`}
    >
      <LogOut size={13} aria-hidden="true" />
      {pending ? "Çıkılıyor" : "Çıkış"}
    </button>
  );
}
