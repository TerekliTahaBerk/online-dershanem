"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";
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
  const { items, count, totalCents, remove, clear, hydrated } = useCart();

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
          <span className="site-eyebrow">Sepetim</span>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,2.6rem)] leading-[1.05] tracking-[-0.02em] text-[var(--site-ink)]">
            {count} ürün · {tryFormat(totalCents)}
          </h1>
        </div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--site-line)] bg-white px-3.5 py-2 text-[13px] text-[var(--site-body)] transition-colors hover:border-rose-300 hover:text-rose-600"
        >
          <Trash2 size={14} />
          Sepeti temizle
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT: cart items + suggestions */}
        <div className="space-y-3">
          {items.map((it) => (
            <CartItemRow
              key={it.id}
              item={it}
              onRemove={() => remove(it.id)}
            />
          ))}

        </div>

        {/* RIGHT: summary */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="rounded-[24px] border border-[var(--site-line)] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,15,0.04)]">
            <h2 className="font-display text-[22px] leading-tight text-[var(--site-ink)]">
              Sipariş Özeti
            </h2>

            <div className="mt-5 space-y-2.5 text-[13.5px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--site-body)]">Ara Toplam</span>
                <span className="font-medium text-[var(--site-ink)]">{tryFormat(totalCents)}</span>
              </div>
              <div className="border-t border-dashed border-[var(--site-line)] pt-3 flex items-baseline justify-between">
                <span className="text-[15px] font-semibold text-[var(--site-ink)]">Toplam</span>
                <span className="font-display text-[28px] leading-none text-[var(--site-ink)]">
                  {tryFormat(finalCents)}
                </span>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={handleCheckout}
              className="site-btn site-btn-primary mt-5 w-full"
            >
              Güvenli Ödemeye Geç
              <ArrowRight size={16} />
            </button>

            <div className="mt-3 text-[11.5px] text-center text-[var(--site-muted)]">
              Bilgi formunun ardından PayTR güvenli ödeme sayfası açılır.
            </div>

            {/* Checkout trust box */}
            <div className="mt-4 rounded-[16px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--site-ink)]">
                <ShieldCheck size={16} className="text-[var(--brand-orange-ink)]" aria-hidden="true" />
                Güvenli ödeme
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--site-body)]">
                Ödeme PayTR altyapısı ile alınır. Kart bilgileriniz Online
                Dershanem tarafından saklanmaz. Hesap açmadan ödeme yapabilirsiniz;
                sonrasında ekibimiz sizinle iletişime geçer.
              </p>
              <ul className="mt-3 space-y-1.5 text-[11.5px] text-[var(--site-body)]">
                <li>· 256-bit SSL korumalı ödeme</li>
                <li>· Taksit seçenekleri kartınıza ve bankanıza göre ödeme ekranında gösterilir</li>
                <li>· Ödeme PayTR tarafından işlenir</li>
              </ul>
            </div>

            {/* WhatsApp destek */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="site-btn site-btn-secondary mt-3 w-full text-[12.5px]"
            >
              <MessageCircle size={14} aria-hidden="true" />
              Ödeme öncesi sorularınız için WhatsApp
            </a>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--site-line)] pt-3 text-[11.5px] text-[var(--site-muted)]">
              <Link href="/iade/" className="underline-offset-2 transition-colors hover:text-[var(--site-ink)] hover:underline">
                İade Politikası
              </Link>
              <span aria-hidden="true" className="text-[var(--site-line)]">·</span>
              <Link href="/kvkk/" className="underline-offset-2 transition-colors hover:text-[var(--site-ink)] hover:underline">
                KVKK
              </Link>
              <span aria-hidden="true" className="text-[var(--site-line)]">·</span>
              <Link href="/gizlilik/" className="underline-offset-2 transition-colors hover:text-[var(--site-ink)] hover:underline">
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
  onRemove,
}: {
  item: OdCartItem;
  onRemove: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-[24px] border border-[var(--site-line)] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,15,0.03)] sm:flex-row sm:items-center">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-orange-ink)]">
          {item.category}
        </div>
        <div className="mt-1 font-display text-[22px] leading-tight tracking-[-0.01em] text-[var(--site-ink)]">
          {item.name}
        </div>
        <div className="mt-0.5 text-[12.5px] text-[var(--site-body)]">{item.priceLabel}</div>
      </div>

      <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
        <div className="text-right font-display text-[18px] leading-none text-[var(--site-ink)] sm:w-28">
          {tryFormat(item.priceCents)}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-muted)] transition-colors hover:bg-rose-50 hover:text-rose-600"
          aria-label="Sepetten çıkar"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
