"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MessageCircleMore, PhoneCall, X } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { contact, packageFilters, pricing } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { ContactLink } from "@/components/ui/contact-link";

type Plan = (typeof pricing)[number];
type FilterKey = (typeof packageFilters)[number]["key"];

function getWhatsappLink(planTitle: string) {
  const text = encodeURIComponent(`Merhaba, ${planTitle} hakkında detaylı bilgi almak istiyorum.`);
  return `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}?text=${text}`;
}

export function PricingSection() {
  const [activePlanTitle, setActivePlanTitle] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");

  useEffect(() => {
    const applyFilterFromUrl = () => {
      const filterFromQuery = new URLSearchParams(window.location.search).get("program")?.toUpperCase() as FilterKey | undefined;
      if (!filterFromQuery) return;
      const validFilter = packageFilters.some((filter) => filter.key === filterFromQuery);
      if (validFilter) setActiveFilter(filterFromQuery);
    };

    const onProgramFilterChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ filterKey?: string }>;
      const filterKey = customEvent.detail?.filterKey?.toUpperCase() as FilterKey | undefined;
      if (!filterKey) return;
      const validFilter = packageFilters.some((filter) => filter.key === filterKey);
      if (validFilter) setActiveFilter(filterKey);
    };

    applyFilterFromUrl();
    window.addEventListener("program-filter-change", onProgramFilterChange as EventListener);
    window.addEventListener("popstate", applyFilterFromUrl);

    return () => {
      window.removeEventListener("program-filter-change", onProgramFilterChange as EventListener);
      window.removeEventListener("popstate", applyFilterFromUrl);
    };
  }, []);

  const filteredPlans = useMemo(() => {
    if (activeFilter === "ALL") {
      return pricing;
    }
    return pricing.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const activePlan = useMemo(() => pricing.find((item) => item.title === activePlanTitle) ?? null, [activePlanTitle]);
  const smartPlan = useMemo(
    () => activePlan ?? filteredPlans.find((item) => item.featured) ?? filteredPlans[0] ?? pricing[0],
    [activePlan, filteredPlans]
  );

  return (
    <section id="paketler" className="scroll-mt-24 py-16 sm:py-20">
      <Container>
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Program Paketleri</h2>
          <p className="mt-3 max-w-3xl text-muted">
            Hedefine göre filtrele, paketin içeriğini aç ve haftalık planı gör. Böylece karar verirken sadece başlığa değil, gerçek
            programa bakmış olursun.
          </p>
        </FadeIn>

        <div className="mt-6 flex flex-wrap gap-2">
          {packageFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeFilter === filter.key
                  ? "bg-anchor text-white"
                  : "border border-line-strong bg-white text-ink hover:bg-soft"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="md:hidden">
              <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
                {filteredPlans.map((plan, i) => (
                  <div key={plan.title} className="min-w-[86%] snap-start">
                    <FadeIn delay={i * 0.05}>
                      <PlanCard plan={plan} onOpenDetail={() => setActivePlanTitle(plan.title)} />
                    </FadeIn>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden gap-5 md:grid md:grid-cols-2 xl:grid-cols-3">
              {filteredPlans.map((plan, i) => (
                <FadeIn key={plan.title} delay={i * 0.06}>
                  <PlanCard plan={plan} onOpenDetail={() => setActivePlanTitle(plan.title)} />
                </FadeIn>
              ))}
            </div>

            <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold text-ink">Tüm paketleri tek sayfada görmek ister misin?</p>
              <Link
                href="/paketler/"
                className="mt-3 inline-flex rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
              >
                Paket Sayfasına Git
              </Link>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold text-ink">Bu Paket İçin İletişim</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Şu an seçili paket: <span className="font-semibold text-ink">{smartPlan.title}</span>. Bu paketle ilgili doğrudan
                bilgi alabilirsin.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <ContactLink
                  href={`tel:${contact.phone}`}
                  channel="phone"
                  placement={`pricing_${smartPlan.title}`}
                  className="inline-flex items-center justify-center rounded-xl bg-anchor px-4 py-2 text-xs font-semibold text-white transition hover:bg-pine"
                >
                  <PhoneCall className="mr-2 h-3.5 w-3.5" /> {smartPlan.title} İçin Ara
                </ContactLink>
                <ContactLink
                  href={getWhatsappLink(smartPlan.title)}
                  channel="whatsapp"
                  placement={`pricing_${smartPlan.title}`}
                  className="inline-flex items-center justify-center rounded-xl border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
                >
                  <MessageCircleMore className="mr-2 h-3.5 w-3.5" /> {smartPlan.title} İçin WhatsApp
                </ContactLink>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <AnimatePresence>{activePlan ? <PlanModal plan={activePlan} onClose={() => setActivePlanTitle(null)} /> : null}</AnimatePresence>
    </section>
  );
}

function PlanCard({ plan, onOpenDetail }: { plan: Plan; onOpenDetail: () => void }) {
  return (
    <article
      className={`relative h-full rounded-3xl border p-6 shadow-soft ${
        plan.featured ? "border-brand bg-gradient-to-b from-mint to-white" : "border-line bg-white"
      }`}
    >
      {plan.featured ? (
        <div className="absolute -top-3 left-5 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">En Popüler</div>
      ) : null}

      <h3 className="text-lg font-semibold text-ink">{plan.title}</h3>
      <p className="mt-2 text-2xl font-bold text-ink">{plan.price}</p>
      <p className="mt-2 inline-flex rounded-full bg-mint px-3 py-1 text-xs font-semibold text-pine">{plan.quota}</p>
      <p className="mt-2 text-xs text-muted">{plan.audience}</p>
      <p className="mt-1 text-xs font-medium text-muted/70">{plan.seats}</p>

      <ul className="mt-5 space-y-2 text-sm text-muted">
        {plan.features.slice(0, 3).map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-brand" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <details className="mt-5 rounded-2xl border border-line bg-soft p-3">
        <summary className="cursor-pointer text-xs font-semibold text-ink">Haftalık Planı Gör</summary>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
          {plan.weeklyPlan.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </details>

      <div className="mt-5 flex flex-wrap gap-2">
        <ContactLink
          href={`tel:${contact.phone}`}
          channel="phone"
          placement={`plan_card_${plan.title}`}
          className="inline-flex items-center rounded-full bg-anchor px-4 py-2 text-xs font-semibold text-white"
        >
          <PhoneCall className="mr-2 h-3.5 w-3.5" /> Ara
        </ContactLink>
        <ContactLink
          href={getWhatsappLink(plan.title)}
          channel="whatsapp"
          placement={`plan_card_${plan.title}`}
          className="inline-flex items-center rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink"
        >
          <MessageCircleMore className="mr-2 h-3.5 w-3.5" /> WhatsApp
        </ContactLink>
      </div>

      <motion.button
        onClick={onOpenDetail}
        className="mt-4 inline-flex rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        Paketi Aç
      </motion.button>
    </article>
  );
}

function PlanModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-anchor/35 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-2xl rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted/70">Paket İçeriği</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-ink">{plan.title}</h3>
            <p className="mt-1 text-lg font-semibold text-ink">{plan.price}</p>
            <p className="mt-2 inline-flex rounded-full bg-mint px-3 py-1 text-xs font-semibold text-pine">{plan.quota}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-line p-2 text-muted/70 transition hover:bg-soft" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm text-muted">{plan.audience}</p>
        <p className="mt-1 text-xs text-muted/70">{plan.seats}</p>

        <ul className="mt-5 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted">
              <Check className="mt-0.5 h-4 w-4 text-brand" />
              {feature}
            </li>
          ))}
        </ul>

        <details className="mt-5 rounded-2xl border border-line bg-soft p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Haftalık Planı Gör</summary>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {plan.weeklyPlan.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </details>

        <div className="mt-7 flex flex-wrap gap-2">
          <ContactLink
            href={`tel:${contact.phone}`}
            channel="phone"
            placement={`plan_modal_${plan.title}`}
            className="inline-flex items-center rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white"
          >
            <PhoneCall className="mr-2 h-4 w-4" /> {plan.title} İçin Ara
          </ContactLink>
          <ContactLink
            href={getWhatsappLink(plan.title)}
            channel="whatsapp"
            placement={`plan_modal_${plan.title}`}
            className="inline-flex items-center rounded-full border border-line-strong px-5 py-2.5 text-xs font-semibold text-ink"
          >
            <MessageCircleMore className="mr-2 h-4 w-4" /> {plan.title} İçin WhatsApp
          </ContactLink>
        </div>
      </motion.div>
    </motion.div>
  );
}
