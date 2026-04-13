"use client";

import { useState, useTransition } from "react";
import { createPackage } from "@/app/odk/admin/actions";

const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";

export function PackageCreateForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (isNaN(priceCents) || priceCents <= 0) { setError("Geçerli bir fiyat girin."); return; }

    startTransition(async () => {
      try {
        await createPackage({
          title: title.trim(),
          description: description.trim() || undefined,
          priceCents,
          durationDays: durationDays ? Number(durationDays) : undefined,
        });
        setTitle(""); setDescription(""); setPrice(""); setDurationDays("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      } catch {
        setError("Paket oluşturulamadı.");
      }
    });
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-900 mb-4">Yeni Paket</h2>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">Paket oluşturuldu!</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-stone-700">
          Paket Adı <span className="text-red-400">*</span>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1.5 ${inputCls}`} placeholder="TYT Tüm Denemeler" />
        </label>

        <label className="block text-sm font-medium text-stone-700">
          Açıklama
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1.5 ${inputCls} resize-none`} rows={2} placeholder="Kısa açıklama..." />
        </label>

        <label className="block text-sm font-medium text-stone-700">
          Fiyat (₺) <span className="text-red-400">*</span>
          <input type="text" required value={price} onChange={(e) => setPrice(e.target.value)} className={`mt-1.5 ${inputCls}`} placeholder="299.00" />
        </label>

        <label className="block text-sm font-medium text-stone-700">
          Erişim Süresi (gün)
          <input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className={`mt-1.5 ${inputCls}`} placeholder="365 (boş bırakılırsa süresiz)" />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Oluşturuluyor..." : "Paket Oluştur"}
        </button>
      </form>
    </div>
  );
}
