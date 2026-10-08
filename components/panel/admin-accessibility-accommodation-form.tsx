"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminAccessibilityAccommodationForm({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    version: number;
    assessmentExtraPercent: number;
    breaksAllowed: boolean;
  };
}) {
  const router = useRouter();
  const [version, setVersion] = useState(initial.version);
  const [extra, setExtra] = useState(initial.assessmentExtraPercent);
  const [breaks, setBreaks] = useState(initial.breaksAllowed);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/panel/users/${userId}/accessibility`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        expectedVersion: version,
        assessmentExtraPercent: extra,
        breaksAllowed: breaks,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok)
      return setMessage(data.error || "Düzenleme kaydedilemedi.");
    setVersion(data.version);
    setMessage("İşlevsel akademik düzenleme kaydedildi.");
    router.refresh();
  }
  return (
    <section className="overflow-hidden rounded-[10px] border border-pn-border bg-white mt-5 p-5">
      <h2 className="text-sm font-extrabold">Akademik makul düzenleme</h2>
      <p className="mt-2 text-xs leading-5 text-(--site-body)">
        Tanı veya belge metni girmeyin. Yalnız öğretmenin uygulaması gereken
        işlevsel düzenlemeyi seçin.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-[12.5px] font-medium text-pn-text-secondary">
          Değerlendirme ek süresi
          <select
            aria-label="Değerlendirme ek süresi"
            value={extra}
            onChange={(event) => setExtra(Number(event.target.value))}
            className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          >
            <option value={0}>Ek süre yok</option>
            <option value={25}>%25 ek süre</option>
            <option value={50}>%50 ek süre</option>
            <option value={100}>%100 ek süre</option>
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-(--site-line) p-4 text-sm font-bold">
          <input
            type="checkbox"
            checked={breaks}
            onChange={(event) => setBreaks(event.target.checked)}
          />{" "}
          Planlı kısa molaya izin ver
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          className="text-xs font-bold text-(--brand-olive)"
        >
          {message}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]"
        >
          {busy ? "Kaydediliyor…" : "Düzenlemeyi kaydet"}
        </button>
      </div>
    </section>
  );
}
