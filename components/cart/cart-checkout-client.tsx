"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Lock, ShieldCheck } from "lucide-react";
import { BuyerInfoForm, type BuyerInfoFormDefaults } from "@/components/checkout/buyer-info-form";

type CartSnapshot = {
  items: {
    id: string;
    name: string;
    category: string;
    subject: string;
    priceCents: number;
    priceLabel: string;
    qty: number;
  }[];
  coupon: { code: string } | null;
  ts: number;
};

function tryFormat(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function CartCheckoutClient({ defaults }: { defaults: BuyerInfoFormDefaults }) {
  const [snapshot, setSnapshot] = useState<CartSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      // Önce localStorage (yeni davranış), sonra sessionStorage (legacy) — birinde varsa kullan
      const raw =
        localStorage.getItem("od_checkout_cart") ??
        sessionStorage.getItem("od_checkout_cart");
      if (raw) {
        const parsed = JSON.parse(raw) as CartSnapshot;
        // 1 saat TTL — bayat snapshot'ı reddet
        const fresh = parsed?.ts && Date.now() - parsed.ts < 60 * 60 * 1000;
        if (parsed?.items?.length && fresh) {
          setSnapshot(parsed);
        }
      }
    } catch {/* ignore */}
    setLoaded(true);
  }, []);

  const totalCents = useMemo(
    () => (snapshot?.items || []).reduce((acc, i) => acc + i.priceCents * i.qty, 0),
    [snapshot],
  );

  if (!loaded) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[var(--od-cream-2)]" />;
  }

  if (!snapshot || snapshot.items.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--od-line)] bg-white p-10 text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--od-cream-2)]">
          <ShoppingBag size={28} className="text-[var(--od-olive)]" strokeWidth={1.6} />
        </div>
        <h1 className="mt-5 font-display text-[26px] text-[var(--od-ink)]">
          Sepet bilgisi bulunamadı.
        </h1>
        <p className="mt-2 text-[14px] text-[var(--od-ink-soft)]">
          Lütfen önce sepetinize ürün ekleyin.
        </p>
        <Link
          href="/sepet"
          className="mt-5 inline-flex items-center rounded-full bg-[var(--od-ink)] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-black"
        >
          Sepete Dön
        </Link>
      </div>
    );
  }

  // İlk kalemin kategorisi → form içi hidden field (legacy schema'lar için)
  const first = snapshot.items[0];
  const packageLabel =
    snapshot.items.length === 1
      ? `${first.category} ${first.subject}`
      : `${snapshot.items.length} ürün · Çoklu Paket`;
  const priceLabel = tryFormat(totalCents);
  const itemCount = snapshot.items.reduce((acc, i) => acc + i.qty, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* SOL: Form */}
      <div>
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">
            <Lock size={12} /> Güvenli Ödeme
          </span>
          <h1 className="mt-1 font-display text-[32px] leading-[1.05] tracking-tight text-[var(--od-ink)]">
            Bilgileriniz
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--od-ink-soft)]">
            Bilgileri eksiksiz doldurun, güvenli ödeme sayfasına yönlendireceğiz.
            {snapshot.coupon && (
              <> İndirim kodu <strong className="text-emerald-700">{snapshot.coupon.code}</strong> uygulanacak.</>
            )}
          </p>
        </div>

        <BuyerInfoForm
          action="/api/od/checkout/start"
          service="OD"
          submitMode="redirect"
          submitLabel="Güvenli Ödemeye Geç"
          packageLabel={packageLabel}
          priceLabel={priceLabel}
          hiddenFields={{
            category: first.category,
            subject: first.subject,
            packageName: packageLabel,
            priceLabel,
          }}
          extraPayload={{
            items: snapshot.items.map((i) => ({
              id: i.id,
              name: i.name,
              category: i.category,
              subject: i.subject,
              priceCents: i.priceCents,
              qty: i.qty,
            })),
            couponCode: snapshot.coupon?.code ?? null,
          }}
          defaults={defaults}
          onSuccess={() => {
            try {
              localStorage.removeItem("od_checkout_cart");
              sessionStorage.removeItem("od_checkout_cart");
              localStorage.removeItem("od_cart_v1");
              window.dispatchEvent(new CustomEvent("od-cart-change"));
            } catch {/* ignore */}
          }}
        />
      </div>

      {/* SAĞ: Sipariş özeti (sticky) */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-[var(--od-line)] bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[20px] tracking-tight text-[var(--od-ink)]">
              Sipariş Özeti
            </h2>
            <span className="text-[12px] text-[var(--od-ink-soft)]">{itemCount} ürün</span>
          </div>

          <ul className="mt-5 space-y-4 divide-y divide-[var(--od-line)]">
            {snapshot.items.map((it) => (
              <li key={it.id} className="flex gap-3 pt-4 first:pt-0">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                  <ShoppingBag size={18} strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--od-ink)] truncate">
                    {it.name}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--od-ink-soft)]">
                    {it.category} · {it.subject}
                    {it.qty > 1 && <> · {it.qty} adet</>}
                  </div>
                </div>
                <div className="text-right text-[13px] font-semibold text-[var(--od-ink)] whitespace-nowrap">
                  {tryFormat(it.priceCents * it.qty)}
                </div>
              </li>
            ))}
          </ul>

          {snapshot.coupon && (
            <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-[12.5px]">
              <span className="text-emerald-800">
                Kupon: <strong>{snapshot.coupon.code}</strong>
              </span>
              <span className="text-emerald-700 text-[11.5px]">Ödeme adımında uygulanır</span>
            </div>
          )}

          <div className="mt-5 space-y-2 border-t border-[var(--od-line)] pt-4 text-[13px]">
            <div className="flex justify-between text-[var(--od-ink-soft)]">
              <span>Ara toplam</span>
              <span>{tryFormat(totalCents)}</span>
            </div>
            <div className="flex items-baseline justify-between pt-2 border-t border-[var(--od-line)]">
              <span className="text-[14px] font-semibold text-[var(--od-ink)]">Toplam</span>
              <span className="font-display text-[22px] text-[var(--od-ink)]">
                {tryFormat(totalCents)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-[var(--od-cream-2)] p-3 text-[11.5px] text-[var(--od-ink-soft)]">
            <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-emerald-700" />
            <span>
              <strong className="text-[var(--od-ink)]">PayTR</strong> ile 256-bit SSL güvenli ödeme.
              Kart bilgileriniz sitemizde saklanmaz, 1/3/6/9 taksit seçenekleri sunulur.
            </span>
          </div>

          <Link
            href="/sepet"
            className="mt-4 block text-center text-[12.5px] text-[var(--od-ink-soft)] hover:text-[var(--od-ink)] transition"
          >
            ← Sepete dön / düzenle
          </Link>
        </div>
      </aside>
    </div>
  );
}
