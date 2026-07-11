"use client";

import { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { trackConversionEvent } from "@/lib/tracking";
import { useCart } from "@/components/cart/cart-provider";
import { getPackagePriceCents, parsePriceToCents } from "@/lib/content";

type PurchaseFunnelTriggerProps = {
  children: ReactNode;
  source: string;
  packageName: string;
  paymentLink: string;
  className?: string;
  analyticsId?: string;
  /**
   * Optional explicit overrides for the cart item. If not provided we try
   * to derive category/subject from the package name.
   */
  category?: string;
  subject?: string;
  priceLabel?: string;
};

/**
 * Satın alma CTA'sı — sepet-merkezli akış.
 *
 * Tıklandığında ürünü sepete ekler ve `/sepet`'i açar. Tüm ödemeler sepet →
 * checkout → PayTR üzerinden guest olarak ilerler; hesap gerekmez.
 */
export function PurchaseFunnelTrigger({
  children,
  source,
  packageName,
  className = "",
  analyticsId,
  category,
  subject,
  priceLabel,
}: PurchaseFunnelTriggerProps) {
  const router = useRouter();
  const { add } = useCart();

  // "<Category> <Subject>"'i packageName'den türet (açık değer verilmediyse).
  const derived = (() => {
    if (category || subject) {
      return { cat: category || "", subj: subject || "" };
    }
    const parts = packageName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { cat: parts[0], subj: parts.slice(1).join(" ") };
    }
    return { cat: "", subj: packageName };
  })();

  // Fiyatı önce katalogdan çöz; bulunamazsa priceLabel'dan parse et.
  const priceCents =
    getPackagePriceCents(derived.cat, derived.subj) ||
    (priceLabel ? parsePriceToCents(priceLabel) : 0);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    add({
      id: `${derived.cat}__${derived.subj}`,
      name: packageName,
      category: derived.cat,
      subject: derived.subj,
      priceCents,
      priceLabel: priceLabel || "",
    });
    trackConversionEvent("purchase_cta_click", { source, packageName });
    router.push("/sepet");
  };

  return (
    <a
      href="/sepet"
      onClick={handleClick}
      className={className}
      data-analytics-id={analyticsId ?? source}
      data-package-name={packageName}
    >
      {children}
    </a>
  );
}
