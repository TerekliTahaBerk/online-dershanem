"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/panel/primitives";
import type { ExamSessionPlan } from "@/lib/odk/exam-sessions";

const INPUT =
  "min-h-9 w-24 rounded-md border border-pn-border-strong bg-white px-2 text-[14px] tabular-nums text-pn-text disabled:bg-pn-surface-subtle disabled:text-pn-text-muted";

/**
 * Oturumlar sekmesi (§15.2, LGS): Sözel → ara → Sayısal süreleri. Oturum
 * anahtarları ve bölüm dağılımı şablondan gelir; yalnız süre ve ara
 * düzenlenir, yalnız taslak sürümde. Sunucu (`PUT …/sessions`) aynı kuralı
 * doğrular.
 */
export function AdminSessionPlan({
  examId,
  plan,
  sectionTitles,
  editable,
}: {
  examId: string;
  plan: ExamSessionPlan;
  sectionTitles: Record<string, string>;
  editable: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(plan.map((item) => ({ key: item.key, durationMinutes: item.durationMinutes, breakAfterMinutes: item.breakAfterMinutes })));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const total = rows.reduce((sum, row, index) => sum + row.durationMinutes + (index < rows.length - 1 ? row.breakAfterMinutes : 0), 0);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/odk/admin/exams/${examId}/sessions`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessions: rows }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage({ text: result.error || "Oturum planı kaydedilemedi.", error: true });
      setMessage({ text: "Oturum planı kaydedildi.", error: false });
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. Plan kaydedilmedi; tekrar deneyin.", error: true });
    } finally {
      setBusy(false);
    }
  }

  const patch = (index: number, field: "durationMinutes" | "breakAfterMinutes", value: number) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  return (
    <form onSubmit={(event) => void save(event)} className="space-y-4">
      <ol className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
        {plan.map((item, index) => (
          <li key={item.key} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-pn-text">
                {index + 1}. {item.title} oturumu
              </p>
              <p className="mt-0.5 text-[13px] text-pn-text-muted">{item.sectionCodes.map((code) => sectionTitles[code] ?? code).join(" · ")}</p>
            </div>
            <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-muted">
              Süre (dk)
              <input
                type="number"
                min={5}
                max={240}
                required
                disabled={!editable}
                value={rows[index]!.durationMinutes}
                onChange={(event) => patch(index, "durationMinutes", Number(event.target.value))}
                aria-label={`${item.title} oturumu süresi (dakika)`}
                className={INPUT}
              />
            </label>
            {index < plan.length - 1 ? (
              <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-muted">
                Sonraki ara (dk)
                <input
                  type="number"
                  min={0}
                  max={120}
                  required
                  disabled={!editable}
                  value={rows[index]!.breakAfterMinutes}
                  onChange={(event) => patch(index, "breakAfterMinutes", Number(event.target.value))}
                  aria-label={`${item.title} sonrası ara (dakika)`}
                  className={INPUT}
                />
              </label>
            ) : (
              <span className="text-[12.5px] text-pn-text-muted sm:pb-2">Son oturum · teslimle kapanır</span>
            )}
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-pn-text-secondary">
        En uzun toplam süre: <strong className="tabular-nums text-pn-text">{total} dk</strong> (aralar dahil). Öğrenci bir oturumu erken bitirirse ara hemen
        başlar ve takvim öne çekilir.
      </p>
      {message ? (
        <p role={message.error ? "alert" : "status"} className={`text-[13px] font-medium ${message.error ? "text-(--pn-tone-critical)" : "text-(--pn-tone-success)"}`}>
          {message.text}
        </p>
      ) : null}
      {editable ? (
        <button disabled={busy} className={buttonClass("primary", "md")}>
          Oturum planını kaydet
        </button>
      ) : (
        <p className="text-[13px] text-pn-text-muted">Sürüm kilitli; oturum planı değiştirilemez.</p>
      )}
    </form>
  );
}
