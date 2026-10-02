import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

/**
 * 09 PLATFORM ÖN İZLEMESİ — onaylı tasarım (Web.dc.html).
 * Koyu yeşil banner + telefon mockup'ı. Mockup mobilde de görünür (bannerın
 * altından taşar); masaüstünde sağ kolonda alttan kırpılır.
 */
const points = [
  "Bugünkü çalışmalarını tek yerde gör",
  "Haftalık planını takip et",
  "Deneme sonucundan eksik konulara dön",
];

export function PlatformPreview() {
  return (
    <section className="site-container py-[var(--dc-section)]">
      <div className="relative grid overflow-hidden rounded-dc-banner dc-surface-deep bg-dc-brand-deep px-6 pt-10 sm:px-14 sm:pt-14 lg:grid-cols-[1fr_440px] lg:gap-8">
        <div className="pb-2 lg:pb-14">
          <p className="dc-eyebrow !text-[#7FD3AF]">Öğrenci paneli</p>

          <h2 className="mt-4 font-display text-[length:var(--public-title)] leading-[1.12] tracking-[-0.025em] text-white">
            Dersinden denemene,
            <br />
            gelişimin tek yerde.
          </h2>
          <p className="mt-4 max-w-[440px] text-[16.5px] leading-[1.65] text-[#B6CEC4]">
            Panel telefonda ve bilgisayarda tarayıcıdan açılır; uygulama
            indirmen gerekmez.
          </p>

          <ul className="mt-6 max-w-[460px] space-y-2.5 border-t border-[rgba(255,255,255,.14)] pt-5">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-[15.5px] font-medium leading-[1.5] text-[#DCEAE4]"
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
            <p className="max-w-[340px] text-[13.5px] leading-[1.55] text-[var(--dc-on-deep-faint)]">
              <strong className="font-semibold text-white">Ana ekrana ekle</strong>
              : iPhone&apos;da Safari&apos;nin Paylaş menüsünden, Android&apos;de
              tarayıcı menüsünden &quot;Ana ekrana ekle&quot;yi seç; panel
              uygulama gibi açılır.
            </p>
          </div>
        </div>

        <div className="relative mx-auto mt-8 h-[300px] w-full max-w-[340px] sm:h-[360px] lg:mx-0 lg:mt-0 lg:h-[460px] lg:max-w-none lg:self-end">
          <Image
            src="/design/app-mockup.png"
            alt="Öğrenci panelinin telefondaki ana ekranı: deneme sonucu kartı ve eksik konular listesi"
            width={1145}
            height={1516}
            sizes="(min-width: 1024px) 520px, 340px"
            className="absolute left-1/2 top-0 w-[340px] max-w-none -translate-x-1/2 lg:left-auto lg:right-[-20px] lg:top-auto lg:bottom-[-120px] lg:w-[520px] lg:translate-x-0"
          />
        </div>
      </div>
    </section>
  );
}
