"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageCircle, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCart, type OdCartItem } from "@/components/cart/cart-provider";
import { EmptyCart } from "@/components/cart/empty-cart";
import { contact } from "@/lib/content";
import { trackConversionEvent } from "@/lib/tracking";

const whatsappHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

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
  // Hidrasyon öncesi de boş sepet fallback'i basılır; bu sayede `/sepet`'in
  // server-render HTML'i anlamlı bir ekran gösterir (skeleton flash yok).
  if (!hydrated || count === 0) {
    return <EmptyCart />;
  }

  // ── Cart with items ──
  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
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
          <div className="rounded-[16px] border border-[var(--od-line)] bg-[var(--od-paper)] p-6 shadow-[0_1px_2px_rgba(20,20,15,0.04)]">
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
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--od-olive)] px-6 py-3.5 text-[14px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21]"
            >
              Güvenli Ödemeye Geç
              <ArrowRight size={14} />
            </button>

            <div className="mt-3 text-[11.5px] text-center text-[var(--od-ink-soft)]">
              Bilgi formunun ardından PayTR güvenli ödeme sayfası açılır.
            </div>

            {/* Checkout trust box */}
            <div className="mt-4 rounded-[12px] border border-[var(--od-line)] bg-[var(--od-cream-2)] p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--od-ink)]">
                <ShieldCheck size={16} className="text-[var(--od-olive)]" aria-hidden="true" />
                Güvenli ödeme
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--od-ink-soft)]">
                Ödeme PayTR altyapısı ile alınır. Kart bilgileriniz Online
                Dershanem tarafından saklanmaz. Hesap açmadan ödeme yapabilirsiniz;
                sonrasında ekibimiz sizinle iletişime geçer.
              </p>
              <ul className="mt-3 space-y-1.5 text-[11.5px] text-[var(--od-ink-soft)]">
                <li>· 256-bit SSL korumalı ödeme</li>
                <li>· 1, 3, 6 ve 9 taksit seçenekleri</li>
                <li>· Ödeme PayTR tarafından işlenir</li>
              </ul>
            </div>

            {/* WhatsApp destek */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--od-ink)] bg-[var(--od-paper)] px-5 py-2.5 text-[12.5px] font-medium text-[var(--od-ink)] transition-colors hover:bg-[var(--od-cream-2)]"
            >
              <MessageCircle size={14} aria-hidden="true" />
              Ödeme öncesi sorularınız için WhatsApp
            </a>

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
    <article className="flex flex-col gap-4 rounded-[16px] border border-[var(--od-line)] bg-[var(--od-paper)] p-5 shadow-[0_1px_2px_rgba(20,20,15,0.03)] sm:flex-row sm:items-center">
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
        <div className="inline-flex items-center rounded-[10px] border border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <button
            type="button"
            onClick={() => onQtyChange(item.qty - 1)}
            disabled={item.qty <= 1}
            className="flex h-11 w-11 items-center justify-center text-[var(--od-ink-soft)] hover:text-[var(--od-ink)] disabled:opacity-30"
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
            className="flex h-11 w-11 items-center justify-center text-[var(--od-ink-soft)] hover:text-[var(--od-ink)] disabled:opacity-30"
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
          className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--od-ink-soft)]/60 transition-colors hover:bg-rose-50 hover:text-rose-600"
          aria-label="Sepetten çıkar"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
