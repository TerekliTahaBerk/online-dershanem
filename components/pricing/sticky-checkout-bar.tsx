"use client";

import { useEffect, useState } from "react";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

type StickyCheckoutBarProps = {
  name?: string;
  category?: string;
  subject?: string;
  priceLabel?: string;
  packages?: Array<{
    name: string;
    category: string;
    subject: string;
    priceLabel: string;
  }>;
  note?: string;
};

/**
 * Referanstaki sticky bottom pricing bar. Aşağı kaydırınca belirir; seçili
 * paket özeti + "Satın al" CTA. Mobilde ekranı boğmayacak kompakt yükseklik.
 */
export function StickyCheckoutBar({ name, category, subject, priceLabel, packages, note }: StickyCheckoutBarProps) {
  const [visible, setVisible] = useState(false);
  const items =
    packages && packages.length > 0
      ? packages
      : name && category && subject && priceLabel
        ? [{ name, category, subject, priceLabel }]
        : [];

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const nearBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 160;
      setVisible(window.scrollY > 520 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!items.length) return null;

  const hasMultiple = items.length > 1;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-[transform,opacity] duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="border-t border-[var(--site-line)] bg-white/95 shadow-[0_-12px_35px_-28px_rgba(20,20,15,.4)] backdrop-blur-md">
        <div className="site-container flex items-center gap-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:gap-5 sm:py-4">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[15px] font-bold text-[var(--brand-orange-ink)] sm:flex">
            ₺
          </div>
          <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div className="truncate text-[13.5px] font-semibold text-[var(--site-ink)] sm:text-[15px]">
              {hasMultiple ? "LGS veya YKS paketini seç" : items[0].name}
            </div>
            <div className="truncate text-[12px] text-[var(--site-muted)] sm:text-[13px]">
              {items[0].priceLabel}
              {note ? ` · ${note}` : ""}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {items.map((item) => (
              <PurchaseFunnelTrigger
                key={`${item.category}-${item.subject}`}
                source={`pricing_sticky_bar_${item.category.toLowerCase()}`}
                packageName={item.name}
                category={item.category}
                subject={item.subject}
                priceLabel={item.priceLabel}
                paymentLink=""
                className="site-btn site-btn-primary px-4 py-3 text-[13px] sm:px-6 sm:text-[14px]"
              >
                {hasMultiple ? item.category : "Satın al"}
              </PurchaseFunnelTrigger>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
