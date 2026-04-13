"use client";

import { useState, useTransition } from "react";
import { grantUserAccessTag } from "@/app/odk/admin/actions";

type AccessTag = { id: string; key: string; title: string };

const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";

export function GrantAccessForm({ accessTags }: { accessTags: AccessTag[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [tagId, setTagId] = useState(accessTags[0]?.id ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !tagId) { setError("E-posta ve etiket seçimi zorunludur."); return; }

    startTransition(async () => {
      try {
        const res = await fetch("/api/odk/admin/find-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const data = await res.json();
        if (!res.ok || !data.userId) { setError(data.error ?? "Kullanıcı bulunamadı."); return; }
        await grantUserAccessTag(data.userId, tagId);
        setEmail("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      } catch {
        setError("Erişim verilemedi.");
      }
    });
  };

  if (accessTags.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 text-center text-sm text-stone-500">
        Önce bir{" "}
        <a href="/odk/admin/etiketler" className="text-emerald-600 hover:underline">erişim etiketi</a>{" "}
        oluştur.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-900 mb-4">Erişim Ver</h2>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">Erişim verildi!</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-stone-700">
          Öğrenci E-postası <span className="text-red-400">*</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1.5 ${inputCls}`} placeholder="ogrenci@email.com" />
        </label>

        <label className="block text-sm font-medium text-stone-700">
          Erişim Etiketi <span className="text-red-400">*</span>
          <select value={tagId} onChange={(e) => setTagId(e.target.value)} className={`mt-1.5 ${inputCls}`}>
            {accessTags.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Veriliyor..." : "Erişim Ver"}
        </button>
      </form>
    </div>
  );
}
