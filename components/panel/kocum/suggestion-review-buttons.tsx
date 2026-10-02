"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SuggestionReviewButtons({
  suggestionId,
}: {
  suggestionId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"ACCEPTED" | "REJECTED" | null>(null);
  const [error, setError] = useState("");

  async function review(decision: "ACCEPTED" | "REJECTED") {
    if (busy) return;
    if (
      decision === "REJECTED" &&
      !window.confirm("Bu öneriyi reddetmek istediğine emin misin?")
    ) {
      return;
    }
    setBusy(decision);
    setError("");
    try {
      const response = await fetch(
        `/api/panel/kocum/suggestions/${suggestionId}/review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision,
            applyTasks: decision === "ACCEPTED",
          }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(
          typeof body?.error === "string" && body.error
            ? body.error
            : "İşlem kaydedilemedi. Lütfen tekrar dene.",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="panel-quick-action panel-quick-action-primary"
          disabled={busy !== null}
          onClick={() => void review("ACCEPTED")}
        >
          {busy === "ACCEPTED" ? "Ekleniyor…" : "Onayla ve ekle"}
        </button>
        <button
          type="button"
          className="panel-quick-action"
          disabled={busy !== null}
          onClick={() => void review("REJECTED")}
        >
          {busy === "REJECTED" ? "Reddediliyor…" : "Reddet"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
