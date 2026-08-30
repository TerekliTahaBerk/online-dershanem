import { PackageBuilder } from "@/components/pricing/package-builder";

/**
 * 08 PAKET KURUCU — onaylı tasarım (Web.dc.html).
 * #F4F8F6 zemin; ana sayfadaki kurucu, /paketler sayfasındakiyle AYNI
 * bileşendir (tasarımda da aynı kurgu tekrarlanır) — ikinci bir kopya yazılmaz.
 */
export function BundleSection() {
  return (
    <section
      id="paket-kurucu"
      className="scroll-mt-20 border-y border-[#E7EDE9] bg-dc-surface-muted py-[var(--dc-section)]"
    >
      <div className="site-container">
        <div className="max-w-[660px]">
          <h2 className="font-display text-[length:var(--public-title)] leading-[1.08] tracking-[-0.025em] text-dc-ink">
            Paketini ihtiyacına göre oluştur
          </h2>
          <p className="mt-4 text-[17px] leading-[1.65] text-dc-ink-body">
            Tek üründen başlayabilir, iki ürünü birlikte tamamlayabilir veya üç ürünü
            aynı pakette birleştirebilirsin. Seçimin ve teklifin tek bir akışta görünür.
          </p>
        </div>
      </div>

      <div className="mt-9">
        <PackageBuilder />
      </div>
    </section>
  );
}
