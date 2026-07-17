"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function EmailRetryButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState("");

  if (queued) return <span className="text-xs font-bold text-amber-700">Bekliyor</span>;
  return <div className="text-right"><button type="button" disabled={busy} onClick={async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/panel/email-outbox/${id}/retry`, { method: "PATCH" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "Yeniden deneme başlatılamadı.");
      }
      setQueued(true);
      setBusy(false);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Yeniden deneme başlatılamadı.");
      setBusy(false);
    }
  }} className="panel-quick-action"><RefreshCw size={13} className={busy ? "animate-spin" : ""} /> {busy ? "Kuyruğa alınıyor" : "Yeniden dene"}</button>{error ? <p role="alert" className="mt-1 max-w-48 text-[10px] text-rose-700">{error}</p> : null}</div>;
}
