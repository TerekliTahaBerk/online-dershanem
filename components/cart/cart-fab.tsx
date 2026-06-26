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
      className="fixed bottom-5 right-5 z-50 group hidden items-center gap-3 rounded-full bg-[#091413] pl-4 pr-5 py-3 text-white shadow-2xl shadow-black/30 hover:bg-black transition-all lg:flex"
    >
      <span className="relative inline-flex items-center justify-center">
        <ShoppingBag size={20} strokeWidth={1.8} />
        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#6ee7b7] text-[10px] font-bold text-[#091413]">
          {count}
        </span>
      </span>
      <span className="text-[13px] font-medium leading-tight">
        Sepetim
        <span className="block text-[11px] opacity-70">
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
