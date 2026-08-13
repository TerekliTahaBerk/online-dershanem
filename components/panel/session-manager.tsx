"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Laptop, Loader2, LogOut } from "lucide-react";

type ManagedSession = {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent: string | null;
  ip: string | null;
};

const SESSION_DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Bilinmeyen cihaz";
  const browser = userAgent.includes("Edg/") ? "Edge" : userAgent.includes("Chrome/") ? "Chrome" : userAgent.includes("Firefox/") ? "Firefox" : userAgent.includes("Safari/") ? "Safari" : "Tarayıcı";
  const system = userAgent.includes("iPhone") || userAgent.includes("iPad") ? "iOS" : userAgent.includes("Android") ? "Android" : userAgent.includes("Mac OS") ? "macOS" : userAgent.includes("Windows") ? "Windows" : userAgent.includes("Linux") ? "Linux" : null;
  return system ? `${browser} · ${system}` : browser;
}

export function SessionManager({ sessions }: { sessions: ManagedSession[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const others = sessions.filter((session) => !session.current);

  async function close(path: string, key: string, method: "POST" | "DELETE") {
    setPending(key); setError(null);
    try {
      const response = await fetch(path, { method });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Oturum kapatılamadı.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Oturum kapatılamadı.");
    } finally {
      setPending(null);
    }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--site-body)]">Hesabınızda {sessions.length} aktif oturum var.</p>
      {others.length ? <button type="button" disabled={Boolean(pending)} onClick={() => void close("/api/auth/sessions/others", "others", "POST")} className="site-btn site-btn-secondary"><LogOut size={16} />{pending === "others" ? "Kapatılıyor…" : "Diğerlerini kapat"}</button> : null}
    </div>
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
    <div className="space-y-3">
      {sessions.map((session) => <article key={session.id} className="rounded-2xl border border-[var(--site-line)] bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><Laptop size={18} /></span>
          <div className="min-w-0">
            <p className="font-bold text-[var(--site-ink)]">{deviceLabel(session.userAgent)} {session.current ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-[10px] text-emerald-800">Bu cihaz</span> : null}</p>
            <p className="mt-1 text-xs text-[var(--site-muted)]">Son etkinlik: {SESSION_DATE_FORMATTER.format(new Date(session.lastSeenAt))}{session.ip ? ` · IP ${session.ip}` : ""}</p>
            <p className="mt-1 text-xs text-[var(--site-muted)]">Açılış: {SESSION_DATE_FORMATTER.format(new Date(session.createdAt))} · En geç: {SESSION_DATE_FORMATTER.format(new Date(session.expiresAt))}</p>
          </div>
        </div>
        {!session.current ? <button type="button" disabled={Boolean(pending)} onClick={() => void close(`/api/auth/sessions/${encodeURIComponent(session.id)}`, session.id, "DELETE")} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-rose-700 sm:mt-0">{pending === session.id ? <Loader2 className="animate-spin" size={15} /> : <LogOut size={15} />} Kapat</button> : null}
      </article>)}
    </div>
  </div>;
}
