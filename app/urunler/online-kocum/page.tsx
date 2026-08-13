import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, HandHeart, RefreshCw, Target } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Koçum | LGS ve YKS Çalışma Düzeni",
  description: "LGS ve YKS öğrencileri için hedefi haftalık plana çeviren, ilerlemeyi görünür kılan ve destek istemeyi kolaylaştıran takip düzeni.",
  canonical: "/urunler/online-kocum",
});

const flow = [
  { icon: Target, title: "Hedefi netleştir", body: "Sınav hedefi ve mevcut sorumluluklar anlaşılır bir başlangıç noktasına dönüşür." },
  { icon: CalendarCheck2, title: "Haftayı planla", body: "Çalışma adımları öğrencinin zamanına sığan, uygulanabilir bir haftalık düzende görünür." },
  { icon: RefreshCw, title: "Gözden geçir", body: "Tamamlananlar ve zorlanılan noktalar fark edilir; sonraki hafta buna göre yeniden ele alınır." },
  { icon: HandHeart, title: "Destek iste", body: "Öğrenci zorlandığını fark ettiğinde yardım istemek için açık bir kanala sahip olur." },
] as const;

export default function OnlineKocumProductPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="bg-[var(--pd-pastel-yellow-soft)] py-20 sm:py-28">
          <div className="site-container grid gap-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div>
              <p className="site-kicker">Online Koçum · LGS ve YKS</p>
              <h1 className="mt-5 max-w-4xl text-[clamp(2.8rem,6vw,5.1rem)] font-semibold leading-[.98] tracking-[-.055em] text-[var(--site-ink)]">Büyük hedefi, yapılabilir haftalara böl.</h1>
              <p className="mt-7 max-w-2xl text-[17px] leading-8 text-[var(--site-body)] sm:text-[19px]">Online Koçum, LGS ve YKS öğrencilerinin hedefini çalışma düzenine çevirmesine, ilerlemesini görmesine ve ihtiyaç halinde destek istemesine yardımcı olan takip ürünüdür.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/iletisim/" className="site-btn site-btn-primary site-btn-lg">Bilgi al <ArrowRight size={17} /></Link><Link href="/urunler/" className="site-btn site-btn-secondary site-btn-lg">Ürünleri karşılaştır</Link></div>
            </div>
            <aside className="rounded-[30px] border border-[var(--site-line)] bg-white p-7 sm:p-9" aria-label="Online Koçum ne sağlar">
              <p className="text-[12px] font-bold uppercase tracking-[.1em] text-[var(--site-muted)]">Ürünün rolü</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-[var(--site-ink)]">Planı öğrencinin yerine yapmak değil, sürdürülebilir bir düzen kurmak.</h2>
              <ul className="mt-6 space-y-4">{["LGS ve YKS hedeflerine göre çalışma yönü", "Haftalık plan ve düzenli gözden geçirme", "Puanlama ve kıyaslama yerine açıklanabilir takip"].map((item) => <li key={item} className="flex gap-3 text-[15px] leading-7 text-[var(--site-body)]"><Check className="mt-1 h-5 w-5 shrink-0 text-[var(--brand-olive)]" aria-hidden="true" />{item}</li>)}</ul>
            </aside>
          </div>
        </section>

        <section className="site-container py-20 sm:py-24"><div className="max-w-3xl"><p className="site-kicker">Takip döngüsü</p><h2 className="mt-4 text-[clamp(2.3rem,5vw,3.7rem)] font-semibold tracking-[-.045em] text-[var(--site-ink)]">Her hafta yeniden anlaşılır bir başlangıç.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-2">{flow.map(({ icon: Icon, title, body }, index) => <article key={title} className="rounded-[26px] border border-[var(--site-line)] bg-white p-7"><div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--pd-pastel-yellow-soft)] text-[var(--pd-pastel-yellow-ink)]"><Icon size={21} aria-hidden="true" /></span><span className="font-mono text-xs text-[var(--site-muted)]">0{index + 1}</span></div><h3 className="mt-6 text-2xl font-semibold text-[var(--site-ink)]">{title}</h3><p className="mt-3 text-[15px] leading-7 text-[var(--site-body)]">{body}</p></article>)}</div></section>

        {/*
          Dürüstlük notu: Online Koçum için yayınlanmış bir fiyat ve self-servis
          kayıt akışı henüz yok. Olmayan bir satın alma yolu göstermek yerine
          durumu açıkça yazıp ön görüşmeye yönlendiriyoruz. Fiyat/paket sunumu
          P0-07'nin konusu.
        */}
        <section className="site-container pb-20 sm:pb-24">
          <div className="rounded-[30px] border border-[var(--site-line)] bg-[var(--pd-pastel-yellow-soft)] p-7 sm:p-10">
            <p className="site-kicker">Kayıt durumu</p>
            <h2 className="mt-4 max-w-3xl text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold tracking-[-.04em] text-[var(--site-ink)]">
              Online Koçum için kayıtlar hazırlanıyor.
            </h2>
            <p className="mt-4 max-w-2xl text-[16px] leading-8 text-[var(--site-body)]">
              Koçluk paketlerinin fiyatı ve online kayıt akışı yayına alınmadan ödeme almıyoruz. Şu anda
              öğrencinin sınıfını ve hedefini konuşmak için ücretsiz ön görüşme oluşturabilirsiniz.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/iletisim/" className="site-btn site-btn-primary">
                Ücretsiz görüşme talep et
              </Link>
              <Link href="/sss/" className="site-btn site-btn-secondary">
                Sıkça sorulanlar
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-[var(--site-bg-warm)] py-20"><div className="site-container grid gap-8 lg:grid-cols-2 lg:items-center"><div><p className="site-kicker">Birlikte kullan</p><h2 className="mt-4 text-[clamp(2.2rem,5vw,3.5rem)] font-semibold tracking-[-.045em] text-[var(--site-ink)]">Plan, ders ve deneme verisiyle anlam kazanır.</h2><p className="mt-5 text-[16px] leading-8 text-[var(--site-body)]">Online Dershanem öğrenme desteğini, Online Deneme Kulübüm ölçüm desteğini sağlar. Online Koçum ise bu yolculuktaki çalışma düzenine odaklanır.</p></div><div className="flex flex-col gap-3"><Link href="/urunler/online-dershanem/" className="site-btn site-btn-secondary site-btn-lg justify-between">Online Dershanem <ArrowRight size={17} /></Link><Link href="/urunler/online-deneme-kulubum/" className="site-btn site-btn-secondary site-btn-lg justify-between">Online Deneme Kulübüm <ArrowRight size={17} /></Link></div></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
