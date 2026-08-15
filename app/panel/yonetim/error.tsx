"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[var(--site-bg-warm)] px-4 py-12">
      <section className="w-full max-w-[520px] rounded-[14px] border border-[var(--site-line)] bg-white p-7 text-center shadow-[var(--panel-card-shadow)] sm:p-9" role="alert">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle size={22} aria-hidden="true" /></span>
        <h1 className="mt-5 text-xl font-extrabold text-[var(--site-ink)]">Bu bölüm şu an açılamadı</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--site-muted)]">Bilgileriniz güvende. Bağlantı kısa süreli kesilmiş olabilir; sayfayı yeniden deneyebilirsiniz.</p>
        <button type="button" onClick={reset} className="site-btn site-btn-primary mt-6 inline-flex items-center gap-2"><RefreshCw size={15} aria-hidden="true" />Yeniden dene</button>
      </section>
    </main>
  );
}
