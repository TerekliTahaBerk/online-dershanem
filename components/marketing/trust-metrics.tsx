import { ClipboardCheck, CreditCard, Users, Video } from "lucide-react";

const metrics = [
  { icon: Users, title: "En fazla 4 öğrenci", body: "Kalabalıkta kaybolmadan canlı ders" },
  { icon: Video, title: "Canlı matematik dersi", body: "LGS, TYT ve AYT seviyelerine uygun" },
  { icon: ClipboardCheck, title: "Ders sonrası çalışma yönü", body: "Her ders sonunda sıradaki adım netleşir" },
  { icon: CreditCard, title: "PayTR ile güvenli ödeme", body: "Kart bilgisi bizimle paylaşılmaz" },
];

export function TrustMetrics() {
  return (
    <section className="bg-white">
      <div className="site-container py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[var(--site-line)]">
          {metrics.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-center justify-center gap-4 px-5 text-center sm:min-h-20">
              <Icon size={30} strokeWidth={1.35} className="shrink-0 text-[var(--brand-orange)]" aria-hidden="true" />
              <div className="text-left">
                <h2 className="font-display text-[clamp(1.25rem,2.2vw,2rem)] leading-tight text-[var(--site-ink)]">{title}</h2>
                <p className="mt-1 text-[12.5px] text-[var(--site-body)] sm:text-[14px]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
