"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock, Loader2, Lock } from "lucide-react";
import type { PanelProduct, ProductPanelState } from "@/lib/auth/product-panels";

export type ProductPanelCardModel = {
  code: PanelProduct;
  name: string;
  role: string;
  description: string;
  state: ProductPanelState;
  href: string;
  lastUsed: boolean;
  lockedCta: { href: string; label: string };
};

const STATE_BADGE: Record<ProductPanelState, { label: string; className: string }> = {
  ACTIVE: { label: "Aktif", className: "bg-dc-brand-soft text-dc-brand-deep" },
  PILOT_CLOSED: { label: "Geçici olarak kapalı", className: "bg-dc-surface-muted text-dc-ink-muted" },
  PREPARING: { label: "Ödeme alındı · hazırlanıyor", className: "bg-amber-50 text-amber-800" },
  LOCKED: { label: "Paketin yok", className: "bg-dc-surface-muted text-dc-ink-muted" },
};

/**
 * Ürün paneli kartı. "Panele gir" bir BAĞLANTIDIR (JS yoksa da panele gider);
 * JS varken önce seçimi oturuma yazar, sonra gider. Böylece menü kapsamı
 * seçilen ürüne göre açılır.
 */
export function ProductPanelCard({ card }: { card: ProductPanelCardModel }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const badge = STATE_BADGE[card.state];

  async function enter(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/panel/active-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: card.code }),
      });
      const data = (await response.json().catch(() => ({}))) as { redirect?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Panel açılamadı.");
      window.location.assign(data.redirect ?? card.href);
    } catch (caught) {
      setPending(false);
      setError(caught instanceof Error ? caught.message : "Bağlantı kurulamadı.");
    }
  }

  return (
    <article
      className={`flex w-full flex-col rounded-2xl border bg-white p-5 ${
        card.state === "ACTIVE" ? "border-dc-line shadow-sm" : "border-dashed border-dc-line"
      } ${card.lastUsed && card.state === "ACTIVE" ? "ring-2 ring-dc-brand-strong" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${badge.className}`}>{badge.label}</span>
        {card.lastUsed && card.state === "ACTIVE" ? (
          <span className="rounded-full bg-dc-surface-muted px-2.5 py-1 text-[11.5px] font-semibold text-dc-ink-muted">Son kullandığın</span>
        ) : null}
      </div>
      <h2 className="mt-4 text-[19px] font-extrabold tracking-[-0.01em] text-dc-ink">{card.name}</h2>
      <p className="mt-1 text-[13px] font-semibold text-dc-brand-strong">{card.role}</p>
      <p className="mt-3 flex-1 text-[13.5px] leading-[1.6] text-dc-ink-muted">{card.description}</p>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="mt-5">
        {card.state === "ACTIVE" ? (
          <a
            href={card.href}
            onClick={enter}
            aria-label={`${card.name} paneline git`}
            aria-busy={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-dc-brand-strong px-4 py-3 text-[14.5px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
          >
            {pending ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            Panele gir
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        ) : card.state === "PREPARING" ? (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[12.5px] leading-[1.5] text-amber-900">
            <Clock size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            Çocuğunuzun öğrenci hesabını açıyoruz; ekibimiz sizi arayacak.
          </p>
        ) : card.state === "PILOT_CLOSED" ? (
          <p className="rounded-xl bg-dc-surface-muted px-3 py-2.5 text-[12.5px] text-dc-ink-muted">Bu panel kısa bir süre için erişime kapalı.</p>
        ) : (
          <Link
            href={card.lockedCta.href}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dc-brand-strong px-4 py-3 text-[14px] font-bold text-dc-brand-strong transition-colors hover:bg-dc-brand-soft"
          >
            <Lock size={15} aria-hidden="true" />
            {card.lockedCta.label}
          </Link>
        )}
      </div>
    </article>
  );
}
