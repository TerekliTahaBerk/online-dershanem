"use client";

import { useState, useTransition } from "react";
import { createAccessTag } from "@/app/odk/admin/actions";

const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";

export function AccessTagCreateForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setKey(val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !key.trim()) { setError("Başlık ve anahtar zorunludur."); return; }

    startTransition(async () => {
      try {
        await createAccessTag({ key: key.trim(), title: title.trim(), description: description.trim() || undefined });
        setTitle(""); setKey(""); setDescription("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      } catch {
        setError("Bu anahtar zaten kullanımda olabilir.");
      }
    });
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-900 mb-4">Yeni Erişim Etiketi</h2>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">Etiket oluşturuldu!</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-stone-700">
          Başlık <span className="text-red-400">*</span>
          <input type="text" required value={title} onChange={(e) => handleTitleChange(e.target.value)} className={`mt-1.5 ${inputCls}`} placeholder="TYT 2025 Paketi" />
        </label>

        <label className="block text-sm font-medium text-stone-700">
          Anahtar (slug) <span className="text-red-400">*</span>
          <input
            type="text"
            required
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className={`mt-1.5 ${inputCls} font-mono`}
            placeholder="tyt-2025-paketi"
          />
        </label>

        <label className="block text-sm font-medium text-stone-700">
          Açıklama
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1.5 ${inputCls}`} placeholder="Opsiyonel açıklama" />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Oluşturuluyor..." : "Etiket Oluştur"}
        </button>
      </form>
    </div>
  );
}
