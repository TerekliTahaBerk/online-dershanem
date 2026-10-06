import { listActivePublicProducts } from "@/lib/public-marketing-products-server";
import { yonBrand } from "@/lib/yon-brand";
import { ProductBrandLabel } from "@/components/product/product-brand-label";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import Link from "next/link";
import {
  billingPeriods,
  billingSuffix,
  singleProductPriceLabel,
  type ProductKey,
} from "@/lib/commerce/package-builder-pricing";

/**
 * ÜRÜN KARŞILAŞTIRMA — /urunler sayfasının "yan yana" bölümü.
 *
 * Masaüstünde gerçek bir tablo (satır başlıkları <th scope="row">), mobilde
 * her ürün kendi kartında aynı satırlarla. Fiyatlar paket kurucunun tek
 * kaynağından gelir; tanımsızsa rakam basılmaz. Kapsamın tamamı /paketler
 * sayfasındaki tabloda.
 */

type Column = {
  key: ProductKey;
  name: string;
  href: string;
  cells: Record<RowKey, string>;
};

type RowKey = "job" | "format" | "exams" | "parent";

const rows: { key: RowKey; label: string }[] = [
  { key: "job", label: "Ne işe yarar" },
  { key: "format", label: "Nasıl çalışır" },
  { key: "exams", label: "Sınavlar" },
  { key: "parent", label: "Veli ne görür" },
];

const columns: Column[] = [
  {
    key: "dershanem",
    name: "onlinedershanem.",
    href: "/urunler/online-dershanem",
    cells: {
      job: "Takıldığın konuyu öğretmenle canlı derste kapatırsın.",
      format: "Birebir ya da en fazla 4 kişilik canlı grup dersi",
      exams: "LGS, YKS",
      parent: "Derse katılım ve ders sonrası özet",
    },
  },
  {
    key: "kocum",
    name: yonBrand.shortName,
    href: "/urunler/online-kocum",
    cells: {
      job: "Haftanı koçunla planlar, planın uygulanmasını takip edersin.",
      format: "Haftalık çalışma planı ve birebir koç görüşmeleri",
      exams: "LGS, YKS",
      parent: "Planın uygulanma durumu",
    },
  },
  {
    key: "denemeKulubum",
    name: denemeLigiBrand.name,
    href: "/urunler/online-deneme-kulubum",
    cells: {
      job: "Denemeyle seviyeni ölçer, puanı nerede kaybettiğini görürsün.",
      format: "Gerçek sınav formatında online deneme ve konu analizi",
      exams: "LGS, TYT, AYT",
      parent: "Deneme sonuçları özeti",
    },
  },
];

function priceText(key: ProductKey): string {
  const label = singleProductPriceLabel(key);
  if (!label) return "Ön görüşmede netleşir";
  return `${label.price} ${billingSuffix(billingPeriods[key])}`;
}

export async function ProductCompare() {
  const products = await listActivePublicProducts();
  const visibleColumns = columns.filter((column) => products.some((product) => product.href === column.href));
  return (
    <section
      aria-labelledby="urun-karsilastirma"
      className="site-container py-(--dc-section-tight)"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[640px]">
          <h2
            id="urun-karsilastirma"
            className="font-display text-(length:--public-title) leading-[1.08] tracking-tight text-dc-ink"
          >
            Yan yana karşılaştır
          </h2>
          <p className="mt-3.5 text-[17px] leading-[1.65] text-dc-ink-body">
            Üç ürünün ne yaptığı, nasıl çalıştığı ve tek başına fiyatı.
            Birlikte alındığında paket kurucu toplamı gösterir.
          </p>
        </div>
        <Link
          href="/paketler#kapsam"
          className="inline-flex min-h-11 items-center text-[15px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
        >
          Tüm kapsamı gör
        </Link>
      </div>

      {/* Masaüstü: tablo */}
      <div className="mt-10 hidden overflow-hidden rounded-dc-card border border-dc-line bg-white md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">
            onlinedershanem., onlinekoçum. × Yön Koçluk ve onlinedenemekulübüm. × Deneme Ligi karşılaştırması
          </caption>
          <thead>
            <tr className="border-b border-dc-line bg-dc-surface-muted">
              <td className="w-[180px] p-5" />
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="p-5 text-[17px] font-extrabold text-dc-ink"
                >
                  <ProductBrandLabel href={col.href} fallback={col.name} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-dc-line-soft">
                <th
                  scope="row"
                  className="p-5 align-top text-[14px] font-semibold text-dc-ink-muted"
                >
                  {row.label}
                </th>
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className="p-5 align-top text-[15px] leading-[1.55] text-dc-ink"
                  >
                    {col.cells[row.key]}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-dc-line-soft">
              <th
                scope="row"
                className="p-5 align-top text-[14px] font-semibold text-dc-ink-muted"
              >
                Tek başına fiyatı
              </th>
              {visibleColumns.map((col) => (
                <td
                  key={col.key}
                  className="p-5 align-top text-[17px] font-extrabold text-dc-ink"
                >
                  {priceText(col.key)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-5" />
              {visibleColumns.map((col) => (
                <td key={col.key} className="px-5 pb-5 pt-1">
                  <Link
                    href={col.href}
                    aria-label={`${col.key === "kocum" ? yonBrand.name : col.name} ürününü incele`}
                    className="inline-flex min-h-11 items-center rounded-full border border-dc-line px-5 text-[14.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand hover:text-dc-brand-strong"
                  >
                    İncele
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobil: ürün başına kart */}
      <ul className="mt-8 grid gap-4 md:hidden">
        {visibleColumns.map((col) => (
          <li
            key={col.key}
            className="rounded-dc-card border border-dc-line bg-white p-5"
          >
            <h3 className="text-[19px] font-extrabold text-dc-ink">
                  <ProductBrandLabel href={col.href} fallback={col.name} />
            </h3>
            <dl className="mt-3 divide-y divide-dc-line-soft">
              {rows.map((row) => (
                <div key={row.key} className="py-3">
                  <dt className="text-[13px] font-semibold text-dc-ink-muted">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 text-[15px] leading-[1.55] text-dc-ink">
                    {col.cells[row.key]}
                  </dd>
                </div>
              ))}
              <div className="pt-3">
                <dt className="text-[13px] font-semibold text-dc-ink-muted">
                  Tek başına fiyatı
                </dt>
                <dd className="mt-0.5 text-[17px] font-extrabold text-dc-ink">
                  {priceText(col.key)}
                </dd>
              </div>
            </dl>
            <Link
              href={col.href}
              aria-label={`${col.key === "kocum" ? yonBrand.name : col.name} ürününü incele`}
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-dc-line px-5 text-[14.5px] font-bold text-dc-ink"
            >
              İncele
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
