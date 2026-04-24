"use client";

import { useState, useTransition, useRef } from "react";
import { grantUserAccessTag } from "@/app/odk/admin/actions";
import { Check, AlertCircle } from "lucide-react";

type AccessTag = { id: string; key: string; title: string };
type StudentUser = { id: string; name: string | null; email: string };

const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";

type BulkResult = { email: string; ok: boolean; message: string };

export function GrantAccessForm({
  accessTags,
  allStudentUsers,
}: {
  accessTags: AccessTag[];
  allStudentUsers: StudentUser[];
}) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Single — search state
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<StudentUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tagId, setTagId] = useState(accessTags[0]?.id ?? "");
  const [expiresAt, setExpiresAt] = useState("");
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleSuccess, setSingleSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Bulk
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkTagId, setBulkTagId] = useState(accessTags[0]?.id ?? "");
  const [bulkExpiresAt, setBulkExpiresAt] = useState("");
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);

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

  async function findUserId(email: string): Promise<string | null> {
    const res = await fetch("/api/odk/admin/find-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    return res.ok && data.userId ? data.userId : null;
  }

  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError(null);

    const email = selectedUser?.email ?? query.trim();
    if (!email || !tagId) {
      setSingleError("Öğrenci seçimi ve etiket zorunludur.");
      return;
    }

    startTransition(async () => {
      try {
        const userId = await findUserId(email);
        if (!userId) { setSingleError("Kullanıcı bulunamadı."); return; }
        await grantUserAccessTag(userId, tagId, { expiresAt: expiresAt || null });
        setQuery("");
        setSelectedUser(null);
        setExpiresAt("");
        setSingleSuccess(true);
        setTimeout(() => setSingleSuccess(false), 2500);
      } catch {
        setSingleError("Erişim verilemedi.");
      }
    });
  };

  const handleBulk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTagId) return;
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes("@"));
    if (emails.length === 0) return;

    setBulkResults([]);
    startTransition(async () => {
      const results: BulkResult[] = [];
      for (const em of emails) {
        try {
          const userId = await findUserId(em);
          if (!userId) {
            results.push({ email: em, ok: false, message: "Kullanıcı bulunamadı" });
          } else {
            await grantUserAccessTag(userId, bulkTagId, { expiresAt: bulkExpiresAt || null });
            results.push({ email: em, ok: true, message: "Erişim verildi" });
          }
        } catch {
          results.push({ email: em, ok: false, message: "Hata oluştu" });
        }
      }
      setBulkResults(results);
      if (results.every((r) => r.ok)) setBulkEmails("");
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-stone-900">Erişim Ver</h2>
        <div className="flex rounded-lg border border-stone-200 overflow-hidden text-xs">
          {(["single", "bulk"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 font-medium transition ${mode === m ? "bg-emerald-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}
            >
              {m === "single" ? "Tekli" : "Toplu"}
            </button>
          ))}
        </div>
      </div>

      {mode === "single" ? (
        <>
          {singleError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {singleError}
            </div>
          )}
          {singleSuccess && (
            <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
              Erişim verildi!
            </div>
          )}
          <form onSubmit={handleSingle} className="space-y-4">
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
              <select value={tagId} onChange={(e) => setTagId(e.target.value)} className={`mt-1.5 ${inputCls}`}>
                {accessTags.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-stone-700">
              Son Geçerlilik Tarihi
              <span className="ml-1 text-xs font-normal text-stone-400">(boş = süresiz)</span>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={`mt-1.5 ${inputCls}`}
                min={new Date().toISOString().slice(0, 10)}
              />
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              {isPending ? "Veriliyor..." : "Erişim Ver"}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={handleBulk} className="space-y-4">
          <label className="block text-sm font-medium text-stone-700">
            E-posta Listesi
            <span className="text-xs font-normal text-stone-400 ml-1">(her satıra bir e-posta)</span>
            <textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              rows={6}
              className={`mt-1.5 ${inputCls} resize-none font-mono text-xs`}
              placeholder={"ogrenci1@email.com\nogrenci2@email.com\nogrenci3@email.com"}
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Erişim Etiketi <span className="text-red-400">*</span>
            <select value={bulkTagId} onChange={(e) => setBulkTagId(e.target.value)} className={`mt-1.5 ${inputCls}`}>
              {accessTags.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Son Geçerlilik Tarihi
            <span className="ml-1 text-xs font-normal text-stone-400">(boş = süresiz)</span>
            <input
              type="date"
              value={bulkExpiresAt}
              onChange={(e) => setBulkExpiresAt(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
              min={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <button
            type="submit"
            disabled={isPending || !bulkEmails.trim()}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {isPending ? "İşleniyor..." : "Tümüne Erişim Ver"}
          </button>

          {bulkResults.length > 0 && (
            <div className="rounded-lg border border-stone-200 divide-y divide-stone-100 overflow-hidden max-h-56 overflow-y-auto">
              {bulkResults.map((r) => (
                <div key={r.email} className={`flex items-center gap-2 px-3 py-2 text-xs ${r.ok ? "bg-emerald-50" : "bg-red-50"}`}>
                  {r.ok
                    ? <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    : <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                  <span className="font-mono text-stone-700 truncate">{r.email}</span>
                  <span className={`ml-auto shrink-0 ${r.ok ? "text-emerald-600" : "text-red-500"}`}>{r.message}</span>
                </div>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
