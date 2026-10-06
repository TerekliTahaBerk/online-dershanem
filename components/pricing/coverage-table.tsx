import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { FALLBACK_PUBLIC_PRODUCT_CODES } from "@/lib/public-marketing-products";
import { yonBrand } from "@/lib/yon-brand";
import { ProductBrandLabel } from "@/components/product/product-brand-label";
import { Fragment } from "react";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";

/**
 * PAKETLERİN TÜM KAPSAMI — onaylı tasarım (Web.dc.html → isPack #kapsam).
 *
 * ERİŞİLEBİLİRLİK DÜZELTMESİ (§38): tasarım bu tabloyu `div`/`span` ile
 * çiziyor. Burada gerçek `<table>` + `scope` başlıkları kullanıldı; ✓/—
 * yalnız görsel işaret olduğu için her hücrede ekran okuyucuya yönelik
 * metin de var. Geniş ekranlarda tablo, dar ekranlarda ürün başlıklı
 * açılır listeler gösterilir (tasarım notu: "Mobilde bu tablo ürün
 * başlıklarına göre açılır listeye dönüşür").
 */

const products = [
  "onlinedershanem.",
  yonBrand.shortName,
  denemeLigiBrand.name,
] as const;

type Row =
  | { label: string; on: readonly [boolean, boolean, boolean] }
  | {
      label: string;
      values: readonly [string, string, string];
    };

const groups: { title: string; rows: Row[] }[] = [
  {
    title: "Ders ve içerik",
    rows: [
      {
        label: "Canlı ders (birebir ya da en fazla 4 kişi)",
        on: [true, false, false],
      },
      { label: "Paket fiyatına dahil bir ders", on: [true, false, false] },
      { label: "Ek ders ekleme", on: [true, false, false] },
      { label: "Ders sonrası öğretmen notu", on: [true, false, false] },
    ],
  },
  {
    title: "Planlama ve takip",
    rows: [
      { label: "Haftalık çalışma planı", on: [false, true, false] },
      { label: "Birebir koç görüşmesi", on: [false, true, false] },
      {
        label: "Planın ne kadarının yapıldığı takibi",
        on: [false, true, false],
      },
      { label: "Tüm dersleri kapsayan planlama", on: [false, true, false] },
    ],
  },
  {
    title: "Deneme ve analiz",
    rows: [
      { label: "LGS denemeleri", on: [false, false, true] },
      { label: "TYT ve AYT denemeleri", on: [false, false, true] },
      {
        label: "Konu ve soru tipine göre kayıp analizi",
        on: [false, false, true],
      },
      { label: "Denemeler arası gelişim takibi", on: [false, false, true] },
    ],
  },
  {
    title: "Veliye sunulanlar",
    rows: [
      { label: "Derse katılım ve ders sonrası özet", on: [true, false, false] },
      { label: "Planın uygulanma durumu", on: [false, true, false] },
      { label: "Deneme sonuçları özeti", on: [false, false, true] },
    ],
  },
  {
    title: "Dino AI",
    rows: [
      { label: "Ders sonrası tekrar önerisi", on: [true, false, false] },
      { label: "Koça haftalık odak önerisi", on: [false, true, false] },
      { label: "Deneme sonucu yorumu", on: [false, false, true] },
      {
        label: "Ürünler arası bilgi aktarımı (iki ve üç ürün alındığında)",
        on: [true, true, true],
      },
    ],
  },
  {
    title: "Erişim ve kullanım",
    rows: [
      {
        label: "Web üzerinden kullanım (mobil tarayıcı dahil)",
        on: [true, true, true],
      },
      { label: "Faturalama dönemi", values: ["aylık", "aylık", "dönemsel"] },
    ],
  },
];

function Mark({ on }: { on: boolean }) {
  return on ? (
    <>
      <span
        aria-hidden="true"
        className="text-[15px] font-bold text-dc-brand-strong"
      >
        ✓
      </span>
      <span className="sr-only">var</span>
    </>
  ) : (
    <>
      <span aria-hidden="true" className="text-[#C3CCC7]">
        —
      </span>
      <span className="sr-only">yok</span>
    </>
  );
}

