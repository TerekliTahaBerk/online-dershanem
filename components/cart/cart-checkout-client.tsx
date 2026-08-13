"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { BuyerInfoForm, type BuyerInfoFormDefaults } from "@/components/checkout/buyer-info-form";
import { OrderSummaryCard, CheckoutPageHeader } from "@/components/checkout/order-summary-card";
import { parseCheckoutCartSnapshot } from "@/lib/od/cart-storage";
import type { OdPlacementExpectation } from "@/lib/od/placement";

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

export function CartCheckoutClient({ defaults, placementExpectation }: { defaults: BuyerInfoFormDefaults; placementExpectation: OdPlacementExpectation }) {
  const [snapshot, setSnapshot] = useState<CartSnapshot | null>(null);
  const [currentExpectation, setCurrentExpectation] = useState(placementExpectation);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      // Önce localStorage (yeni davranış), sonra sessionStorage (legacy) — birinde varsa kullan
      const raw =
        localStorage.getItem("od_checkout_cart") ??
        sessionStorage.getItem("od_checkout_cart");
      if (raw) {
        const parsed = parseCheckoutCartSnapshot(JSON.parse(raw));
        if (parsed) setSnapshot(parsed);
        else {
          localStorage.removeItem("od_checkout_cart");
          sessionStorage.removeItem("od_checkout_cart");
        }
      }
    } catch {/* ignore */}
    setLoaded(true);
  }, []);

  useEffect(() => {
    const category = snapshot?.items[0]?.category;
    if (!category) return;
    const controller = new AbortController();
    fetch(`/api/od/placement-expectation?category=${encodeURIComponent(category)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<OdPlacementExpectation> : null)
      .then((result) => { if (result) setCurrentExpectation(result); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [snapshot]);

  const totalCents = useMemo(
    () => (snapshot?.items || []).reduce((acc, i) => acc + i.priceCents * i.qty, 0),
    [snapshot],
  );

  if (!loaded) {
    return <div className="h-40 animate-pulse rounded-[24px] bg-[var(--site-bg-warm)]" />;
  }

  if (!snapshot || snapshot.items.length === 0) {
    return (
      <div className="rounded-[24px] border border-[var(--site-line)] bg-white p-10 text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[16px] bg-[var(--brand-orange-soft)]">
          <ShoppingBag size={28} className="text-[var(--brand-orange-ink)]" strokeWidth={1.6} />
        </div>
        <h1 className="mt-5 font-display text-[26px] text-[var(--site-ink)]">
          Sepet bilgisi bulunamadı.
        </h1>
        <p className="mt-2 text-[14px] text-[var(--site-body)]">
          Lütfen önce sepetinize ürün ekleyin.
        </p>
        <Link
          href="/sepet"
          className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--brand-orange)] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(44,58,32,0.5)] transition-colors hover:bg-[var(--brand-orange-hover)]"
        >
          Sepete Dön
        </Link>
      </div>
    );
  }

  // Sepet tek öğrenci için tam olarak bir paket içerir.
  const first = snapshot.items[0];
  const packageLabel = `${first.category} ${first.subject}`;
  const priceLabel = tryFormat(totalCents);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* SOL: Form */}
      <div>
        <CheckoutPageHeader subtitle="Bilgileri eksiksiz doldurun, güvenli ödeme sayfasına yönlendireceğiz. Satın alma için hesap açmanız gerekmez." />

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
          }}
          defaults={defaults}
          placementExpectation={currentExpectation}
        />
      </div>

      {/* SAĞ: Sipariş özeti (sticky) */}
      <OrderSummaryCard
        items={snapshot.items.map((i) => ({
          id: i.id,
          category: i.category,
          name: i.name,
          subtitle: i.subject,
          priceCents: i.priceCents,
          qty: i.qty,
        }))}
        backHref="/sepet"
      />
    </div>
  );
}
