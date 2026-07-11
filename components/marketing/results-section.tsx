import { Check, CreditCard, FileText, Route, Users } from "lucide-react";
import { lessonPackage } from "@/lib/pricing-content";

const resultCards = [
  {
    icon: Users,
    title: "Küçük grup avantajı",
    body: "En fazla 4 öğrenci",
  },
  {
    icon: Route,
    title: "Ders sonrası net yön",
    body: "Her dersten sonra çalışma hedefi",
  },
  {
    icon: FileText,
    title: "Veli için sade özet",
    body: "Ne işlendi, nerede zorlandı, sıradaki hedef",
  },
  {
    icon: CreditCard,
    title: "Güvenli ödeme",
    body: "PayTR, kart bilgisi paylaşılmaz",
  },
];

const comparison = [
  {
    title: "Birebir özel ders",
    items: ["1 öğrenci", "Genellikle daha yüksek maliyet", "Takip öğretmene göre değişir"],
  },
  {
    title: "Klasik online dershane",
    items: ["Kalabalık sınıf", "Genel tempo", "Ders sonrası takip sınırlı olabilir"],
  },
  {
    title: "Online Dershanem",
    featured: true,
    items: [
      "En fazla 4 öğrenci",
      lessonPackage.priceLabel.replace("/ay", " / ay"),
      "Her ders sonu net çalışma yönü",
      "Sade gelişim özeti",
      "Benzer seviye ve hedefe göre grup",
    ],
  },
];

export function ResultsSection() {
  return (
    <section className="bg-white">
      <div className="site-container py-24 sm:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <p className="site-eyebrow justify-center">Takip edilebilir model</p>
          <h2 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-[.98] text-[var(--site-ink)]">
            Matematikte farkı <span className="site-hl">takipte</span> görüyoruz.
          </h2>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {resultCards.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-[30px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--brand-orange-ink)] shadow-sm">
                <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-7 font-display text-[25px] leading-tight text-[var(--site-ink)]">{title}</h3>
              <p className="mt-3 text-[14.5px] leading-6 text-[var(--site-body)]">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-20 overflow-hidden rounded-[36px] border border-[var(--site-line)] bg-white shadow-[0_30px_70px_-56px_rgba(20,20,15,.35)]">
          <div className="border-b border-[var(--site-line)] bg-[var(--site-bg-warm)] px-7 py-6 sm:px-10">
            <h3 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight text-[var(--site-ink)]">
              Matematik desteğini karşılaştır.
            </h3>
          </div>
          <div className="grid gap-0 lg:grid-cols-3">
            {comparison.map((item, index) => (
              <article
                key={item.title}
                className={`p-7 sm:p-10 ${index ? "border-t border-[var(--site-line)] lg:border-l lg:border-t-0" : ""} ${
                  item.featured ? "bg-[var(--brand-orange-tint)]" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-display text-[26px] leading-tight text-[var(--site-ink)]">{item.title}</h4>
                  {item.featured ? (
                    <span className="rounded-full bg-[var(--brand-orange)] px-3 py-1 text-[11px] font-bold text-white">
                      Önerilen
                    </span>
                  ) : null}
                </div>
                <ul className="mt-7 space-y-4">
                  {item.items.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-[14.5px] leading-6 text-[var(--site-body)]">
                      <Check size={17} className="mt-1 shrink-0 text-[var(--brand-orange)]" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
