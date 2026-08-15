"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

/**
 * Header'daki sepet göstergesi.
 *
 * Sepet localStorage'da yaşıyor ama siteye dönüş yolu YOKTU: kullanıcı bir
 * paket ekleyip başka sayfaya geçtiğinde `/sepet`'e ancak URL'yi elle yazarak
 * dönebiliyordu (eski `cart-fab` layout'tan sökülmüş). Bu bileşen o yolu
 * geri veriyor.
 *
 * Sepet boşken hiçbir şey basmaz — tasarımın sade navbar'ını boş bir ikonla
 * kalabalıklaştırmamak için. `hydrated` beklenmezse sunucu HTML'i ile
 * istemci ilk render'ı ayrışır (hydration uyarısı).
 */
export function CartHeaderLink({ className = "" }: { className?: string }) {
  const { count, hydrated } = useCart();

  if (!hydrated || count === 0) return null;

  return (
    <Link
      href="/sepet"
      aria-label={`Sepetim — ${count} ürün`}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-line)] text-[var(--site-ink)] transition-colors hover:border-[var(--dc-brand)] ${className}`}
    >
      <ShoppingBag size={19} strokeWidth={1.7} aria-hidden="true" />
      <span
        aria-hidden="true"
        className="absolute -right-0.5 -top-0.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[var(--dc-brand-strong)] px-1 text-[11px] font-bold leading-none text-white"
      >
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}
