import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { contact } from "@/lib/content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = {
  ...buildMarketingMetadata({ title: "Kariyer", description: "Canlı öğrenme, koçluk ve ölçme deneyimleri üzerinde çalışan onlinedershanem. ekibiyle iletişime geçin.", canonical: "/kariyer" }),
  robots: { index: false, follow: true },
};

export default function CareersPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <PageHero eyebrow="Kariyer" title="Öğrencinin öğrenme yoluna katkı sun." subtitle="Canlı öğrenme, çalışma düzeni ve ölçme deneyimlerini bir araya getiren bir ekibiz." />
        <section className="site-container py-(--dc-section)">
          <div className="max-w-3xl rounded-dc-card border border-dc-line bg-white p-7 sm:p-10">
            <h2 className="text-[24px] font-bold text-dc-ink">Şu anda yayınlanan açık pozisyon bulunmuyor.</h2>
            <p className="mt-4 text-[16px] leading-7 text-dc-ink-body">Ekibimize katkı sunmak istersen çalışma alanını ve özgeçmişini paylaşabilirsin. Genel başvuru bir açık pozisyon veya işe alım taahhüdü değildir.</p>
            <Link href={`mailto:${contact.email}?subject=${encodeURIComponent("Genel kariyer başvurusu")}`} className="site-btn site-btn-secondary mt-6">Genel başvurunu paylaş</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
