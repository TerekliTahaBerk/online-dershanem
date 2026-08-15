import Image from "next/image";
import Link from "next/link";

/**
 * 09 PLATFORM ÖN İZLEMESİ — onaylı tasarım (Web.dc.html).
 * Koyu yeşil banner + telefon mockup'ı.
 *
 * DOĞRULUK: handoff açıkça "Yakında · mağaza rozeti yok" diyor. App Store /
 * Google Play rozeti YOKTUR ve telefon uygulamasının yayında olmadığı ekranda
 * yazılıdır (§55). Panelin kendisi tarayıcıda AÇIK — metin bunu doğru anlatmalı.
 */
export function PlatformPreview() {
  return (
    <section className="site-container py-[var(--dc-section)]">
      <div className="relative grid overflow-hidden rounded-dc-banner bg-dc-brand-deep px-8 pt-12 sm:px-14 sm:pt-14 lg:grid-cols-[1fr_420px] lg:gap-8">
        <div className="pb-12 sm:pb-14">
          <p className="inline-flex flex-wrap items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7FD3AF]">
            Platform ön izlemesi
            <span className="rounded-full border border-[rgba(127,211,175,.3)] bg-[rgba(127,211,175,.16)] px-2.5 py-1 text-[#B7E8D2]">
              Yakında
            </span>
          </p>

          <h2 className="mt-4 font-display text-[length:var(--public-title)] leading-[1.12] tracking-[-0.025em] text-white">
            Dersinden denemene,
            <br />
            gelişimin tek yerde.
          </h2>
          <p className="mt-4 max-w-[420px] text-[16.5px] leading-[1.65] text-[#B6CEC4]">
            Ders programın, haftalık planın, deneme sonuçların ve Dino AI önerileri
            aynı ekranda. Panele tarayıcıdan giriyorsun; telefon uygulaması üzerinde
            çalışıyoruz.
          </p>

          <ul className="mt-6 max-w-[460px] border-t border-[rgba(255,255,255,.14)] pt-5 text-[15px] font-medium leading-[1.9] text-[#CFE3DA]">
            <li>Ders programı ve canlı derse giriş</li>
            <li>Haftalık plan ve koç görüşmeleri</li>
            <li>Deneme sonucu ve konu bazlı analiz</li>
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/urunler/"
              className="rounded-full bg-white px-[26px] py-[15px] text-[15px] font-bold text-dc-brand-deep transition-opacity hover:opacity-90"
            >
              Nasıl çalışacağını gör
            </Link>
            <span className="max-w-[280px] text-[13px] font-medium text-[var(--dc-on-deep-faint)]">
              Telefon uygulaması henüz yayında değil.
            </span>
          </div>
        </div>

        <div className="relative hidden h-[440px] self-end lg:block">
          <Image
            src="/design/app-mockup.png"
            alt="Online Dershanem uygulama ekranı önizlemesi"
            width={1145}
            height={1516}
            sizes="520px"
            className="absolute -bottom-[120px] -right-5 w-[520px] max-w-none"
          />
        </div>
      </div>
    </section>
  );
}