export function CoverageTable({ activeRegistryCodes = FALLBACK_PUBLIC_PRODUCT_CODES }: { activeRegistryCodes?: readonly string[] } = {}) {
  const codes = ["OD", "OK", "ODK"];
  const visibleProducts = products.map((name, index) => ({ name, index })).filter((product) => activeRegistryCodes.includes(codes[product.index]));
  const dinoEnabled = getPanelFeatureFlags().dinoAi;
  const dino = getDinoMarketingCopy(dinoEnabled);
  const visibleGroups = groups.filter((group) => group.title !== "Dino AI" || dinoEnabled);
  return (
    <>
      {/* Masaüstü — gerçek tablo */}
      <div className="mt-8 hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Üç ürünün kapsam karşılaştırması
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-auto pb-3.5" />
              {visibleProducts.map(({ name: p, index: pi }) => (
                <th
                  key={p}
                  scope="col"
                  className="w-[150px] pb-3.5 text-center text-[13px] font-bold text-dc-ink"
                >
                  <ProductBrandLabel href={pi === 1 ? yonBrand.href : pi === 2 ? denemeLigiBrand.href : "/urunler/online-dershanem"} fallback={p} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map((g) => (
              <Fragment key={g.title}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={visibleProducts.length + 1}
                    className="pb-1 pt-8 text-left text-[13px] font-bold uppercase tracking-[0.08em] text-dc-brand-strong"
                  >
                    {g.title}
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.label} className="border-b border-dc-line-soft">
                    <th
                      scope="row"
                      className="py-3.5 pr-6 text-left text-[15px] font-medium text-(--pd-ink-3)"
                    >
                      {r.label}
                    </th>
                    {"on" in r
                      ? r.on.flatMap((v, i) => activeRegistryCodes.includes(codes[i]) ? [v] : []).map((v, i) => (
                          <td key={i} className="py-3.5 text-center">
                            <Mark on={v} />
                          </td>
                        ))
                      : r.values.flatMap((v, i) => activeRegistryCodes.includes(codes[i]) ? [v] : []).map((v, i) => (
                          <td
                            key={i}
                            className="py-3.5 text-center text-[14px] font-medium text-dc-ink-muted"
                          >
                            {v}
                          </td>
                        ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil — ürün başlıklarına göre açılır liste */}
      <div className="mt-8 flex flex-col gap-2.5 lg:hidden">
        {visibleProducts.map(({ name: p, index: pi }) => (
          <details
            key={p}
            className="dc-faq rounded-dc-card-sm border border-dc-line bg-white px-5 py-[18px]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold text-dc-ink">
                  <ProductBrandLabel href={pi === 1 ? yonBrand.href : pi === 2 ? denemeLigiBrand.href : "/urunler/online-dershanem"} fallback={p} />
              <span
                aria-hidden="true"
                className="dc-faq-plus flex-none text-[20px] font-normal leading-none text-dc-brand-strong transition-transform"
              >
                +
              </span>
            </summary>

            {visibleGroups.map((g) => {
              const included = g.rows.filter((r) =>
                "on" in r ? r.on[pi] : true,
              );
              if (!included.length) return null;
              return (
                <div key={g.title} className="mt-4">
                  <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-dc-brand-strong">
                    {g.title}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {included.map((r) => (
                      <li
                        key={r.label}
                        className="text-[14.5px] leading-[1.55] text-dc-ink-muted"
                      >
                        {"on" in r ? r.label : `${r.label}: ${r.values[pi]}`}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </details>
        ))}
      </div>

      <p className="mt-5 max-w-3xl text-[14px] leading-7 text-dc-ink-muted">{dino.description}</p>
      <p className="mt-4 text-[12.5px] text-dc-ink-ghost">
        Ders saatleri ve grup günleri öğrencinin yerleştiği gruba göre değişir;
        ön görüşmede netleşir.
      </p>
    </>
  );
}
