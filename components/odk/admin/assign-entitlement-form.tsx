"use client";

import { useState, useTransition } from "react";
import { createManualOdkEntitlement } from "@/app/odk/admin/actions";
import { Package } from "lucide-react";

type User = { id: string; name: string | null; email: string };
type OdkPkg = { id: string; title: string; durationDays: number | null };

type Props = {
  allStudentUsers: User[];
  odkPackages: OdkPkg[];
};

export function AssignEntitlementForm({ allStudentUsers, odkPackages }: Props) {
  const [userId, setUserId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  const filteredUsers = userSearch
    ? allStudentUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.name ?? "").toLowerCase().includes(userSearch.toLowerCase()),
      )
    : allStudentUsers;

  const selectedPkg = odkPackages.find((p) => p.id === packageId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !packageId) {
      setError("Öğrenci ve paket seçimi zorunludur.");
      return;
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await createManualOdkEntitlement(userId, packageId, {
          expiresAt: expiresAt || null,
        });
        setSuccess("Paket erişimi verildi.");
        setUserId("");
        setPackageId("");
        setExpiresAt("");
        setUserSearch("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu.");
      }
    });
  }

  if (odkPackages.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-700">Paket Erişimi Ver</h2>
        </div>
        <p className="text-xs text-stone-400">
          Henüz ODK paketi tanımlanmamış. Önce{" "}
          <a href="/odk/admin/paketler" className="text-emerald-600 hover:underline">
            paket oluşturun
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-stone-700">Paketten Erişim Ver</h2>
      </div>

      {success && (
        <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* User search */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Öğrenci</label>
          <input
            type="text"
            placeholder="İsim veya e-posta ara..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setUserId("");
            }}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
          />
          {userSearch && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-sm">
              {filteredUsers.length === 0 ? (
                <p className="px-3 py-2 text-xs text-stone-400">Sonuç yok</p>
              ) : (
                filteredUsers.slice(0, 8).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setUserId(u.id);
                      setUserSearch(u.name ?? u.email);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 transition ${
                      userId === u.id ? "bg-emerald-50 text-emerald-800" : "text-stone-700"
                    }`}
                  >
                    <span className="font-medium">{u.name ?? u.email}</span>
                    {u.name && (
                      <span className="ml-1 text-stone-400">{u.email}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
          {userId && (
            <p className="text-xs text-emerald-600 font-medium">✓ Seçildi</p>
          )}
        </div>

        {/* Package selector */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">Paket</label>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
          >
            <option value="">Paket seç...</option>
            {odkPackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.durationDays ? ` (${p.durationDays} gün)` : " (Süresiz)"}
              </option>
            ))}
          </select>
          {selectedPkg?.durationDays && (
            <p className="text-xs text-stone-400">
              Paket süresi: {selectedPkg.durationDays} gün (özel tarih seçmezseniz)
            </p>
          )}
        </div>

        {/* Optional expiry override */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">
            Son Geçerlilik Tarihi{" "}
            <span className="text-stone-400 font-normal">(opsiyonel)</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={today}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
          />
          <p className="text-xs text-stone-400">
            Boş bırakılırsa paket süresi veya süresiz erişim verilir.
          </p>
        </div>

        <button
          type="submit"
          disabled={!userId || !packageId || isPending}
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 transition"
        >
          {isPending ? "Atanıyor..." : "Paket Ata"}
        </button>
      </form>
    </div>
  );
}
