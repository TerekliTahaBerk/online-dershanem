import Link from "next/link";
import type { OdCustomerStart } from "@/lib/od/onboarding-customer";

export function OdStartCard({ start }: { start: OdCustomerStart | null }) {
  return (
    <section aria-labelledby="od-start-title" className="mb-6 rounded-2xl border border-dc-line bg-white p-5">
      <h2 id="od-start-title" className="text-lg font-bold text-dc-ink">Başlangıç</h2>
      <p className="mt-2 font-semibold text-dc-ink">{start?.title ?? "Hesabınız hazır"}</p>
      <p className="mt-2 text-sm leading-6 text-dc-ink-muted">{start?.nextStep ?? "Ekibimiz öğrenci ve paket bilgilerinizi tamamladığında ders ve takip bilgileriniz burada görünecek."}</p>
      <p className="mt-2 text-sm text-dc-ink-muted">{start?.estimatedTime ?? "Başlangıç zamanını ekibimiz sizinle paylaşacak."}</p>
      {!!start?.timePreferences.length && <p className="mt-3 text-sm text-dc-ink-muted">Saat tercihiniz: {start.timePreferences.join(" · ")}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {start?.href && <Link href={start.href} className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]">Takvimimi gör</Link>}
        <Link href="/iletisim" className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px]">Bize ulaş</Link>
      </div>
    </section>
  );
}
