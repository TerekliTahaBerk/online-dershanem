import Link from "next/link";
import { Check } from "lucide-react";

type Plan = {
  key: string;
  name: string;
  tagline: string;
  price: string;
  unit: string;
  href: string;
  cta: string;
  highlight?: boolean;
  features: string[];
  note?: string;
};

const PLANS: Plan[] = [
  {
    key: "single",
    name: "Tek Ders",
    tagline: "İhtiyacın bir derste mi yoğunlaşıyor?",
    price: "₺1.990",
    unit: "/ ay",
    href: "/paketler/",
    cta: "Dersini seç",
    features: [
      "Haftada 1 canlı grup dersi (60 dk)",
      "Konuya özel soru bankası",
      "1 deneme + analiz / ay",
      "WhatsApp soru destek hattı",
    ],
  },
  {
    key: "multi",
    name: "Çoklu Paket",
    tagline: "Tam takipli, dengeli bir hazırlık.",
    price: "₺4.490",
    unit: "/ ay",
    href: "/paketler/",
    cta: "Hemen başla",
    highlight: true,
    features: [
      "3 derse kadar canlı grup dersi",
      "Tüm soru bankaları + video çözüm",
      "Haftalık deneme + konu analizi",
      "Bireysel haftalık çalışma planı",
      "Veli paneli & raporlar",
    ],
    note: "Öğrencilerimizin çoğunluğu burada.",
  },
  {
    key: "private",
    name: "Birebir Özel",
    tagline: "Tamamen sana göre bir tempo.",
    price: "₺6.990",
    unit: "/ ay",
    href: "/paketler/",
    cta: "Görüşme planla",
    features: [
      "Haftada 4 birebir özel ders",
      "Konu, soru ve plan dahil",
      "Hocanla doğrudan WhatsApp",
      "Haftalık veli toplantısı",
    ],
  },
];

export function HomePricing() {
  return (
    <section
      id="paketler-on-izleme"
      className="border-t border-[#E5E5E0] bg-[#F2F2EF] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5">
        <header className="mx-auto max-w-2xl text-center">
          <span className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[#7A7A7F]">
            Paketler
          </span>
          <h2 className="mt-3 font-display text-[32px] font-normal leading-[1.1] tracking-tight text-[#0E0E10] sm:text-[44px]">
            Sadece <em className="italic text-[#3A4A2C]">ihtiyacın</em> kadar.
          </h2>
          <p className="mt-4 text-[15.5px] leading-7 text-[#5A5A5F]">
            Toplu paket zorunluluğu yok. Bütçeni ve zamanını stratejik yönet,
            zayıf olduğun halkayı küçük grupta güçlendir.
          </p>
        </header>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => {
            const isFeatured = p.highlight;
            return (
              <article
                key={p.key}
                className={`relative flex flex-col rounded-3xl border p-7 sm:p-8 ${
                  isFeatured
                    ? "border-[#0E0E10] bg-white shadow-[0_24px_60px_-32px_rgba(14,14,16,0.32)]"
                    : "border-[#E5E5E0] bg-white"
                }`}
              >
                {isFeatured ? (
                  <span className="absolute -top-3 left-7 inline-flex items-center gap-1.5 rounded-full bg-[#0E0E10] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22A06B]" />
                    En çok seçilen
                  </span>
                ) : null}
                <h3 className="font-display text-[22px] font-normal text-[#0E0E10]">
                  {p.name}
                </h3>
                <p className="mt-1 text-[13.5px] text-[#7A7A7F]">{p.tagline}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-[40px] leading-none text-[#0E0E10]">
                    {p.price}
                  </span>
                  <span className="text-[13px] text-[#7A7A7F]">{p.unit}</span>
                </div>

                <ul className="mt-6 flex-1 space-y-3 text-[14px] text-[#0E0E10]">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        size={16}
                        strokeWidth={2}
                        className="mt-0.5 shrink-0 text-[#1E8C5C]"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {p.note ? (
                  <p className="mt-6 rounded-xl bg-[#F4F1E8] px-3 py-2 text-[12.5px] text-[#5A5A5F]">
                    {p.note}
                  </p>
                ) : null}

                <Link
                  href={p.href}
                  className={`mt-7 inline-flex items-center justify-center rounded-full px-5 py-3 text-[14px] font-medium transition ${
                    isFeatured
                      ? "bg-[#0E0E10] text-white hover:bg-[#1F1F23]"
                      : "border border-[#0E0E10]/15 bg-white text-[#0E0E10] hover:border-[#0E0E10]/35 hover:bg-[#F2F2EF]"
                  }`}
                >
                  {p.cta}
                </Link>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-[13.5px] text-[#7A7A7F]">
          Tüm paketler ilk hafta deneme günleriyle başlar. Memnun kalmazsan tek
          tıkla iade alırsın.
        </p>
      </div>
    </section>
  );
}
