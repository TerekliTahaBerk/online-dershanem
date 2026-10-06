"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock, Loader2, Lock } from "lucide-react";
import type { PanelProduct, ProductPanelState } from "@/lib/auth/product-panels";

type ProductPanelBrand = {
  displayName: string;
  parentName?: string;
  logo: string;
  tone: "OD" | "YON" | "LEAGUE";
};

export type ProductPanelCardModel = {
  code: PanelProduct;
  name: string;
  brand: ProductPanelBrand;
  role: string;
  description: string;
  state: ProductPanelState;
  href: string;
  lastUsed: boolean;
  lockedCta: { href: string; label: string };
};

const STATE_BADGE: Record<ProductPanelState, { label: string; className: string }> = {
  ACTIVE: { label: "Aktif", className: "" },
  PILOT_CLOSED: { label: "Geçici olarak kapalı", className: "bg-dc-surface-muted text-dc-ink-muted" },
  PREPARING: { label: "Ödeme alındı · hazırlanıyor", className: "bg-amber-50 text-amber-800" },
  LOCKED: { label: "Paketin yok", className: "bg-dc-surface-muted text-dc-ink-muted" },
};

const BRAND_STYLE: Record<ProductPanelBrand["tone"], {
  surface: string;
  border: string;
  ring: string;
  badge: string;
  role: string;
  primary: string;
  secondary: string;
}> = {
  OD: {
    surface: "bg-[#edf8f4]",
    border: "border-dc-line",
    ring: "ring-dc-brand-strong",
    badge: "bg-dc-brand-soft text-dc-brand-deep",
    role: "text-dc-brand-strong",
    primary: "bg-dc-brand-strong hover:bg-dc-brand-hover",
    secondary: "border-dc-brand-strong text-dc-brand-strong hover:bg-dc-brand-soft",
  },
  YON: {
    surface: "bg-[#eff6ff]",
    border: "border-[#caddf8]",
    ring: "ring-[#0673f5]",
    badge: "bg-[#dcebff] text-[#0754c9]",
    role: "text-[#0754c9]",
    primary: "bg-[#0754c9] hover:bg-[#0644a2]",
    secondary: "border-[#0754c9] text-[#0754c9] hover:bg-[#eff6ff]",
  },
  LEAGUE: {
    surface: "bg-[#faf7ff]",
    border: "border-[#e3d5f2]",
    ring: "ring-[#6c35ac]",
    badge: "bg-[#eee5fa] text-[#573180]",
    role: "text-[#5b2599]",
    primary: "bg-[#5b2599] hover:bg-[#471d79]",
    secondary: "border-[#6c35ac] text-[#5b2599] hover:bg-[#faf7ff]",
  },
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
  const brand = BRAND_STYLE[card.brand.tone];

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
      className={`flex h-full w-full overflow-hidden rounded-2xl border bg-white ${
        card.state === "ACTIVE" ? `${brand.border} shadow-xs` : "border-dashed border-dc-line"
      } ${card.lastUsed && card.state === "ACTIVE" ? `ring-2 ${brand.ring}` : ""}`}
    >
      <div className="flex w-full flex-1 flex-col">
        <div className={`flex min-h-[104px] items-center gap-3.5 border-b px-5 py-4 ${brand.border} ${brand.surface}`}>
          <Image
            src={card.brand.logo}
            alt=""
            width={1254}
            height={1254}
            sizes="64px"
            className="h-16 w-16 shrink-0 rounded-[18px] object-cover shadow-sm"
          />
          <div className="min-w-0">
            {card.brand.parentName ? (
              <p className="text-[11px] font-bold leading-5 text-dc-ink-muted">{card.brand.parentName}</p>
            ) : null}
            <h2 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em] text-dc-ink">{card.brand.displayName}</h2>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${card.state === "ACTIVE" ? brand.badge : badge.className}`}>
              {badge.label}
            </span>
            {card.lastUsed && card.state === "ACTIVE" ? (
              <span className="rounded-full bg-dc-surface-muted px-2.5 py-1 text-[11.5px] font-semibold text-dc-ink-muted">Son kullandığın</span>
            ) : null}
          </div>
          <p className={`mt-4 text-[13px] font-bold ${brand.role}`}>{card.role}</p>
          <p className="mt-2 flex-1 text-[13.5px] leading-[1.6] text-dc-ink-muted">{card.description}</p>

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
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14.5px] font-bold text-white transition-colors ${brand.primary}`}
              >
                {pending ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                Panele gir
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            ) : card.state === "PREPARING" ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[12.5px] leading-normal text-amber-900">
                <Clock size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
                Çocuğunuzun öğrenci hesabını açıyoruz; ekibimiz sizi arayacak.
              </p>
            ) : card.state === "PILOT_CLOSED" ? (
              <p className="rounded-xl bg-dc-surface-muted px-3 py-2.5 text-[12.5px] text-dc-ink-muted">Bu panel kısa bir süre için erişime kapalı.</p>
            ) : (
              <Link
                href={card.lockedCta.href}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-bold transition-colors ${brand.secondary}`}
              >
                <Lock size={15} aria-hidden="true" />
                {card.lockedCta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
