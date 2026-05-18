"use client";

/**
 * OD Çoklu-Ürün Sepeti — localStorage tabanlı client cart.
 *
 * Tasarım: Server schema değişmez. Çoklu kalem siparişler `OdOrder.buyerInfo.cart`
 * JSON alanında tutulur; PayTR basket'i kalem kalem oluşturulur; admin/email
 * raporlarında kalemler tek tek görüntülenir.
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

const STORAGE_KEY = "od_cart_v1";

export type OdCartItem = {
  id: string;          // unique key — "<category>__<subject>" or freeform
  name: string;        // display "TYT-AYT Matematik"
  category: string;    // "TYT-AYT", "LGS" ...
  subject: string;     // "Matematik" ...
  priceCents: number;  // unit price
  priceLabel: string;  // "₺2.000,00 / Ay"
  qty: number;
};

type CartContextValue = {
  items: OdCartItem[];
  count: number;
  totalCents: number;
  add: (item: Omit<OdCartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
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
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (x: unknown): x is OdCartItem =>
                !!x &&
                typeof x === "object" &&
                typeof (x as OdCartItem).id === "string" &&
                typeof (x as OdCartItem).priceCents === "number",
            ),
          );
        }
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
        const next = e.newValue ? JSON.parse(e.newValue) : [];
        if (Array.isArray(next)) setItems(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((item: Omit<OdCartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === item.id);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = { ...next[i], qty: Math.min(99, next[i].qty + qty) };
        return next;
      }
      return [...prev, { ...item, qty: Math.max(1, Math.min(99, qty)) }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const safe = Math.max(1, Math.min(99, Math.floor(qty)));
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty: safe } : x)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((acc, it) => acc + it.qty, 0),
      totalCents: items.reduce((acc, it) => acc + it.priceCents * it.qty, 0),
      add,
      remove,
      setQty,
      clear,
      hydrated,
    }),
    [items, add, remove, setQty, clear, hydrated],
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

/**
 * Provider gerektirmeyen yardımcı — yalnızca count okur (FAB için).
 * Hidrate olmadan 0 döner; layout shift olmaz çünkü FAB sayı 0 ise gizli.
 */
export function useCartCountSafe(): number {
  const ctx = useContext(CartContext);
  return ctx?.count ?? 0;
}
