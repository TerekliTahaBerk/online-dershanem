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
        {start?.href && <Link href={start.href} className="site-btn site-btn-primary">Takvimimi gör</Link>}
        <Link href="/iletisim" className="site-btn site-btn-secondary">Bize ulaş</Link>
      </div>
    </section>
  );
}
