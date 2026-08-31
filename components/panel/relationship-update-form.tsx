"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RelationshipUpdateForm({
  id,
  initialRelationship,
}: {
  id: string;
  initialRelationship: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialRelationship || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/panel/relationships/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ relationship: value }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Yakınlık güncellenemedi.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex min-w-[260px] flex-wrap items-center justify-end gap-1.5">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Yakınlık"
        className="panel-input max-w-[140px] py-1.5 text-[11.5px]"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="rounded-lg border border-[#DDE4E0] bg-white px-2 py-1 text-[11px] font-bold text-dc-ink transition-colors hover:border-dc-brand disabled:opacity-60"
      >
        {busy ? "Kaydediliyor" : "Kaydet"}
      </button>
      {error ? <p className="w-full text-right text-[11px] text-[#C2493D]">{error}</p> : null}
    </div>
  );
}
