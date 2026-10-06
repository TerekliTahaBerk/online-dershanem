"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

/**
 * Yön Bugün görev satırının işaret kutusu. Var olan uç
 * (`/api/panel/kocum/tasks/[id]/complete`) ile görevi `DONE` yapar; sunucu
 * geçişi doğrular (tekrarlanan istek NOOP, geçersiz geçiş 409). Ayrıntılı
 * "gerçekleşen" girişi Planım'daki görev panelinde kalır. Ürün olayı
 * (`plan_task_completed`) sunucuda, geçiş gerçekten olduğunda yazılır.
 */
export function YonTaskCheck({
  taskId,
  title,
  done,
}: {
  taskId: string;
  title: string;
  done: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(done);
  const [error, setError] = useState("");

  async function complete() {
    if (checked || busy) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/panel/kocum/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const body = await response?.json().catch(() => ({}));
      setError((body as { error?: string } | undefined)?.error || "Görev güncellenemedi.");
      return;
    }
    setChecked(true);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`${title} tamamlandı`}
        disabled={busy || checked}
        onClick={() => void complete()}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border transition-colors ${
          checked
            ? "border-pn-accent bg-pn-accent text-white"
            : "border-pn-border-strong bg-white hover:border-pn-accent"
        }`}
      >
        {busy ? <Loader2 size={12} className="animate-spin text-pn-text-muted" /> : checked ? <Check size={13} aria-hidden="true" /> : null}
      </button>
      {error ? (
        <span role="alert" className="mt-1 text-[12px] text-(--pn-tone-critical)">
          {error}
        </span>
      ) : null}
    </span>
  );
}
