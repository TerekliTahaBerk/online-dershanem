"use client";

import { useEffect, useState } from "react";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

type StickyCheckoutBarProps = {
  name: string;
  category: string;
  subject: string;
  priceLabel: string;
  note?: string;
};

/**
 * Referanstaki sticky bottom pricing bar. Aşağı kaydırınca belirir; seçili
 * paket özeti + "Sepete Ekle" CTA. Mobilde ekranı boğmayacak kompakt yükseklik.
 */
export function StickyCheckoutBar({ name, category, subject, priceLabel, note }: StickyCheckoutBarProps) {
  const [visible, setVisible] = useState(false);

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

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-[transform,opacity] duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="site-container pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--site-line)] bg-white/95 p-2.5 shadow-[0_20px_50px_-20px_rgba(20,20,15,0.35)] backdrop-blur-md sm:gap-4 sm:p-3.5">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[15px] font-bold text-[var(--brand-orange-ink)] sm:flex">
            ₺
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-[var(--site-ink)] sm:text-[15px]">{name}</div>
            <div className="truncate text-[12px] text-[var(--site-muted)] sm:text-[13px]">
              {priceLabel}
              {note ? ` · ${note}` : ""}
            </div>
          </div>
          <PurchaseFunnelTrigger
            source="pricing_sticky_bar"
            packageName={name}
            category={category}
            subject={subject}
            priceLabel={priceLabel}
            paymentLink=""
            className="site-btn site-btn-primary shrink-0 px-5 py-3 text-[14px] sm:px-7"
          >
            Sepete Ekle
          </PurchaseFunnelTrigger>
        </div>
      </div>
    </div>
  );
}
