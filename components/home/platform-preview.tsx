import Link from "next/link";
import { Check, Play, Smartphone } from "lucide-react";
import { AppScreen } from "@/components/applications/mobile-preview";

/**
 * Koyu yeşil banner, gerçek mobil uygulama ekranı ve mağaza duyuruları.
 */
const points = [
  "Bugünkü çalışmalarını tek yerde gör",
  "Haftalık planını takip et",
  "Deneme sonucundan eksik konulara dön",
];

export function PlatformPreview() {
  return (
    <section aria-labelledby="platform-preview-title" className="site-container py-(--dc-section)">
      <div className="relative grid overflow-hidden rounded-dc-banner dc-surface-deep bg-dc-brand-deep px-6 pt-10 sm:px-14 sm:pt-14 lg:grid-cols-[1fr_440px] lg:gap-8">
        <div className="pb-2 lg:pb-14">
          <p className="dc-eyebrow text-[#7FD3AF]!">Öğrenci paneli</p>

          <h2 id="platform-preview-title" className="mt-4 font-display text-(length:--public-title) leading-[1.12] tracking-tight text-white">
            Dersinden denemene,
            <br />
            gelişimin tek yerde.
          </h2>
          <p className="mt-4 max-w-[440px] text-[16.5px] leading-[1.65] text-[#B6CEC4]">
            Derslerin, haftalık planın ve deneme sonuçların hep yanında.
            onlinedershanem mobil uygulaması yakında iOS ve Android’de.
          </p>

          <ul className="mt-6 max-w-[460px] space-y-2.5 border-t border-[rgba(255,255,255,.14)] pt-5">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-[15.5px] font-medium leading-normal text-[#DCEAE4]"
              >
                <Check
                  size={18}
                  strokeWidth={2.4}
                  aria-hidden="true"
                  className="mt-0.5 flex-none text-[#7FD3AF]"
                />
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/urunler"
              className="inline-flex min-h-12 items-center rounded-full bg-white px-[26px] text-[15px] font-bold text-dc-brand-deep transition-opacity hover:opacity-90"
            >
              Ürünleri incele
            </Link>
          </div>
          <div role="group" aria-label="Mobil uygulama mağazaları — yakında" className="mt-6 grid max-w-[340px] grid-cols-2 gap-3">
            {[{ name: "App Store", Icon: Smartphone }, { name: "Google Play", Icon: Play }].map(({ name, Icon }) => (
              <div key={name} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-3 text-white sm:gap-3 sm:px-4">
                <Icon size={22} strokeWidth={1.6} aria-hidden="true" className="flex-none text-[#DCEAE4]" />
                <div>
                  <span className="block text-[13px] font-semibold leading-tight sm:text-[15px]">{name}</span>
                  <span className="mt-1 block text-[11.5px] font-medium text-[#7FD3AF]">Yakında</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-[#B6CEC4]">
            Şimdiden telefonundan veya bilgisayarından tarayıcıyla paneline erişebilirsin.
          </p>
        </div>

        <figure className="relative mx-auto mt-10 w-full max-w-[440px] pb-8 lg:my-auto lg:py-10">
          <div className="relative isolate h-[365px] sm:h-[470px]">
            <div className="absolute left-1 top-10 z-10 w-[140px] -rotate-[9deg] sm:left-0 sm:w-[190px] [&>div]:w-full!">
              <AppScreen product="yon" />
            </div>
            <div className="absolute right-1 top-10 z-10 w-[140px] rotate-[9deg] sm:right-0 sm:w-[190px] [&>div]:w-full!">
              <AppScreen product="deneme" />
            </div>
            <div className="absolute left-1/2 top-0 z-20 w-[170px] -translate-x-1/2 sm:w-[220px] [&>div]:w-full! [&>div]:drop-shadow-[0_24px_28px_rgba(0,0,0,0.28)]">
              <AppScreen product="od" />
            </div>
          </div>
          <figcaption className="mt-5 text-center text-[11px] leading-relaxed text-[#B6CEC4]">
            <span className="block font-medium text-[#DCEAE4]">Yön Koçluk · onlinedershanem · Deneme Ligi</span>
            <span className="mt-1 block">Gerçek uygulama ekranları · Örnek öğrenci verileri</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
