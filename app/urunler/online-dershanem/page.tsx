import Link from "next/link";
import { ArrowRight, Check, MessagesSquare, Presentation, Route } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Dershanem | LGS ve YKS Çok Dersli Canlı Öğrenme",
  description: "LGS ve YKS öğrencileri için birden fazla derste canlı öğrenme, öğretmen geri bildirimi ve ders sonrası net çalışma yönü.",
  canonical: "/urunler/online-dershanem",
});

const features = [
  { icon: Presentation, title: "Canlı öğrenme", body: "Öğrenci derste görünür kalır, soru sorar ve çözüm yolunu öğretmeniyle paylaşır." },
  { icon: MessagesSquare, title: "Öğretmen geri bildirimi", body: "Yalnız doğru cevap değil, öğrencinin takıldığı adım da konuşulur." },
  { icon: Route, title: "Ders sonrası yön", body: "Her dersin sonunda sıradaki çalışma adımı daha anlaşılır hale gelir." },
] as const;

export default function OnlineDershanemProductPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="bg-[var(--brand-olive-soft)] py-20 sm:py-28">
          <div className="site-container grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div>
              <p className="site-kicker">Online Dershanem · LGS ve YKS · Çok dersli</p>
              <h1 className="mt-5 max-w-4xl text-[clamp(2.8rem,6vw,5.1rem)] font-semibold leading-[.98] tracking-[-.055em] text-[var(--site-ink)]">Canlı derste görünür ol, ne çalışacağını bilerek çık.</h1>
              <p className="mt-7 max-w-2xl text-[17px] leading-8 text-[var(--site-body)] sm:text-[19px]">Online Dershanem, LGS ve YKS öğrencileri için birden fazla derste canlı öğrenmeyi öğretmen geri bildirimi ve ders sonrası çalışma yönüyle birleştiren üründür.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/ders-paketleri/" className="site-btn site-btn-primary site-btn-lg">Ders paketlerini incele <ArrowRight size={17} /></Link><Link href="/iletisim/" className="site-btn site-btn-secondary site-btn-lg">Ücretsiz görüşme</Link></div>
            </div>
            <aside className="rounded-[30px] border border-[var(--site-line)] bg-white p-7 sm:p-9" aria-label="Online Dershanem kimler için">
              <p className="text-[12px] font-bold uppercase tracking-[.1em] text-[var(--site-muted)]">Kimler için?</p>
              <ul className="mt-6 space-y-4">
                {["LGS hazırlığında farklı derslerde canlı öğrenme ve düzenli geri bildirim isteyen öğrenciler", "TYT ve AYT sürecinde öğretmenle etkileşimli ilerlemek isteyen YKS öğrencileri", "Her dersin sonunda sıradaki adımının netleşmesine ihtiyaç duyan öğrenciler"].map((item) => <li key={item} className="flex gap-3 text-[15px] leading-7 text-[var(--site-body)]"><Check className="mt-1 h-5 w-5 shrink-0 text-[var(--brand-olive)]" aria-hidden="true" />{item}</li>)}
              </ul>
            </aside>
          </div>
        </section>

        <section className="site-container py-20 sm:py-24">
          <div className="grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, body }) => <article key={title} className="rounded-[26px] border border-[var(--site-line)] bg-white p-7"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><Icon size={21} aria-hidden="true" /></span><h2 className="mt-6 text-2xl font-semibold text-[var(--site-ink)]">{title}</h2><p className="mt-3 text-[15px] leading-7 text-[var(--site-body)]">{body}</p></article>)}</div>
        </section>

        <section className="bg-[var(--site-bg-warm)] py-20"><div className="site-container grid gap-8 lg:grid-cols-2 lg:items-center"><div><p className="site-kicker">Ürün ailesi</p><h2 className="mt-4 text-[clamp(2.2rem,5vw,3.5rem)] font-semibold tracking-[-.045em] text-[var(--site-ink)]">Ders desteğine plan ve ölçüm ekleyebilirsin.</h2><p className="mt-5 text-[16px] leading-8 text-[var(--site-body)]">Online Koçum çalışma düzenini, Online Deneme Kulübüm ise sınav ölçümünü üstlenir. Her ürünün rolü ve başlangıç noktası ayrıdır.</p></div><div className="flex flex-col gap-3"><Link href="/urunler/online-kocum/" className="site-btn site-btn-secondary site-btn-lg justify-between">Online Koçum <ArrowRight size={17} /></Link><Link href="/urunler/online-deneme-kulubum/" className="site-btn site-btn-secondary site-btn-lg justify-between">Online Deneme Kulübüm <ArrowRight size={17} /></Link></div></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
