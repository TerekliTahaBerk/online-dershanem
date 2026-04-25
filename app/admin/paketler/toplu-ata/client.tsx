"use client";

import { useState } from "react";
import { Users, Search, X } from "lucide-react";

type Package = { id: string; name: string; type: string };
type Student = { id: string; fullName: string; classLevel: string | null; examType: string | null };

type Props = {
  packages: Package[];
  students: Student[];
  action: (formData: FormData) => Promise<void>;
};

export function BulkAssignClient({ packages, students, action }: Props) {
  const [packageId, setPackageId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().slice(0, 10);

  const filtered = search
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(search.toLowerCase()) ||
          (s.examType ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (s.classLevel ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : students;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((s) => s.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  return (
    <form action={action}>
      <input type="hidden" name="studentIds" value={Array.from(selectedIds).join(",")} />

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Package selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Atanacak Paket *</label>
          <select
            name="packageId"
            required
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
          >
            <option value="">Paket seçin...</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.type === "EXAM" ? "📝" : "📚"} {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Expiry */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Son Geçerlilik Tarihi{" "}
            <span className="text-xs text-gray-400 font-normal">(opsiyonel)</span>
          </label>
          <input
            type="date"
            name="expiresAt"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={today}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
          />
        </div>

        {/* Student selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Öğrenciler{" "}
              {selectedIds.size > 0 && (
                <span className="ml-1 rounded-full bg-[#546B41] text-white text-xs font-bold px-2 py-0.5">
                  {selectedIds.size} seçili
                </span>
              )}
            </label>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={selectAll} className="text-[#546B41] hover:underline">
                {search ? "Görünenleri Seç" : "Tümünü Seç"}
              </button>
              <span className="text-gray-300">|</span>
              <button type="button" onClick={clearAll} className="text-gray-500 hover:underline">
                Temizle
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="İsim, sınıf, sınav türü..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Student list */}
          <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                <Users className="h-4 w-4" />
                Sonuç yok
              </div>
            ) : (
              filtered.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    selectedIds.has(s.id) ? "bg-[#546B41]/5" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="w-4 h-4 accent-[#546B41] rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{s.fullName}</span>
                    {(s.classLevel || s.examType) && (
                      <span className="ml-2 text-xs text-gray-400">
                        {[s.classLevel, s.examType].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                  {selectedIds.has(s.id) && (
                    <span className="text-xs text-[#546B41] font-medium shrink-0">✓</span>
                  )}
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} öğrenci gösteriliyor</p>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={selectedIds.size === 0 || !packageId}
            className="bg-[#546B41] hover:bg-[#435633] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {selectedIds.size > 0 ? `${selectedIds.size} Öğrenciye Ata` : "Öğrenci Seçin"}
          </button>
          <a href="/admin/paketler" className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5">
            İptal
          </a>
        </div>
      </div>
    </form>
  );
}
