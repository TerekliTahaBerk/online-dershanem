"use client";

import { useState, useTransition, useRef } from "react";
import { grantUserAccessTag } from "@/app/odk/admin/actions";

type AccessTag = { id: string; key: string; title: string };
type StudentUser = { id: string; name: string | null; email: string };

const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";

export function GrantAccessForm({
  accessTags,
  allStudentUsers,
}: {
  accessTags: AccessTag[];
  allStudentUsers: StudentUser[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<StudentUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tagId, setTagId] = useState(accessTags[0]?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim().length > 0
    ? allStudentUsers.filter((u) => {
        const q = query.toLowerCase();
        return u.email.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const handleSelect = (u: StudentUser) => {
    setSelectedUser(u);
    setQuery(u.name ? `${u.name} — ${u.email}` : u.email);
    setShowDropdown(false);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedUser(null);
    setShowDropdown(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = selectedUser?.email ?? query.trim();
    if (!email || !tagId) {
      setError("Öğrenci seçimi ve etiket zorunludur.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/odk/admin/find-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase() }),
        });
        const data = await res.json();
        if (!res.ok || !data.userId) {
          setError(data.error ?? "Kullanıcı bulunamadı.");
          return;
        }
        await grantUserAccessTag(data.userId, tagId);
        setQuery("");
        setSelectedUser(null);
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
        <a href="/odk/admin/etiketler" className="text-emerald-600 hover:underline">
          erişim etiketi
        </a>{" "}
        oluştur.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-900 mb-4">Erişim Ver</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
          Erişim verildi!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Öğrenci <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => query.trim() && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              className={inputCls}
              placeholder="İsim veya e-posta ile ara..."
              autoComplete="off"
            />
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg overflow-hidden">
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={() => handleSelect(u)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 flex flex-col"
                  >
                    <span className="font-medium text-stone-900">{u.name ?? u.email}</span>
                    {u.name && <span className="text-xs text-stone-400">{u.email}</span>}
                  </button>
                ))}
              </div>
            )}
            {showDropdown && query.trim().length > 0 && filtered.length === 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg px-4 py-3 text-sm text-stone-400">
                Öğrenci bulunamadı
              </div>
            )}
          </div>
          {selectedUser && (
            <p className="mt-1.5 text-xs text-emerald-600 font-medium">✓ {selectedUser.email}</p>
          )}
        </div>

        <label className="block text-sm font-medium text-stone-700">
          Erişim Etiketi <span className="text-red-400">*</span>
          <select
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            className={`mt-1.5 ${inputCls}`}
          >
            {accessTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
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
