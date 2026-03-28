"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Check, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

type CampCategoryKey = "AYT" | "TYT" | "LGS";

type Camp = {
  name: string;
  detail: string;
  quota: 1 | 2 | 3;
};

const campPaymentLink = "https://www.paytr.com/link/dQECKnq";
const oldPrice = "₺5.000,00";
const discountedPrice = "₺2.000,00";

const campData: Record<CampCategoryKey, Camp[]> = {
  AYT: [
    {
      name: "AYT Belirleyici Konular Kampı",
      detail: "Trigonometri, Türev, Limit ve Logaritma konularında net artıran yoğun tekrar.",
      quota: 1
    },
    {
      name: "Fonksiyon ve Polinom Kampı",
      detail: "Fonksiyonlar, Polinomlar, ikinci dereceden denklemler ve eşitsizlikler odağında sistemli çalışma.",
      quota: 3
    },
    {
      name: "AYT Geometri Ana Kampı",
      detail: "Çember-daire, analitik ve katı cisimlerde kritik soru tiplerine odaklı ilerleme.",
      quota: 2
    }
  ],
  TYT: [
    {
      name: "Problemler Kampı",
      detail: "Problemlerde hızlı model kurma, çözüm stratejileri ve süre yönetimi.",
      quota: 2
    },
    {
      name: "Fonksiyon ve Grafik Kampı",
      detail: "Fonksiyonlar ve grafik yorumlama ile TYT matematikte temel okuma gücünü artırma.",
      quota: 1
    }
  ],
  LGS: [
    {
      name: "Yeni Nesil Sorular Kampı",
      detail: "Problem çözme, mantık ve çok adımlı sorularda yeni nesil yaklaşım.",
      quota: 3
    },
    {
      name: "Geometri Kampı",
      detail: "Üçgenler, eşlik-benzerlik ve dönüşüm geometrisinde temel + hız çalışması.",
      quota: 2
    },
    {
      name: "Açılar ve Üçgenler Kampı",
      detail: "Temel kavramları sağlamlaştıran ve soru çözüm refleksi kazandıran odak çalışma.",
      quota: 1
    }
  ]
};

const sharedFeatures = ["8 Kişilik Sınıf Yapısı", "Konu Bazlı Mini Deneme", "Soru Çözüm Seansı"];

export function CampsPreviewSection() {
  const [activeCategory, setActiveCategory] = useState<CampCategoryKey>("AYT");
  const camps = useMemo(() => campData[activeCategory], [activeCategory]);

  return (
    <section id="ana-sayfa-kamplar" className="scroll-mt-24 py-12 sm:py-14">
      <Container>
        <div className="rounded-3xl border border-line bg-gradient-to-b from-white to-mint/40 p-5 shadow-soft sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Kamplar</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Net Artıran Kamp Programlarıyla Sınava Avantajlı Başla
              </h2>
            </div>
            <Link
              href="/kamplar/"
              className="inline-flex rounded-full border border-line-strong bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
            >
              Tüm Kampları Gör
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["AYT", "TYT", "LGS"] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeCategory === category ? "bg-anchor text-white" : "border border-line-strong bg-white text-ink hover:bg-soft"
                }`}
              >
                {category} Kampları
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeCategory}
              className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {camps.map((camp) => (
                <motion.article
                  key={camp.name}
                  className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 transition duration-300 hover:-translate-y-1 hover:shadow-soft"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-[11px] font-semibold text-ink">
                      <Users className="h-3.5 w-3.5 text-brand" /> Max 8
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      Kontenjan: {camp.quota}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-ink">{camp.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{camp.detail}</p>

                  <ul className="mt-3 space-y-1.5 text-xs text-muted">
                    {sharedFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 rounded-xl border border-line bg-soft p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">Kamp Fiyatı</p>
                    <p className="mt-1 text-xs font-medium text-muted line-through">{oldPrice}</p>
                    <p className="mt-1 text-xl font-bold text-anchor">{discountedPrice}</p>
                  </div>

                  <PurchaseFunnelTrigger
                    source={`home_camp_${activeCategory}_${camp.name}_purchase`}
                    packageName={`${camp.name} Kampı`}
                    paymentLink={campPaymentLink}
                    className="mt-4 inline-flex w-fit rounded-full bg-anchor px-4 py-2 text-xs font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-pine"
                    analyticsId={`home_camp_${activeCategory}_${camp.name}_purchase`}
                  >
                    <BadgeCheck className="mr-1.5 h-3.5 w-3.5" /> {discountedPrice} ile Katıl
                  </PurchaseFunnelTrigger>
                </motion.article>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}
