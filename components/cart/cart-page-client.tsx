"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Minus, Plus, ShoppingBag, Sparkles, Tag, Trash2, X } from "lucide-react";
import { useCart, type OdCartItem } from "@/components/cart/cart-provider";
import { trackConversionEvent } from "@/lib/tracking";
import { buildOdSuggestions, type Suggestion } from "@/lib/cross-sell";

type Props = {
  isLoggedIn: boolean;
};

function tryFormat(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function CartPageClient({ isLoggedIn }: Props) {
  const router = useRouter();
  const { items, count, totalCents, setQty, remove, clear, add, hydrated } = useCart();

  // Cross-sell önerileri sepete göre hesapla
  const suggestions = useMemo<Suggestion[]>(
    () => buildOdSuggestions(items, 3),
    [items],
  );

  // Coupon state
  const [code, setCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState<{
    code: string;
    discountCents: number;
    kindLabel: string;
    description: string | null;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Discounted total
  const discountCents = coupon ? Math.min(coupon.discountCents, totalCents) : 0;
  const finalCents = Math.max(0, totalCents - discountCents);

  const applyCoupon = useCallback(async () => {
    if (!code.trim()) return;
    if (!isLoggedIn) {
      router.push(`/giris?callbackUrl=${encodeURIComponent("/sepet")}`);
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          service: "OD",
          subtotalCents: totalCents,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setCouponError(json.error || "Kod uygulanamadı.");
        setCoupon(null);
        return;
      }
      setCoupon({
        code: json.code,
        discountCents: json.discountCents,
        kindLabel: json.kindLabel,
        description: json.description,
      });
      trackConversionEvent("coupon_applied", { code: json.code, discountCents: json.discountCents });
    } catch {
      setCouponError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setCouponLoading(false);
    }
  }, [code, isLoggedIn, router, totalCents]);

  // Sepet snapshot'ını localStorage'a yaz (sessionStorage sekmeler arası paylaşılmaz),
  // aynı sekmede /sepet/satin-al'a yönlendir.
  const handleCheckout = useCallback(() => {
    if (!isLoggedIn) {
      router.push(`/giris?callbackUrl=${encodeURIComponent("/sepet")}`);
      return;
    }
    if (items.length === 0) return;
    const params = new URLSearchParams();
    params.set("fromCart", "1");
    if (coupon) params.set("coupon", coupon.code);
    try {
      localStorage.setItem(
        "od_checkout_cart",
        JSON.stringify({
          items,
          coupon: coupon ? { code: coupon.code } : null,
          ts: Date.now(),
        }),
      );
    } catch {/* ignore */}
    trackConversionEvent("cart_checkout_open", { count, totalCents, coupon: coupon?.code });
    // Aynı sekmede aç — kullanıcı geri tuşu ile sepete dönebilir
    router.push(`/sepet/satin-al?${params.toString()}`);
  }, [isLoggedIn, items, coupon, router, count, totalCents]);

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
          Sepetiniz boş.
        </h1>
        <p className="mt-2 text-[14.5px] text-[var(--od-ink-soft)]">
          Programınıza uygun paketleri kataloğumuzdan ekleyebilirsiniz.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/paketler"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--od-ink)] px-6 py-3 text-[13.5px] font-medium text-white transition hover:bg-black"
          >
            Paketleri Keşfet
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/deneme-kulubu"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[13.5px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
          >
            ODK Paketleri
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

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-10 rounded-3xl border border-[var(--od-line)] bg-[var(--od-cream-2)] p-6">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--od-olive)]" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">
                  Programınıza uygun tamamlayıcılar
                </span>
              </div>
              <h2 className="mt-2 font-display text-[24px] leading-tight tracking-tight text-[var(--od-ink)]">
                Bu paketler de sepetinizle uyum sağlar.
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {suggestions.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    onAdd={() => {
                      add(
                        {
                          id: s.id,
                          name: s.name,
                          category: s.category,
                          subject: s.subject,
                          priceCents: s.priceCents,
                          priceLabel: s.priceLabel,
                        },
                        1,
                      );
                      trackConversionEvent("cross_sell_add", { suggestionId: s.id });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
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
              {coupon && discountCents > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 inline-flex items-center gap-1.5">
                    <Tag size={13} />
                    İndirim ({coupon.code})
                  </span>
                  <span className="font-medium text-emerald-700">
                    −{tryFormat(discountCents)}
                  </span>
                </div>
              )}
              <div className="border-t border-dashed border-[var(--od-line)] pt-3 flex items-baseline justify-between">
                <span className="text-[15px] font-semibold text-[var(--od-ink)]">Toplam</span>
                <span className="font-display text-[28px] leading-none text-[var(--od-ink)]">
                  {tryFormat(finalCents)}
                </span>
              </div>
            </div>

            {/* Coupon */}
            <div className="mt-5 rounded-2xl border border-[var(--od-line)] bg-[var(--od-cream)] p-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-[var(--od-ink-soft)] mb-2">
                <Tag size={12} />
                İndirim Kodu
              </div>
              {coupon ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-emerald-800 flex items-center gap-1.5">
                      <Check size={14} /> {coupon.code}
                    </div>
                    <div className="text-[12px] text-[var(--od-ink-soft)] truncate">
                      {coupon.kindLabel}
                      {coupon.description ? ` · ${coupon.description}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCoupon(null);
                      setCode("");
                    }}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--od-line)] bg-white text-[var(--od-ink-soft)] hover:text-rose-600"
                    aria-label="Kuponu kaldır"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="KOD"
                      maxLength={60}
                      className="flex-1 rounded-lg border border-[var(--od-line)] bg-white px-3 py-2 text-[13px] uppercase tracking-wider text-[var(--od-ink)] outline-none focus:border-[var(--od-olive)] focus:ring-1 focus:ring-[var(--od-olive)]"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !code.trim()}
                      className="rounded-lg bg-[var(--od-ink)] px-4 text-[12.5px] font-semibold text-white hover:bg-black disabled:opacity-50"
                    >
                      {couponLoading ? "..." : "Uygula"}
                    </button>
                  </div>
                  {couponError && (
                    <div className="mt-2 text-[12px] text-rose-700">{couponError}</div>
                  )}
                </>
              )}
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

            <ul className="mt-5 space-y-1.5 text-[11.5px] text-[var(--od-ink-soft)]">
              <li>· PayTR ile 256-bit SSL güvenli ödeme</li>
              <li>· 1, 3, 6 ve 9 taksit seçenekleri</li>
              <li>· Kart bilgileriniz sitemizde saklanmaz</li>
            </ul>
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
          {item.subject}
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

// ─── Suggestion card ───────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onAdd,
}: {
  suggestion: Suggestion;
  onAdd: () => void;
}) {
  const [added, setAdded] = useState(false);
  return (
    <div className="rounded-2xl border border-[var(--od-line)] bg-white p-4 flex flex-col">
      {suggestion.badge && (
        <span className="self-start mb-2 rounded-full bg-[var(--od-yellow-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--od-ink)]">
          {suggestion.badge}
        </span>
      )}
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--od-olive)]">
        {suggestion.category}
      </div>
      <div className="mt-1 font-display text-[19px] leading-tight tracking-tight text-[var(--od-ink)]">
        {suggestion.subject}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--od-ink-soft)] flex-1">
        {suggestion.reason}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-[18px] text-[var(--od-ink)]">
          {suggestion.priceLabel}
        </span>
        {suggestion.oldPriceLabel && (
          <span className="text-[11px] text-[var(--od-ink-soft)] line-through">
            {suggestion.oldPriceLabel}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          onAdd();
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1600);
        }}
        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--od-ink)]/15 bg-[var(--od-cream-2)] px-3 py-2 text-[12px] font-medium text-[var(--od-ink)] hover:border-[var(--od-ink)]/40 transition data-[added=true]:bg-emerald-50 data-[added=true]:text-emerald-700 data-[added=true]:border-emerald-200"
        data-added={added}
      >
        {added ? <><Check size={12} /> Sepete Eklendi</> : <>Sepete Ekle <Plus size={12} /></>}
      </button>
    </div>
  );
}
