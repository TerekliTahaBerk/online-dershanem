import { Fragment } from "react";

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

const products = ["Online Dershanem", "Online Koçum", "Deneme Kulübüm"] as const;

type Row = { label: string; on: readonly [boolean, boolean, boolean] } | {
  label: string;
  values: readonly [string, string, string];
};

const groups: { title: string; rows: Row[] }[] = [
  {
    title: "Ders ve içerik",
    rows: [
      { label: "Canlı ders (birebir ya da en fazla 4 kişi)", on: [true, false, false] },
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
      { label: "Planın ne kadarının yapıldığı takibi", on: [false, true, false] },
      { label: "Tüm dersleri kapsayan planlama", on: [false, true, false] },
    ],
  },
  {
    title: "Deneme ve analiz",
    rows: [
      { label: "LGS denemeleri", on: [false, false, true] },
      { label: "TYT ve AYT denemeleri", on: [false, false, true] },
      { label: "Konu ve soru tipine göre kayıp analizi", on: [false, false, true] },
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
      { label: "Web üzerinden kullanım (mobil tarayıcı dahil)", on: [true, true, true] },
      { label: "Faturalama dönemi", values: ["aylık", "aylık", "dönemsel"] },
    ],
  },
];

function Mark({ on }: { on: boolean }) {
  return on ? (
    <>
      <span aria-hidden="true" className="text-[15px] font-bold text-dc-brand-strong">
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

export function CoverageTable() {
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
              {products.map((p) => (
                <th
                  key={p}
                  scope="col"
                  className="w-[150px] pb-3.5 text-center text-[13px] font-bold text-dc-ink"
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.title}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={4}
                    className="pb-1 pt-8 text-left text-[13px] font-bold uppercase tracking-[0.08em] text-dc-brand-strong"
                  >
                    {g.title}
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.label} className="border-b border-dc-line-soft">
                    <th
                      scope="row"
                      className="py-3.5 pr-6 text-left text-[15px] font-medium text-[var(--pd-ink-3)]"
                    >
                      {r.label}
                    </th>
                    {"on" in r
                      ? r.on.map((v, i) => (
                          <td key={i} className="py-3.5 text-center">
                            <Mark on={v} />
                          </td>
                        ))
                      : r.values.map((v, i) => (
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
        {products.map((p, pi) => (
          <details
            key={p}
            className="dc-faq rounded-dc-card-sm border border-dc-line bg-white px-5 py-[18px]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold text-dc-ink">
              {p}
              <span
                aria-hidden="true"
                className="dc-faq-plus flex-none text-[20px] font-normal leading-none text-dc-brand-strong transition-transform"
              >
                +
              </span>
            </summary>

            {groups.map((g) => {
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

      <p className="mt-4 text-[12.5px] text-dc-ink-ghost">
        Kapsam satırları ürün ekibi onayıyla kesinleşecek.
      </p>
    </>
  );
}
