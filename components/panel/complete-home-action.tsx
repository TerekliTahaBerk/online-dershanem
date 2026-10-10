"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/panel/primitives";
export function CompleteHomeAction({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function complete() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/panel/adaptive-plan/tasks/${encodeURIComponent(taskId)}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entryPoint: "HOME" }) });
      setMessage(response.ok ? "Süper, kaydettik!" : "Kaydedemedik. Planının son hâline bakıp bir daha dener misin?");
      if (response.ok) router.refresh();
    } catch { setMessage("Bağlantı kuramadık. İnternetini kontrol edip bir daha dener misin?"); }
    finally { setBusy(false); }
  }
  return <span className="inline-flex flex-col gap-1"><button type="button" className={buttonClass("secondary")} disabled={busy} onClick={() => void complete()}>{busy ? "Kaydediliyor" : "Bu çalışmayı tamamladım"}</button><span className="text-xs" role="status">{message}</span></span>;
}
