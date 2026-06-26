"use client";

import Link from "next/link";
import { ArrowRight, Check, MessageCircle, Phone, X } from "lucide-react";
import { contact, subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

const packages = subjectPackageGroups[0].packages;

const whatsappHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

// Operasyonel detaylar öğrenci seviyesine/grup planına göre değiştiği için
// kesin rakam yerine güvenli, dürüst açıklama gösterilir.
const operationDetails = [
  {
    label: "Ders sıklığı",
    value: "Öğrencinin seviyesine ve uygun grup planına göre ön görüşmede netleştirilir.",
  },
  {
    label: "Ders süresi",
    value: "Grup düzenine göre planlanır; ön görüşmede net olarak paylaşılır.",
  },
  {
    label: "İlk ders planlama",
    value: "Ödeme sonrası ekibimiz sizinle iletişime geçer ve uygun grubu birlikte belirleriz.",
  },
];

const included = [
  "Canlı matematik dersi (Google Meet)",
  "En fazla 4 öğrencilik küçük grup",
  "Derste soru-cevap ve birlikte çözüm",
  "Ders sonrası çalışma yönü ve ödevlendirme",
  "Öğretmen notu",
  "Veliye sade gelişim özeti",
  "Ödeme sonrası ekibimizin hazırladığı öğrenci hesabı",
];

const excluded = [
  "Birebir özel ders (dersler küçük grup hâlinde işlenir)",
  "Matematik dışındaki branşlar",
  "Ders dışı sınırsız bireysel mesajlaşma",
  "Başarı ya da net artışı garantisi",
];

const legalLinks = [
  { label: "İade Politikası", href: "/iade/" },
  { label: "KVKK", href: "/kvkk/" },
  { label: "Gizlilik", href: "/gizlilik/" },
];

export function PackagesPageContent() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Grid */}
      <div className="mx-auto mt-6 grid max-w-xl items-stretch gap-5">
        {packages.map((pkg) => {
          const featured = "featured" in pkg && pkg.featured;
          return (
            <article
              key={pkg.id}
              className={`relative flex flex-col rounded-[24px] border p-7 transition hover:-translate-y-0.5 ${
                featured
                  ? "border-[var(--od-line)] bg-[var(--od-olive)] text-white shadow-[0_28px_70px_-46px_rgba(20,20,15,0.38)]"
                  : "border-[var(--od-line)] bg-white shadow-[0_18px_44px_-36px_rgba(20,20,15,0.14)]"
              }`}
            >
              {pkg.badge ? (
                <span
                  className={`mb-3 inline-block text-[11px] font-medium uppercase tracking-[0.18em] ${
                    featured ? "text-[var(--od-yellow)]" : "text-[var(--od-olive)]"
                  }`}
                >
                  {pkg.badge}
                </span>
              ) : null}

              <h2 className="font-display text-[26px] font-normal leading-[1.1] tracking-tight">
                {pkg.name}
              </h2>
              <p
                className={`mt-2 text-[13.5px] leading-snug ${
                  featured ? "text-white/70" : "text-[var(--od-ink-soft)]"
                }`}
              >
                {pkg.tagline}
              </p>

              <div
                className={`mt-3 text-[12.5px] ${
                  featured ? "text-white/70" : "text-[#7A7A6F]"
                }`}
              >
                {pkg.quota}
              </div>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-[34px] leading-none">
                  <span className="sr-only">Güncel fiyat: </span>
                  {pkg.discountedPrice}
                </span>
                {pkg.oldPrice ? (
                  <span
                    className={`text-[13px] line-through ${
                      featured ? "text-white/50" : "text-[#A0A095]"
                    }`}
                  >
                    <span className="sr-only">Kampanya öncesi referans fiyat: </span>
                    {pkg.oldPrice}
                  </span>
                ) : null}
              </div>
              {pkg.oldPrice ? (
                <p
                  className={`mt-1 text-[11.5px] ${
                    featured ? "text-white/55" : "text-[#9A9A8E]"
                  }`}
                >
                  Kampanya öncesi referans fiyat: {pkg.oldPrice}. Kontenjan ve
                  grup uygunluğuna göre kayıt alınır.
                </p>
              ) : null}

              <p
                className={`mt-4 rounded-2xl border p-4 text-[12.5px] leading-6 ${
                  featured
                    ? "border-white/20 bg-white/5 text-white/80"
                    : "border-[var(--od-line)] bg-[var(--od-cream-2)] text-[var(--od-ink-soft)]"
                }`}
              >
                Birebir özel dersin maliyetine çıkmadan, kalabalık online sınıfta
                kaybolmadan düzenli matematik takibi. Canlı ders, soru-cevap,
                ödev yönlendirmesi, öğretmen notu ve veli gelişim özeti tek
                <span className={featured ? "font-semibold text-white" : "font-semibold text-[var(--od-ink)]"}> aylık ₺3.000</span> pakette.
              </p>
              {pkg.perLessonPrice ? (
                <div
                  className={`mt-1 text-[12.5px] ${
                    featured ? "text-white/60" : "text-[#7A7A6F]"
                  }`}
                >
                  {pkg.perLessonPrice}
                </div>
              ) : null}

              <p
                className={`mt-5 text-[12.5px] leading-snug ${
                  featured ? "text-white/65" : "text-[#7A7A6F]"
                }`}
              >
                {pkg.audience}
              </p>

              <ul
                className={`mt-5 space-y-2 border-t border-dashed pt-5 text-[13.5px] ${
                  featured
                    ? "border-white/20 text-white/90"
                    : "border-[var(--od-line)] text-[var(--od-ink)]"
                }`}
              >
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        featured ? "bg-[var(--od-yellow)]" : "bg-[var(--od-olive)]"
                      }`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto" />

              <PurchaseFunnelTrigger
                source={`packages_page_${pkg.id}`}
                packageName={pkg.name}
                paymentLink=""
                category={pkg.category}
                subject={pkg.subject}
                priceLabel={pkg.discountedPrice}
                analyticsId={`packages_page_${pkg.id}`}
                className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-medium transition ${
                  featured
                    ? "bg-[var(--od-yellow)] text-[var(--od-ink)] hover:bg-[#F0CE52]"
                    : "bg-[var(--od-olive)] text-white hover:bg-[#2E3B24]"
                }`}
              >
                Satın Al
                <ArrowRight size={14} />
              </PurchaseFunnelTrigger>

              <AddToCartButton
                analyticsSource={`packages_page_${pkg.id}`}
                item={{
                  id: `${pkg.category}__${pkg.subject}`,
                  name: pkg.name,
                  category: pkg.category,
                  subject: pkg.subject,
                  priceCents: pkg.priceCents,
                  priceLabel: pkg.discountedPrice,
                }}
                className={`mt-3 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-medium transition data-[justadded=1]:bg-[#dcfce7] data-[justadded=1]:border-emerald-300 data-[justadded=1]:text-emerald-800 ${
                  featured
                    ? "border border-white/25 text-white hover:border-white/50"
                    : "border border-[var(--od-ink)]/12 bg-[var(--od-cream-2)] text-[var(--od-ink)] hover:bg-white hover:border-[var(--od-ink)]/30"
                }`}
              />
            </article>
          );
        })}
      </div>

      {/* Kapsar / Kapsamaz */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[22px] border border-[var(--od-line)] bg-white p-7">
          <h3 className="font-display text-[22px] font-normal leading-tight tracking-tight text-[var(--od-ink)]">
            Paket neleri kapsar?
          </h3>
          <ul className="mt-5 space-y-2.5 text-[14px] text-[var(--od-ink)]">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check
                  size={16}
                  strokeWidth={2.2}
                  className="mt-0.5 shrink-0 text-[var(--od-olive)]"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[22px] border border-[var(--od-line)] bg-[var(--od-cream-2)] p-7">
          <h3 className="font-display text-[22px] font-normal leading-tight tracking-tight text-[var(--od-ink)]">
            Paket neleri kapsamaz?
          </h3>
          <ul className="mt-5 space-y-2.5 text-[14px] text-[var(--od-ink-soft)]">
            {excluded.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <X
                  size={16}
                  strokeWidth={2.2}
                  className="mt-0.5 shrink-0 text-[#B0392F]"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Operasyon detayları (placeholder) */}
      <dl className="mt-4 grid gap-4 rounded-[22px] border border-[var(--od-line)] bg-white p-7 sm:grid-cols-3">
        {operationDetails.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#8B8B7E]">
              {label}
            </dt>
            <dd className="mt-1.5 text-[14px] leading-6 text-[var(--od-ink)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Legal linkler + WhatsApp */}
      <div className="mt-4 flex flex-col gap-4 rounded-[22px] border border-[var(--od-line)] bg-white p-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <span className="text-[var(--od-ink-soft)]">Satın almadan önce:</span>
          {legalLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-medium text-[var(--od-ink)] underline-offset-2 transition hover:text-[var(--od-olive)] hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-[var(--od-cream-2)] px-5 py-2.5 text-[13.5px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/35"
        >
          <MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" />
          Kararsızsanız WhatsApp&apos;tan sorun
        </a>
      </div>

      {/* Help band */}
      <div className="mt-16 overflow-hidden rounded-[24px] border border-[var(--od-line)] bg-[var(--od-blush)]/65">
        <div className="grid gap-6 p-8 sm:grid-cols-[1.4fr_auto] sm:items-center sm:p-12">
          <div>
            <h3 className="font-display text-[28px] font-normal leading-[1.1] tracking-tight text-[var(--od-ink)] sm:text-[34px]">
              Öğrenci için doğru matematik temposunu birlikte belirleyelim.
            </h3>
            <p className="mt-3 max-w-md text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
              Sınıfını, hedefini ve derste nerede zorlandığını konuşalım;
              küçük gruba nasıl başlamasının doğru olacağını birlikte netleştirelim.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/iletisim/"
              className="inline-flex items-center justify-center rounded-full bg-[var(--od-olive)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-[#2E3B24]"
            >
              Ön Görüşme Talep Et
            </Link>
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 text-[13.5px] font-medium text-[var(--od-ink)] hover:text-[var(--od-olive)]"
            >
              <Phone size={13} strokeWidth={1.8} />
              {contact.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
