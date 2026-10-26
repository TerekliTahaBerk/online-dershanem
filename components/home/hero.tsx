import { CampaignLink as Link } from "@/components/forms/campaign-link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { MarketingApplicationLink } from "@/components/forms/marketing-application-link";
import styles from "./hero.module.css";

/** Three product identities, expressed through type rather than dashboard mockups. */
export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={`site-container ${styles.content}`}>
        <div className={styles.headlineWrap}>
          <span className={styles.spark} aria-hidden="true"><Sparkles strokeWidth={1.5} /></span>
          <h1 id="home-hero-title" className={styles.headline}>
            <span className={styles.lesson}>Canlı derste <span className={styles.learn}>öğren.</span></span>
            <span className={styles.coaching}>Haftanı <span className={styles.plan}>planla.</span></span>
            <span className={styles.exam}>Denemeyle <span className={styles.measure}>ölç.</span></span>
          </h1>
          <span className={styles.direction} aria-hidden="true"><ArrowUpRight strokeWidth={1.3} /></span>
        </div>

        <p className={styles.description}>
          LGS ve YKS’ye hazırlanırken bir sonraki adımın net olsun.
          <span>Canlı ders, birebir koçluk ve online denemeden ihtiyacın olanı seç; kendi hazırlık düzenini kur.</span>
        </p>

        <div className={styles.actions}>
          <MarketingApplicationLink className={styles.primary} />
          <Link href="/urunler" className={styles.secondary}>Ürünleri Keşfet <ArrowRight size={19} aria-hidden="true" /></Link>

        </div>

        <nav aria-label="Hizmetini seç" className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-bold">
          <Link href="/urunler/online-dershanem" className="inline-flex min-h-11 items-center rounded-full border border-[#CDE2D7] px-5 text-[#16513C]">Online Dershanem →</Link>
          <Link href="/urunler/online-kocum" className="inline-flex min-h-11 items-center rounded-full border border-[#CADDF8] px-5 text-[#0754C9]">Yön Koçluk →</Link>
          <Link href="/urunler/online-deneme-kulubum" className="inline-flex min-h-11 items-center rounded-full border border-[#E9E1F3] px-5 text-[#5B2599]">Deneme Ligi →</Link>
        </nav>
        <dl className={styles.facts}>
          <div>
            <dt>Öğretmeninle canlı ders</dt>
            <dd>Birebir ya da en fazla 4 kişi</dd>
          </div>
          <div>
            <dt>Sana özel çalışma planı</dt>
            <dd>Birebir koçluk ve düzenli takip</dd>
          </div>
          <div>
            <dt>Denemeyle gelişim takibi</dt>
            <dd>LGS, TYT ve AYT için online deneme</dd>
          </div>
        </dl>

      </div>
    </section>
  );
}
