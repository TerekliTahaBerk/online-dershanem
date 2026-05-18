"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useCart, type OdCartItem } from "./cart-provider";
import { trackConversionEvent } from "@/lib/tracking";

type Props = {
  item: Omit<OdCartItem, "qty">;
  className?: string;
  analyticsSource?: string;
};

/**
 * "Sepete Ekle" düğmesi — paket kartlarında "Satın Al" yanına konur.
 * Tıklandığında 1.6sn boyunca "Eklendi ✓" feedback'i gösterir.
 */
export function AddToCartButton({ item, className = "", analyticsSource }: Props) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleClick = () => {
    add(item, 1);
    setJustAdded(true);
    trackConversionEvent("add_to_cart", {
      source: analyticsSource || "package_card",
      packageName: item.name,
      priceCents: item.priceCents,
    });
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${item.name} sepete ekle`}
      className={className}
      data-justadded={justAdded ? "1" : "0"}
    >
      {justAdded ? (
        <>
          <Check size={14} />
          Eklendi
        </>
      ) : (
        <>
          <ShoppingCart size={14} />
          Sepete Ekle
        </>
      )}
    </button>
  );
}
