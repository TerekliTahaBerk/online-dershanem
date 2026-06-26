"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart, type OdCartItem } from "@/components/cart/cart-provider";
import { trackConversionEvent } from "@/lib/tracking";

function tryFormat(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function CartPageClient() {
  const router = useRouter();
  const { items, count, totalCents, setQty, remove, clear, hydrated } = useCart();

  const finalCents = totalCents;

  // Sepet snapshot'ını localStorage'a yaz (sessionStorage sekmeler arası paylaşılmaz),
  // aynı sekmede /sepet/satin-al'a yönlendir. Guest checkout: login GEREKMEZ.
  const handleCheckout = useCallback(() => {
    if (items.length === 0) return;
    try {
      localStorage.setItem(
        "od_checkout_cart",
        JSON.stringify({ items, coupon: null, ts: Date.now() }),
      );
    } catch {/* ignore */}
    trackConversionEvent("cart_checkout_open", { count, totalCents });
    // Aynı sekmede aç — kullanıcı geri tuşu ile sepete dönebilir
    router.push("/sepet/satin-al?fromCart=1");
  }, [items, router, count, totalCents]);

  // ── Empty state ──
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--od-cream-2)]" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--od-cream-2)]">
          <ShoppingBag size={36} className="text-[var(--od-olive)]" strokeWidth={1.6} />
        </div>
        <h1 className="mt-6 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)]">
          Henüz paket seçmediniz.
        </h1>
        <p className="mt-2 text-[14.5px] text-[var(--od-ink-soft)]">
          Matematik paketlerini inceleyin, size uygun olanı sepete ekleyin.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/#matematik-ders-paketi"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--od-ink)] px-6 py-3 text-[13.5px] font-medium text-white transition hover:bg-black"
          >
            Matematik Dersini İncele
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // ── Cart with items ──
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">
            Sepetim
          </span>
          <h1 className="mt-1 font-display text-[36px] leading-[1.05] tracking-tight text-[var(--od-ink)]">
            {count} ürün · {tryFormat(totalCents)}
          </h1>
        </div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--od-ink-soft)] hover:text-rose-600 transition"
        >
          <Trash2 size={14} />
          Sepeti temizle
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* LEFT: cart items + suggestions */}
        <div className="space-y-3">
          {items.map((it) => (
            <CartItemRow
              key={it.id}
              item={it}
              onQtyChange={(q) => setQty(it.id, q)}
              onRemove={() => remove(it.id)}
            />
          ))}

        </div>

        {/* RIGHT: summary */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="rounded-3xl border border-[var(--od-line)] bg-white p-6 shadow-sm">
            <h2 className="font-display text-[22px] leading-tight text-[var(--od-ink)]">
              Sipariş Özeti
            </h2>

            <div className="mt-5 space-y-2.5 text-[13.5px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--od-ink-soft)]">Ara Toplam</span>
                <span className="font-medium text-[var(--od-ink)]">{tryFormat(totalCents)}</span>
              </div>
              <div className="border-t border-dashed border-[var(--od-line)] pt-3 flex items-baseline justify-between">
                <span className="text-[15px] font-semibold text-[var(--od-ink)]">Toplam</span>
                <span className="font-display text-[28px] leading-none text-[var(--od-ink)]">
                  {tryFormat(finalCents)}
                </span>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={handleCheckout}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--od-ink)] px-6 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-black"
            >
              Güvenli Ödemeye Geç
              <ArrowRight size={14} />
            </button>

            <div className="mt-3 text-[11.5px] text-center text-[var(--od-ink-soft)]">
              Bilgi formunu doldurun, PayTR güvenli ödeme sayfasına geçilir.
            </div>

            <p className="mt-4 rounded-2xl border border-[var(--od-line)] bg-[var(--od-cream)] p-3.5 text-[12px] leading-relaxed text-[var(--od-ink-soft)]">
              Ödeme sonrası ekibimiz öğrenci hesabınızı hazırlayıp giriş bilgilerinizi
              sizinle paylaşacaktır. Satın alma için kayıt olmanız gerekmez.
            </p>

            <ul className="mt-4 space-y-1.5 text-[11.5px] text-[var(--od-ink-soft)]">
              <li>· PayTR ile 256-bit SSL güvenli ödeme</li>
              <li>· 1, 3, 6 ve 9 taksit seçenekleri</li>
              <li>· Kart bilgileriniz sitemizde saklanmaz</li>
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--od-line)] pt-3 text-[11.5px] text-[var(--od-ink-soft)]">
              <Link href="/iade/" className="underline-offset-2 transition hover:text-[var(--od-ink)] hover:underline">
                İade Politikası
              </Link>
              <span aria-hidden="true" className="text-[var(--od-line)]">·</span>
              <Link href="/kvkk/" className="underline-offset-2 transition hover:text-[var(--od-ink)] hover:underline">
                KVKK
              </Link>
              <span aria-hidden="true" className="text-[var(--od-line)]">·</span>
              <Link href="/gizlilik/" className="underline-offset-2 transition hover:text-[var(--od-ink)] hover:underline">
                Gizlilik
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Item row ──────────────────────────────────────────────────────────────

function CartItemRow({
  item,
  onQtyChange,
  onRemove,
}: {
  item: OdCartItem;
  onQtyChange: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[var(--od-line)] bg-white p-5 sm:flex-row sm:items-center">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--od-olive)]">
          {item.category}
        </div>
        <div className="mt-1 font-display text-[22px] leading-tight tracking-tight text-[var(--od-ink)]">
          {item.name}
        </div>
        <div className="mt-0.5 text-[12.5px] text-[var(--od-ink-soft)]">{item.priceLabel}</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="inline-flex items-center rounded-full border border-[var(--od-line)] bg-[var(--od-cream)]">
          <button
            type="button"
            onClick={() => onQtyChange(item.qty - 1)}
            disabled={item.qty <= 1}
            className="p-2 disabled:opacity-30 text-[var(--od-ink-soft)] hover:text-[var(--od-ink)]"
            aria-label="Adet azalt"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[2rem] text-center text-[13px] font-semibold text-[var(--od-ink)]">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onQtyChange(item.qty + 1)}
            disabled={item.qty >= 99}
            className="p-2 disabled:opacity-30 text-[var(--od-ink-soft)] hover:text-[var(--od-ink)]"
            aria-label="Adet artır"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="w-28 text-right font-display text-[18px] leading-none text-[var(--od-ink)]">
          {tryFormat(item.priceCents * item.qty)}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-[var(--od-ink-soft)]/60 hover:text-rose-600 transition"
          aria-label="Sepetten çıkar"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
