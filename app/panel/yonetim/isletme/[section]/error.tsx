"use client";
export default function BusinessSectionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6"><h2 className="font-extrabold text-rose-950">Bu bölüm şu anda yüklenemedi.</h2><p className="mt-2 text-sm text-rose-900">Teknik ayrıntı kayıtlara alındı. Biraz sonra yeniden deneyebilirsiniz.</p><button onClick={reset} className="mt-4 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold">Yeniden dene</button></section>;
}
