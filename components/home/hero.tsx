import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * 02 HERO + 03 FACT LINE — onaylı tasarım (Web.dc.html).
 * Desktop: 1.08fr / 1fr iki kolon, metin solda, maskot + içgörü kartı sağda.
 * Mobil: tek kolon; handoff "chip'ler mobilde gizli, Dino metinden sonra".
 */
export function HomeHero() {
  return (
    <section className="site-container pb-10 pt-14 sm:pt-[76px]">
      <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_1fr]">
        <div>
          <h1 className="max-w-[560px] font-display text-[length:var(--public-display)] leading-[1.08] tracking-[-0.03em] text-dc-ink [text-wrap:pretty]">
            Canlı derste öğren, hafta boyunca ne çalışacağını bil.
          </h1>
          <p className="mt-5 max-w-[480px] text-[17px] leading-[1.65] text-dc-ink-body [text-wrap:pretty] sm:text-[18.5px]">
            LGS ve YKS için canlı ders, koçluk ve deneme analizi. Üçünü ayrı ayrı
            alabilirsin; birlikte aldığında toplam fiyat düşer.
          </p>

          {/*
            İkinci CTA satın alma yolunu açık tutar: ana sayfadan ödemeye giden
            tek bağlantı footer'daki küçük "Ders paketleri" linkiydi. Kurucu
            keşif içindir, `/ders-paketleri` ise doğrudan alma yoludur.
          */}
          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <Link href="/paketler" className="site-btn site-btn-primary site-btn-lg">
              Paketini Oluştur
              <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link href="/ders-paketleri" className="site-btn site-btn-secondary site-btn-lg">
              Ders Paketlerini Gör
            </Link>
          </div>

          {/* Doğrulanmış, somut bilgi — rakam/başarı oranı iddiası yok */}
          <dl className="mt-11 flex flex-wrap gap-9 border-t border-dc-line pt-6">
            <div>
              <dt className="text-[16.5px] font-bold text-dc-ink">Maks. 4 kişilik canlı grup</dt>
              <dd className="mt-0.5 text-[13.5px] text-dc-ink-faint">ya da birebir özel ders</dd>
            </div>
            <div>
              <dt className="text-[16.5px] font-bold text-dc-ink">LGS ve YKS</dt>
              <dd className="mt-0.5 text-[13.5px] text-dc-ink-faint">denemede LGS, TYT, AYT</dd>
            </div>
          </dl>
        </div>

        {/* Maskot + ders sonrası içgörü kartı */}
        <div className="relative mt-4 h-[380px] sm:h-[480px] lg:mt-0">
          <Image
            src="/design/dino-mascot.png"
            alt=""
            aria-hidden="true"
            width={1319}
            height={1193}
            priority
            sizes="(max-width: 1023px) 70vw, 450px"
            className="absolute bottom-0 left-[8%] w-[74%] max-w-[450px] lg:left-[70px]"
          />
          <div className="absolute bottom-16 right-0 w-[230px] rounded-dc-card-sm border border-dc-line bg-white p-4 shadow-dc-raised sm:bottom-24 sm:w-[250px] sm:px-[18px]">
            <p className="text-[12.5px] text-dc-ink-faint">Ders sonrası</p>
            <p className="mt-1.5 text-[15px] font-bold leading-[1.4] text-dc-ink">
              Bugün yüzde problemlerinde takıldın. Yarın 40 dakika bu konuya ayır.
            </p>
          </div>
        </div>
      </div>

      {/* 03 — doğruluk notu */}
      <p className="pt-8 text-[11.5px] text-dc-ink-ghost">
        Sitede öğrenci sayısı ya da başarı oranı yazmıyor. Elimizde doğrulanmış bir
        rakam olmadan böyle bir şey yazmıyoruz.
      </p>
    </section>
  );
}
