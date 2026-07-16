"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderLinkForm({ orderId, students }: { orderId: string; students: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <form className="mt-3 flex gap-2" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const userId = String(new FormData(event.currentTarget).get("userId") || "");
    const response = await fetch(`/api/panel/orders/${orderId}/user`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "Bağlanamadı."); else router.refresh();
    setBusy(false);
  }}><div className="min-w-0 flex-1"><select name="userId" required aria-label="Öğrenci hesabı" className="panel-input py-2 text-xs"><option value="">Öğrenci hesabına bağla…</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select>{error ? <p className="mt-1 text-[11px] text-rose-700">{error}</p> : null}</div><button disabled={busy} className="rounded-xl bg-[var(--brand-olive)] px-3 text-xs font-bold text-white disabled:opacity-60">Bağla</button></form>;
}
