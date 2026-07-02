"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { BuyerInfoForm, type BuyerInfoFormDefaults } from "@/components/checkout/buyer-info-form";
import { OrderSummaryCard, CheckoutPageHeader } from "@/components/checkout/order-summary-card";
import { parseCheckoutCartSnapshot } from "@/lib/od/cart-storage";

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

  const totalCents = useMemo(
    () => (snapshot?.items || []).reduce((acc, i) => acc + i.priceCents * i.qty, 0),
    [snapshot],
  );

  if (!loaded) {
    return <div className="h-40 animate-pulse rounded-[16px] bg-[var(--od-cream-2)]" />;
  }

  if (!snapshot || snapshot.items.length === 0) {
    return (
      <div className="rounded-[16px] border border-[var(--od-line)] bg-[var(--od-paper)] p-10 text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[14px] bg-[var(--od-cream-2)]">
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
          className="mt-5 inline-flex min-h-12 items-center rounded-[10px] bg-[var(--od-olive)] px-5 py-2.5 text-[13px] font-medium text-[var(--od-cream)] hover:bg-[#2C3A21]"
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* SOL: Form */}
      <div>
        <CheckoutPageHeader subtitle="Bilgileri eksiksiz doldurun, güvenli ödeme sayfasına yönlendireceğiz. Satın alma için kayıt olmanız gerekmez." />

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
