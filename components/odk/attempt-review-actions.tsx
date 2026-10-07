"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/panel/primitives";

/**
 * Operasyon yan panelindeki bütünlük inceleme eylemleri. Uç
 * (`PATCH /api/odk/admin/attempts/[id]`) `odk:integrity:review` iznini ve
 * aynı köken / hız sınırını ayrıca doğrular.
 */
export function AttemptReviewActions({ attemptId, reviewed }: { attemptId: string; reviewed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function review(action: "MARK_REVIEWED" | "REQUIRE_REVIEW" | "CLEAR_REVIEW") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/odk/admin/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage({ text: result.error || "İnceleme kaydedilemedi.", error: true });
      setMessage({ text: "İnceleme kaydedildi.", error: false });
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void review("MARK_REVIEWED")} className={buttonClass("primary", "sm")}>
          {reviewed ? "Yeniden incelendi say" : "İncelendi olarak işaretle"}
        </button>
        <button type="button" disabled={busy} onClick={() => void review("REQUIRE_REVIEW")} className={buttonClass("secondary", "sm")}>
          İnceleme gerekli
        </button>
        <button type="button" disabled={busy} onClick={() => void review("CLEAR_REVIEW")} className={buttonClass("ghost", "sm")}>
          Sinyali temizle
        </button>
      </div>
      {message ? (
        <p role={message.error ? "alert" : "status"} className={`text-[13px] font-medium ${message.error ? "text-(--pn-tone-critical)" : "text-(--pn-tone-success)"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
