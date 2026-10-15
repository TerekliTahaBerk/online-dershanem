"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers } from "lucide-react";
import {
  ResponsiveDataTable,
  ResponsiveDataTableBody,
  ResponsiveDataTableCell,
  ResponsiveDataTableHead,
  ResponsiveDataTableRow,
} from "@/components/panel/responsive-data-table";

type Row = { studentUserId: string; studentName: string | null; studentEmail: string; chosenBooklet: string | null; startedBooklet: string | null };
type Data = { codes: string[]; counts: Record<string, number>; rows: Row[] };

/**
 * Öğrenci başına kitapçık (çoklu kitapçıklı denemede). Varsayılan: deneme
 * başında en az kullanılan kitapçık. Yönetici, öğrenci başlamadan önce
 * kitapçığı seçebilir (yan yana oturan öğrenciler vb.); başlamış öğrencinin
 * kitapçığı değişmez.
 */
export function AdminBookletAssignmentPanel({ examId, canEdit }: { examId: string; canEdit: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/odk/admin/exams/${examId}/booklets/assignments`).catch(() => null);
    if (response?.ok) setData(await response.json());
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function choose(row: Row, value: string) {
    setBusy(row.studentUserId);
    setMessage(null);
    try {
      const response = await fetch(`/api/odk/admin/exams/${examId}/booklets/assignments`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentUserId: row.studentUserId, bookletCode: value || null }),
      });
      const result = await response.json().catch(() => ({}));
      setMessage(response.ok ? { text: `${row.studentName || row.studentEmail}: ${value ? `${value} kitapçığı` : "otomatik atama"}.`, error: false } : { text: result.error || "Kaydedilemedi.", error: true });
      await load();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı.", error: true });
    } finally {
      setBusy(null);
    }
  }

  if (!data || data.codes.length <= 1) return null;
  return (
    <section aria-labelledby="kitapcik-atama-baslik" className="rounded-[10px] border border-pn-border bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Layers size={18} aria-hidden="true" className="mt-0.5 text-pn-text-muted" />
        <div>
          <h2 id="kitapcik-atama-baslik" className="text-[15px] font-semibold text-pn-text">
            Kitapçık atamaları
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-pn-text-muted">
            Otomatik: öğrenci başlarken en az kullanılan kitapçık verilir. İsterseniz öğrenci başlamadan önce kitapçığını seçin. Başlayanlar: {data.codes.map((code) => `${code} ${data.counts[code] ?? 0}`).join(" · ")}
          </p>
        </div>
      </div>
      {message ? (
        <p role={message.error ? "alert" : "status"} className={`mt-3 rounded-md px-3 py-2 text-[13px] font-semibold ${message.error ? "bg-(--pd-pastel-blush-soft) text-(--pd-pastel-blush-ink)" : "bg-pn-surface-subtle text-pn-text"}`}>
          {message.text}
        </p>
      ) : null}
      {data.rows.length ? (
        <ResponsiveDataTable className="mt-4" minWidthClassName="lg:min-w-[520px]">
          <ResponsiveDataTableHead>
            <tr>
              <ResponsiveDataTableCell header label="Öğrenci">Öğrenci</ResponsiveDataTableCell>
              <ResponsiveDataTableCell header label="Kitapçık">Kitapçık</ResponsiveDataTableCell>
            </tr>
          </ResponsiveDataTableHead>
          <ResponsiveDataTableBody>
            {data.rows.slice(0, 200).map((row) => (
              <ResponsiveDataTableRow key={row.studentUserId}>
                <ResponsiveDataTableCell label="Öğrenci">
                  <strong>{row.studentName || "Öğrenci"}</strong>
                  <p className="text-[12px] text-pn-text-muted">{row.studentEmail}</p>
                </ResponsiveDataTableCell>
                <ResponsiveDataTableCell label="Kitapçık">
                  {row.startedBooklet ? (
                    <span>{row.startedBooklet} kitapçığı · başladı</span>
                  ) : (
                    <select
                      aria-label={`${row.studentName || row.studentEmail} kitapçığı`}
                      value={row.chosenBooklet ?? ""}
                      disabled={!canEdit || busy === row.studentUserId}
                      onChange={(event) => void choose(row, event.target.value)}
                      className="min-h-9 rounded-md border border-pn-border-strong bg-white px-2 text-[13.5px]"
                    >
                      <option value="">Otomatik</option>
                      {data.codes.map((code) => (
                        <option key={code} value={code}>
                          {code} kitapçığı
                        </option>
                      ))}
                    </select>
                  )}
                </ResponsiveDataTableCell>
              </ResponsiveDataTableRow>
            ))}
          </ResponsiveDataTableBody>
        </ResponsiveDataTable>
      ) : (
        <p className="mt-3 text-[13px] text-pn-text-muted">Henüz atanmış öğrenci yok.</p>
      )}
    </section>
  );
}
