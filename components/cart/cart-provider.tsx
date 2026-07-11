"use client";

/**
 * OD tek öğrenci / tek paket sepeti — localStorage tabanlı client cart.
 *
 * Yeni paket seçimi önceki seçimin yerini alır. Böylece aynı CTA'ya yeniden
 * basılması veya LGS/YKS arasında seçim yapılması tutarı yanlışlıkla artırmaz.
 *
 * Kalıcılık: localStorage (key: "od_cart_v1"). SSR-safe — useEffect ile hidrate edilir.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { sanitizeCartItems, type StoredCartItem } from "@/lib/od/cart-storage";

const STORAGE_KEY = "od_cart_v1";

export type OdCartItem = StoredCartItem;

type CartContextValue = {
  items: OdCartItem[];
  count: number;
  totalCents: number;
  add: (item: Omit<OdCartItem, "qty">) => void;
  remove: (id: string) => void;
  clear: () => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OdCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const validItems = sanitizeCartItems(parsed);
        if (validItems) setItems(validItems);
        else window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* corrupted storage — start fresh */
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      // Notify other tabs / cart-fab
      window.dispatchEvent(new CustomEvent("od-cart-change"));
    } catch {
      /* quota — ignore */
    }
  }, [items, hydrated]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const next = e.newValue ? sanitizeCartItems(JSON.parse(e.newValue)) : [];
        if (next) setItems(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((item: Omit<OdCartItem, "qty">) => {
    // Bir checkout tek öğrenci içindir. Yeni seçim önceki paketin yerini alır;
    // aynı CTA'ya iki kez basmak tutarı artırmaz.
    setItems([{ ...item, qty: 1 }]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.length,
      totalCents: items.reduce((acc, it) => acc + it.priceCents, 0),
      add,
      remove,
      clear,
      hydrated,
    }),
    [items, add, remove, clear, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart() must be used within <CartProvider>");
  }
  return ctx;
}
