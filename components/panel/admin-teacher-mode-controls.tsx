"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GraduationCap } from "lucide-react";

export function AdminTeacherModeBanner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function exitMode() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/panel/admin-teacher-mode", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as { returnPath?: string; error?: string } | null;
      if (!response.ok) {
        setError(body?.error || "Yönetim paneline dönülemedi.");
        return;
      }
      router.replace(body?.returnPath || "/panel/yonetim");
      router.refresh();
    });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] border-b border-sky-300/80 bg-sky-50 px-4 py-2.5 text-sky-950 sm:px-7"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-sky-800">
            Öğretmen çalışma modu
          </p>
          <p className="mt-0.5 text-[13.5px] font-semibold leading-5">
            Kendi öğretmen panelinizdesiniz. İşlemler sizin adınıza kaydedilir; oturumunuz yönetici olarak kalır.
          </p>
          {error ? <p className="mt-1 text-[12px] font-semibold text-red-700">{error}</p> : null}
        </div>
        <button
          type="button"
          onClick={exitMode}
          disabled={pending}
          className="rounded-[10px] bg-sky-900 px-3 py-2 text-[12px] font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Dönülüyor…" : "Yönetim paneline dön"}
        </button>
      </div>
    </div>
  );
}

export function AdminTeacherModeSwitchButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enterMode() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/panel/admin-teacher-mode", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as { homePath?: string; error?: string } | null;
      if (!response.ok) {
        setError(body?.error || "Öğretmen paneline geçilemedi.");
        return;
      }
      router.push(body?.homePath || "/panel/ogretmen");
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={enterMode}
        disabled={pending}
        title={error || undefined}
        className={
          compact
            ? "inline-flex items-center gap-1.5 rounded-[10px] border border-dc-line bg-white px-2.5 py-1.5 text-[12px] font-bold text-dc-ink transition-colors hover:border-dc-brand disabled:opacity-60"
            : "inline-flex items-center gap-1.5 rounded-[10px] border border-dc-line bg-white px-3 py-2 text-[12.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand disabled:opacity-60"
        }
      >
        <GraduationCap size={14} aria-hidden="true" />
        {pending ? "Açılıyor…" : "Öğretmen paneline geç"}
      </button>
      {error ? <span className="max-w-[180px] text-right text-[11px] font-semibold text-red-700">{error}</span> : null}
    </span>
  );
}
