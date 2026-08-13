import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, FileChartColumn, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { formatOdkDate, formatOdkPrice } from "@/components/odk/public-package-card";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { getPublicOdkPackage, odkAvailabilityLabel, odkContractFaq } from "@/lib/odk/public-commerce-server";

type Params = Promise<{ slug: string }>;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicOdkPackage(slug);
  if (!item) return { title: "Paket bulunamadı", robots: { index: false, follow: false } };
  const description = item.contract.package.description || `${item.contract.package.title}: deneme takvimi, erişim hakları ve raporlama ayrıntıları.`;
  const metadata = buildMarketingMetadata({ title: item.contract.package.title, description, canonical: `/odk-paketleri/${slug}`, imagePath: "/odk-paketleri/opengraph-image", imageAlt: item.contract.package.title });
  return !item.catalogReady
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function OdkPackageDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const item = await getPublicOdkPackage(slug);
  if (!item) notFound();
  const { contract, availability } = item;
  const description = contract.package.description || `${contract.package.title} online deneme paketi`;
  const checkoutHref = `/odk-paketleri/${slug}/satin-al`;
  const access = contract.policy.access;
  const reportRights = [contract.policy.rights.studentReports && "öğrenci", contract.policy.rights.parentReports && "veli", contract.policy.rights.teacherReports && "öğretmen"].filter(Boolean).join(", ");
  const faq = odkContractFaq(contract);
  return <div className="site-scope">
    <SchemaJsonLd schema={[
      breadcrumbJsonLd([{ name: "Ana Sayfa", url: "/" }, { name: "Deneme Kulübü", url: "/deneme-kulubu" }, { name: contract.package.title, url: `/odk-paketleri/${slug}` }]),
      productJsonLd({ name: contract.package.title, description, url: `/odk-paketleri/${slug}`, priceCents: contract.package.priceCents, originalPriceCents: contract.package.originalPriceCents, availability: availability.allowed ? "InStock" : "OutOfStock", sku: contract.package.id }),
      faqJsonLd(faq),
    ]} />
    <SiteHeader />
    <main id="main-content" tabIndex={-1}>
      <section className="bg-[var(--site-bg-warm)] py-16 sm:py-24"><div className="site-container grid gap-10 lg:grid-cols-[1fr_380px]">
        <div><Link href="/deneme-kulubu#paketler" className="text-sm font-bold text-[var(--brand-orange-ink)]">← Paketlere dön</Link><p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[var(--brand-olive)]">Online Deneme Kulübü</p><h1 className="mt-3 max-w-3xl font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[1] tracking-[-.05em] text-[var(--site-ink)]">{contract.package.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--site-body)]">{description}</p></div>
        <aside className="rounded-[28px] border border-[var(--site-line)] bg-white p-6 shadow-xl shadow-slate-900/5"><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${availability.allowed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{odkAvailabilityLabel(availability.reason)}</span><div className="mt-5"><strong className="font-display text-4xl tracking-[-.04em]">{formatOdkPrice(contract.package.priceCents)}</strong>{contract.package.originalPriceCents ? <del className="ml-3 text-sm text-[var(--site-muted)]">{formatOdkPrice(contract.package.originalPriceCents)}</del> : null}</div>{availability.allowed ? <Link href={checkoutHref} className="site-btn site-btn-primary mt-7 w-full justify-center">{item.ctaText || "Güvenli ödemeye geç"}</Link> : <><button disabled className="site-btn mt-7 w-full cursor-not-allowed justify-center bg-slate-200 text-slate-600">Ödeme şu anda kapalı</button><p className="mt-3 text-center text-xs leading-5 text-[var(--site-muted)]">Satış, ödeme ve operasyon koşulları hazır olduğunda bu buton otomatik açılır.</p><Link href="/iletisim" className="mt-4 block text-center text-sm font-bold text-[var(--brand-orange-ink)]">{availability.reason === "SOLD_OUT" ? "Bekleme listesine katıl" : "Bilgi alın"}</Link></>}</aside>
      </div></section>

      <section className="site-container py-16 sm:py-20"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[
        [CalendarDays, `${contract.exams.length} deneme`, "Paket kapsamındaki planlı oturumlar"],
        [Clock3, access.starts === "PURCHASED_AT" ? "Ödemeyle başlar" : formatOdkDate(access.startsAt || null), access.endsAt ? `${formatOdkDate(access.endsAt)} tarihine kadar` : access.durationDays ? `${access.durationDays} gün erişim` : "Sözleşme süresince erişim"],
        [FileChartColumn, "Ayrıntılı rapor", `${reportRights || "Yetkili roller"} erişimi`],
        [ShieldCheck, contract.policy.rights.liveService ? "Canlı hizmet" : "Online çözüm", "Sınav ve sonuç akışı tek panelde"],
      ].map(([Icon, title, body]) => { const CardIcon = Icon as typeof CalendarDays; return <article key={String(title)} className="rounded-[22px] border border-[var(--site-line)] p-5"><CardIcon className="text-[var(--brand-orange)]" /><h2 className="mt-4 font-display text-xl">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">{String(body)}</p></article>; })}</div></section>

      <section className="bg-[var(--site-bg-warm)] py-16 sm:py-20"><div className="site-container"><h2 className="font-display text-4xl tracking-[-.04em]">Paketin deneme takvimi</h2><div className="mt-8 space-y-4">{contract.exams.map((exam, index) => <article key={exam.id} className="grid gap-4 rounded-[24px] border border-[var(--site-line)] bg-white p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-orange-tint)] font-bold text-[var(--brand-orange-ink)]">{index + 1}</span><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-olive)]">{exam.family}{exam.seriesTitle ? ` · ${exam.seriesTitle}` : ""}</p><h3 className="mt-1 font-display text-xl">{exam.title}</h3><p className="mt-1 text-sm text-[var(--site-body)]">Başlangıç: {formatOdkDate(exam.startsAt)} · Bitiş: {formatOdkDate(exam.endsAt)}</p></div><span className="text-sm font-semibold text-[var(--site-body)]">{exam.attemptLimit} giriş hakkı</span></article>)}</div></div></section>

      <section className="site-container py-16 sm:py-20"><div className="grid gap-10 lg:grid-cols-2"><div><h2 className="font-display text-4xl tracking-[-.04em]">Erişim ve raporlama hakları</h2><ul className="mt-7 space-y-4">{[
        [contract.policy.rights.studentReports, "Öğrenci sonuç ve kazanım raporu"], [contract.policy.rights.parentReports, "Veli rapor erişimi"], [contract.policy.rights.teacherReports, "Öğretmen rapor erişimi"], [contract.policy.rights.liveService, "Canlı sınav hizmeti"],
      ].map(([enabled, label]) => <li key={String(label)} className="flex gap-3 text-[var(--site-body)]"><CheckCircle2 className={enabled ? "text-emerald-600" : "text-slate-300"} />{label}: <strong>{enabled ? "dahil" : "dahil değil"}</strong></li>)}</ul></div><div><h2 className="font-display text-4xl tracking-[-.04em]">Sık sorulanlar</h2><div className="mt-7 space-y-3">{faq.map((item) => <details key={item.q} className="rounded-[20px] border border-[var(--site-line)] p-5"><summary className="cursor-pointer font-semibold">{item.q}</summary><p className="mt-3 leading-7 text-[var(--site-body)]">{item.a}</p></details>)}</div></div></div></section>
    </main><SiteFooter />
  </div>;
}
