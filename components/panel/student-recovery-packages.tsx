"use client";

import { useState } from "react";
import { Check, ExternalLink, PackageCheck } from "lucide-react";

type Row = {
  id: string;
  status: "PUBLISHED" | "COMPLETED";
  lessonTitle: string;
  lessonDate: string;
  summaryTopic: string;
  sharedNote: string | null;
  summaryNextStep: string;
  checkpointPrompt: string;
  checkpointResponse: "NOT_YET" | "NEED_HELP" | "READY" | null;
  dueAt: string;
  outcomeTitles: string[];
  items: { id: string; kind: "MATERIAL" | "ASSIGNMENT"; title: string; completed: boolean; href: string | null }[];
};

export function StudentRecoveryPackages({ rows }: { rows: Row[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function completeItem(packageId: string, itemId: string) {
    setBusy(itemId);
    const response = await fetch(`/api/panel/recovery-packages/${packageId}/items/${itemId}/complete`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Adım kaydedilemedi.");
      setBusy(null);
      return;
    }
    window.location.reload();
  }
  async function checkpoint(packageId: string, responseValue: "NOT_YET" | "NEED_HELP" | "READY") {
    setBusy(packageId);
    const response = await fetch(`/api/panel/recovery-packages/${packageId}/checkpoint`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: responseValue }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Mini kontrol kaydedilemedi.");
      setBusy(null);
      return;
    }
    window.location.reload();
  }

  return (
    <div>
      <p aria-live="polite" className="mb-4 text-sm font-bold text-[var(--brand-olive)]">
        {message}
      </p>
      <div className="space-y-4">
        {rows.map((row) => {
          const materials = row.items.filter((item) => item.kind === "MATERIAL");
          const assignments = row.items.filter((item) => item.kind === "ASSIGNMENT");
          return (
            <article key={row.id} className="panel-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.06em] text-[var(--brand-olive)]">
                    {new Date(row.lessonDate).toLocaleDateString("tr-TR")} · {row.lessonTitle}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">Bu dersi kaçırdın</h2>
                  <p className="mt-1 text-sm text-[var(--site-muted)]">25 dakikada toparlayabilirsin</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${row.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-[#fff4cc] text-amber-900"}`}>
                  {row.status === "COMPLETED" ? "Telafi tamamlandı" : "Küçük adımlar hazır"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <section className="rounded-2xl border border-[var(--site-line)] p-4">
                  <p className="text-xs font-extrabold text-[var(--brand-olive)]">1. Konuyu gözden geçir</p>
                  <p className="mt-2 text-sm font-bold">{row.summaryTopic}</p>
                  {row.sharedNote ? <p className="mt-2 text-sm leading-6">{row.sharedNote}</p> : null}
                  {row.outcomeTitles.length ? <p className="mt-2 text-xs text-[var(--site-muted)]">Kazanımlar: {row.outcomeTitles.join(" · ")}</p> : null}
                </section>

                <section className="rounded-2xl border border-[var(--site-line)] p-4">
                  <p className="text-xs font-extrabold text-[var(--brand-olive)]">2. Materyali Aç</p>
                  {materials.length ? (
                    <div className="mt-3 space-y-2">
                      {materials.map((item) => (
                        <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-bold">{item.title}</p>
                          <div className="flex gap-2">
                            {item.href ? <a href={item.href} target="_blank" rel="noreferrer" className="panel-quick-action">Materyali Aç <ExternalLink size={13} /></a> : <span className="text-xs text-[var(--site-muted)]">Materyal artık aktif değil</span>}
                            {row.status === "PUBLISHED" ? <button type="button" disabled={busy !== null || item.completed} onClick={() => completeItem(row.id, item.id)} className="panel-quick-action">{item.completed ? "İşaretlendi" : "Açtım"} {item.completed ? <Check size={13} /> : null}</button> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--site-muted)]">Bu ders için aktif materyal yok.</p>
                  )}
                </section>

                <section className="rounded-2xl border border-[var(--site-line)] p-4">
                  <p className="text-xs font-extrabold text-[var(--brand-olive)]">3. Küçük çalışmayı tamamla</p>
                  <p className="mt-2 text-sm leading-6">{row.summaryNextStep}</p>
                  {assignments.length ? (
                    <div className="mt-3 space-y-2">
                      {assignments.map((item) => (
                        <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-bold">{item.title}</p>
                          <div className="flex gap-2">
                            {item.href ? <a href={item.href} className="panel-quick-action">Çalışmayı Aç <ExternalLink size={13} /></a> : <span className="text-xs text-[var(--site-muted)]">Çalışma artık aktif değil</span>}
                            {row.status === "PUBLISHED" ? <button type="button" disabled={busy !== null || item.completed} onClick={() => completeItem(row.id, item.id)} className="panel-quick-action">{item.completed ? "İşaretlendi" : "Tamamladım"} {item.completed ? <Check size={13} /> : null}</button> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              </div>

              <div className="mt-5 border-t border-[var(--site-line)] pt-5">
                <p className="text-sm font-extrabold">Mini kontrol</p>
                <p className="mt-1 text-sm leading-6 text-[var(--site-body)]">{row.checkpointPrompt}</p>
                {row.status === "PUBLISHED" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busy !== null} onClick={() => checkpoint(row.id, "NOT_YET")} className="panel-quick-action">Henüz değil</button>
                    <button type="button" disabled={busy !== null} onClick={() => checkpoint(row.id, "NEED_HELP")} className="panel-quick-action">Bir örnek daha gerekli</button>
                    <button type="button" disabled={busy !== null} onClick={() => checkpoint(row.id, "READY")} className="panel-quick-action panel-quick-action-primary">Tamamladım</button>
                    <a href="/panel/ogrenci/check-in" className="panel-quick-action">Takıldım / Yardım iste</a>
                  </div>
                ) : <p className="mt-2 text-xs font-bold text-emerald-700">Yanıtın kaydedildi; tüm küçük adımlar tamamlandı.</p>}
                <p className="mt-3 text-[11px] text-[var(--site-muted)]">72 saat hedefi: {new Date(row.dueAt).toLocaleString("tr-TR")}.</p>
              </div>
            </article>
          );
        })}
        {!rows.length ? (
          <div className="panel-surface p-10 text-center">
            <PackageCheck className="mx-auto text-[var(--site-muted)]" />
            <p className="mt-3 text-sm font-bold">Yayınlanmış telafi paketin yok.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
