"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";

/**
 * Sağ-alt köşede sabit duran sepet butonu. count > 0 olduğunda görünür.
 * `/sepet` sayfasına yönlendirir.
 */
export function CartFab() {
  const { count, hydrated, totalCents } = useCart();
  if (!hydrated || count === 0) return null;

  return (
    <Link
      href="/sepet"
      aria-label={`Sepetim — ${count} ürün`}
      className="group fixed bottom-5 right-5 z-50 hidden min-h-12 items-center gap-3 rounded-full bg-[var(--brand-orange)] py-3 pl-4 pr-5 text-white shadow-[0_18px_36px_-16px_rgba(44,58,32,0.6)] transition-colors hover:bg-[var(--brand-orange-hover)] lg:flex"
    >
      <span className="relative inline-flex items-center justify-center">
        <ShoppingBag size={20} strokeWidth={1.8} />
        <span className="absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--brand-orange-ink)]">
          {count > 99 ? "99+" : count}
        </span>
      </span>
      <span className="text-[13px] font-semibold leading-tight">
        Sepetim
        <span className="block text-[11px] font-normal opacity-80">
          {new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
            maximumFractionDigits: 0,
          }).format(totalCents / 100)}
        </span>
      </span>
    </Link>
  );
}
