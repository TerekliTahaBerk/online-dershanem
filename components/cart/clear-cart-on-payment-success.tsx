"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function ClearCartOnPaymentSuccess() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    try {
      localStorage.removeItem("od_checkout_cart");
      sessionStorage.removeItem("od_checkout_cart");
    } catch {
      // Storage may be unavailable; payment success UI must still render.
    }
  }, [clear]);

  return null;
}
