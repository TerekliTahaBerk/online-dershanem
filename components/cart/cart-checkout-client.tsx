"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
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
      const raw = sessionStorage.getItem("od_checkout_cart");
      if (raw) {
        const parsed = JSON.parse(raw) as CartSnapshot;
        if (parsed?.items?.length) {
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

  return (
    <>
      <div className="mb-6">
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">
          Güvenli Ödeme
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
            sessionStorage.removeItem("od_checkout_cart");
            localStorage.removeItem("od_cart_v1");
            window.dispatchEvent(new CustomEvent("od-cart-change"));
          } catch {/* ignore */}
        }}
      />
    </>
  );
}
