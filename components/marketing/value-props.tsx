import { CreditCard, FileCheck2, Layers3, Users } from "lucide-react";
import { valueProps } from "@/lib/site-content";

const features = [
  {
    icon: Users,
    label: "Küçük grup",
    title: "Öğrenci kalabalıkta kaybolmaz.",
    body: "En fazla 4 kişilik gruplarda öğretmen her öğrenciyi takip eder.",
  },
  {
    icon: FileCheck2,
    label: "Ders sonrası takip",
    title: "Ne çalışacağını bilerek çıkar.",
    body: "Her dersin sonunda konu, ödev ve tekrar yönü netleşir.",
  },
  {
    icon: Layers3,
    label: "Seviyeye göre plan",
    title: "Ders tam takıldığı yerden başlar.",
    body: "Önce öğrencinin seviyesini ve hedefini anlarız.",
  },
  {
    icon: CreditCard,
    label: "Güvenli ödeme",
    title: "PayTR ile güvenle başla.",
    body: "Kart bilgileriniz bizimle paylaşılmaz.",
  },
];

export function ValueProps() {
  return (
    <section className="bg-white">
      <div className="site-container py-24 sm:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <p className="site-eyebrow justify-center">{valueProps.eyebrow}</p>
          <h2 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[.98] text-[var(--site-ink)]">
            Dersi anlatıp <span className="site-hl">bırakmıyoruz.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-[16px] leading-7 text-[var(--site-body)] sm:text-[18px]">
            {valueProps.subtitle}
          </p>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          {features.map(({ icon: Icon, label, title, body }, index) => (
            <article
              key={title}
              className={`min-h-[320px] overflow-hidden rounded-[34px] border border-[var(--site-line)] p-8 sm:p-10 ${
                index === 0 || index === 3 ? "bg-[var(--site-bg-warm)]" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-[var(--brand-orange-soft)] px-4 py-2 text-[12px] font-bold text-[var(--brand-orange-ink)]">
                  {label}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--brand-orange-ink)] shadow-sm">
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-10 max-w-lg font-display text-[clamp(2rem,4vw,3.5rem)] leading-[1.02] text-[var(--site-ink)]">
                {title}
              </h3>
              <p className="mt-5 max-w-md text-[15.5px] leading-7 text-[var(--site-body)]">{body}</p>
              <div className="mt-10 grid grid-cols-3 gap-2" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, itemIndex) => (
                  <span
                    key={itemIndex}
                    className={`h-3 rounded-full ${itemIndex <= index + 1 ? "bg-[var(--brand-orange)]" : "bg-[var(--site-line)]"}`}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
