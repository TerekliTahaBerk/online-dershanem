"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { trackConversionEvent } from "@/lib/tracking";
import {
  billingSuffix,
  builderContactQuery,
  discountPercent,
  formatCents,
  lessonSubjects,
  resolveBuilderCheckout,
  resolvePackageQuote,
  type BuilderSelection,
  type ExamTrack,
  type LessonFormat,
  type ProductKey,
} from "@/lib/commerce/package-builder-pricing";

/**
 * PAKET KURUCU — onaylı tasarım (Web.dc.html → isPack).
 *
 * Tasarımın 8 seçim durumunu uygular: 0 seçim → tek ürün (3 durum) →
 * ikili kombinasyonlar (3 durum) → üç ürün. Fiyat verisi
 * `lib/commerce/package-builder-pricing.ts` içinden gelir; burada hiçbir
 * fiyat veya indirim oranı hesaplanmaz/uydurulmaz.
 *
 * ERİŞİLEBİLİRLİK SAPMASI (§38/§49): tasarımda ürün kartının tamamı
 * `role="button"` ve İÇİNDE ayrı bir `<button>` var — iç içe etkileşimli
 * öğe geçersizdir ve klavye/ekran okuyucuda bozuktur. Görsel kurgu korunarak
 * kart başlığı tek bir gerçek `<button aria-pressed>` yapıldı; sağdaki pill
 * yalnızca görsel göstergedir; Dershanem yapılandırması butonun DIŞINDA,
 * kartın içinde yer alır.
 */

const productCopy = {
  dershanem: {
    glyph: "▶",
    title: "Online Dershanem",
    summary: "LGS ve YKS için canlı online dersler.",
    tracks: ["LGS", "YKS"],
    points: [
      "Birebir ya da en fazla 4 kişilik canlı ders",
      "Ders sonrası öğretmen notu ve çalışma yönü",
      "Derse katılım ve ilerlemede veli görünümü",
      "Dino AI ders analizi",
    ],
  },
  kocum: {
    glyph: "▦",
    title: "Online Koçum",
    summary: "Haftalık plan, birebir takip ve eğitim koçluğu. Tüm dersleri kapsar.",
    tracks: ["LGS", "YKS"],
    points: [
      "Haftalık çalışma planı",
      "Birebir koç görüşmeleri",
      "Planın ne kadarının yapıldığının takibi",
      "Dino AI'ın koça verdiği haftalık odak önerisi",
    ],
  },
  denemeKulubum: {
    glyph: "◔",
    title: "Online Deneme Kulübüm",
    summary: "LGS, TYT ve AYT denemeleri ve sonuç analizi.",
    tracks: ["LGS", "TYT", "AYT"],
    points: [
      "Gerçek sınav formatında denemeler",
      "Konu ve soru tipine göre kayıp analizi",
      "Denemeler arası gelişim karşılaştırması",
      "Dino AI deneme yorumu",
    ],
  },
} as const satisfies Record<
  ProductKey,
  {
    glyph: string;
    title: string;
    summary: string;
    tracks: readonly string[];
    points: readonly string[];
  }
>;

/** Tasarımdaki cross-sell metinleri — seçim sayısına ve eksik ürüne göre. */
function crossSellText(selection: BuilderSelection, count: number): string | null {
  if (count === 1) {
    if (selection.dershanem)
      return "Koçluğu da eklersen haftalık plan ve düzenli takip pakete dahil olur; toplam fiyat da ayrı almaktan düşük olur.";
    if (selection.kocum)
      return "Canlı dersi de eklersen planda eksik kalan konuyu öğretmenle çalışırsın; toplam fiyat da ayrı almaktan düşük olur.";
    return "Canlı dersi de eklersen denemede çıkan eksik konuyu öğretmenle kapatırsın; toplam fiyat da ayrı almaktan düşük olur.";
  }
  if (count === 2) {
    if (!selection.denemeKulubum)
      return "Deneme Kulübü'nü eklediğinde ölçme ve analiz de aynı pakete girer; toplam avantajın artar.";
    if (!selection.kocum)
      return "Koçluğu eklediğinde haftalık plan da aynı pakete girer; toplam avantajın artar.";
    return "Canlı dersi eklediğinde konu anlatımı da aynı pakete girer; toplam avantajın artar.";
  }
  return null;
}

function hintText(count: number): string {
  if (count === 0) return "Nereden başlamak istiyorsun?";
  if (count === 1) return "İkinci ürünü eklediğinde paket avantajı başlar.";
  if (count === 2) return "Üçüncü ürünü eklediğinde toplam avantajın artar.";
  return "Üç ürünü birlikte kullanıyorsun: en avantajlı toplam.";
}

export function PackageBuilder() {
  const [selection, setSelection] = useState<BuilderSelection>({
    exam: null,
    dershanem: false,
    kocum: false,
    denemeKulubum: false,
    format: "grup",
    subject: null,
    extraSubjects: [],
  });

  const quote = useMemo(() => resolvePackageQuote(selection), [selection]);
  const count = quote.selectedCount;
  const subjects = selection.exam ? lessonSubjects[selection.exam] : [];

  // Seçim gerçekten satın alınabiliyorsa CTA sepete gider; aksi halde seçimi
  // taşıyarak ön görüşmeye. Sınır `resolveBuilderCheckout` içinde tanımlıdır.
  const router = useRouter();
  const { add } = useCart();
  const checkoutItem = useMemo(() => resolveBuilderCheckout(selection), [selection]);

  const startCheckout = () => {
    if (!checkoutItem) return;
    add({
      id: checkoutItem.id,
      name: checkoutItem.name,
      category: checkoutItem.category,
      subject: checkoutItem.subject,
      priceCents: checkoutItem.priceCents,
      priceLabel: checkoutItem.priceLabel,
    });
    trackConversionEvent("purchase_cta_click", {
      source: "package_builder",
      packageName: checkoutItem.name,
    });
    router.push("/sepet");
  };

  const pickExam = (exam: ExamTrack) =>
    setSelection((s) => ({
      ...s,
      exam,
      subject: lessonSubjects[exam][0] ?? null,
      extraSubjects: [],
    }));

  const toggleProduct = (key: ProductKey) =>
    setSelection((s) => ({ ...s, [key]: !s[key] }));

  const setFormat = (format: LessonFormat) => setSelection((s) => ({ ...s, format }));

  const toggleExtra = (subject: string) =>
    setSelection((s) => ({
      ...s,
      extraSubjects: s.extraSubjects.includes(subject)
        ? s.extraSubjects.filter((x) => x !== subject)
        : [...s.extraSubjects, subject],
    }));

  return (
    <div className="site-container">
      {/* 1 — Sınav seçimi */}
      <div className="rounded-dc-card border border-dc-line bg-white p-6 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-extrabold text-dc-ink">
              1. Hangi sınava gireceksin?
            </h2>
            <p className="mt-1 text-[14.5px] text-dc-ink-muted">
              Ders listesi, plan ve deneme içerikleri bu seçime göre gelir.
            </p>
          </div>
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-dc-ink-faint">
            {selection.exam ? `${selection.exam} hedefine göre kurgulanıyor` : "Önce hedef sınavını seç"}
          </span>
        </div>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          {(
            [
              { exam: "LGS" as const, title: "LGS sınavına gireceğim", note: "8. sınıf · LGS hazırlığı" },
              { exam: "YKS" as const, title: "YKS sınavına gireceğim", note: "TYT ve AYT hazırlığı" },
            ]
          ).map(({ exam, title, note }) => {
            const active = selection.exam === exam;
            return (
              <button
                key={exam}
                type="button"
                onClick={() => pickExam(exam)}
                aria-pressed={active}
                className={`flex items-start gap-3 rounded-dc-card-sm border p-4 text-left transition-colors ${
                  active
                    ? "border-2 border-dc-brand bg-dc-brand-soft"
                    : "border-dc-line bg-white hover:border-dc-brand-soft-line"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full border text-[11px] ${
                    active
                      ? "border-dc-brand bg-dc-brand-strong text-white"
                      : "border-dc-line text-transparent"
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>
                  <span className="block text-[17px] font-bold text-dc-ink">{title}</span>
                  <span className="mt-0.5 block text-[13.5px] font-medium text-dc-ink-muted">
                    {note}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2 — Ürün seçimi */}
      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-[20px] font-extrabold text-dc-ink">2. Ürünlerini seç</h2>
        <a
          href="#kapsam"
          className="text-[14.5px] font-semibold text-dc-brand-strong hover:text-dc-brand-hover"
        >
          Paketlerin tüm kapsamı ↓
        </a>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          {(Object.keys(productCopy) as ProductKey[]).map((key) => {
            const copy = productCopy[key];
            const line = quote.lines.find((l) => l.product === key)!;
            const active = selection[key];

            return (
              <div
                key={key}
                className={`rounded-dc-card border bg-white transition-colors ${
                  active ? "border-2 border-dc-brand" : "border-dc-line"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleProduct(key)}
                  aria-pressed={active}
                  className="flex w-full flex-wrap items-start gap-4 p-5 text-left sm:flex-nowrap sm:gap-[18px] sm:p-6"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-[52px] w-[52px] flex-none place-items-center rounded-[14px] bg-dc-brand-soft text-[20px]"
                  >
                    {copy.glyph}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[21px] font-extrabold text-dc-ink">
                      {copy.title}
                    </span>
                    <span className="mt-1 block text-[15px] leading-[1.55] text-dc-ink-muted">
                      {copy.summary}
                    </span>
                    <span className="mt-2.5 flex flex-wrap gap-1.5">
                      {copy.tracks.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-dc-brand-soft px-2.5 py-1 text-[11.5px] font-semibold text-dc-brand-hover"
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                    <span className="mt-3 block text-[14.5px] font-medium leading-[1.85] text-[var(--pd-ink-3)]">
                      {copy.points.map((p) => (
                        <span key={p} className="block">
                          {p}
                        </span>
                      ))}
                    </span>
                  </span>

                  {/* Mobilde fiyat + durum kendi satırında; sm'den itibaren
                      tasarımdaki gibi sağ sütun. */}
                  <span className="flex w-full flex-none items-center justify-between gap-3 border-t border-dc-line-soft pt-3.5 sm:block sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
                    <span className="block">
                      {line.cents !== null ? (
                        <>
                          {/* Kampanya öncesi liste fiyatı — yalnızca gerçekten
                              yüksekse basılır. */}
                          {line.listCents !== null && line.listCents > line.cents ? (
                            <span className="mb-0.5 flex items-baseline gap-1.5 sm:justify-end">
                              <span className="text-[13px] font-semibold text-dc-ink-faint line-through">
                                {formatCents(line.listCents)}
                              </span>
                              <span className="rounded-full bg-dc-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-dc-brand-hover">
                                %{discountPercent(line.listCents, line.cents)} indirim
                              </span>
                            </span>
                          ) : null}
                          <span className="block text-[24px] font-extrabold text-dc-ink">
                            {formatCents(line.cents)}
                          </span>
                          <span className="block text-[12.5px] font-medium text-dc-ink-faint">
                            {billingSuffix(line.billing)}
                          </span>
                        </>
                      ) : (
                        <span className="block text-[12.5px] font-medium leading-[1.5] text-dc-ink-faint sm:max-w-[110px]">
                          Fiyat ön görüşmede netleşir
                        </span>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`inline-block flex-none rounded-full px-3.5 py-2 text-[13px] font-bold sm:mt-2.5 ${
                        active
                          ? "bg-dc-brand-strong text-white"
                          : "border border-dc-line text-dc-ink"
                      }`}
                    >
                      {active ? "Pakette" : "Ekle"}
                    </span>
                  </span>
                </button>

                {/* Dershanem yapılandırması — toggle butonunun DIŞINDA */}
                {key === "dershanem" && active ? (
                  <div className="mx-5 mb-6 border-t border-dashed border-dc-brand-soft-line pt-[18px] sm:mx-6">
                    <fieldset>
                      <legend className="text-[14.5px] font-bold text-dc-ink">
                        Ders formatını seç
                      </legend>
                      <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            { value: "grup" as const, title: "Maks. 4 kişilik grup", note: "Küçük grupta canlı ders" },
                            { value: "birebir" as const, title: "Birebir özel ders", note: "Öğretmenle bire bir" },
                          ]
                        ).map(({ value, title, note }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFormat(value)}
                            aria-pressed={selection.format === value}
                            className={`rounded-dc-card-sm border p-3.5 text-left transition-colors ${
                              selection.format === value
                                ? "border-2 border-dc-brand bg-dc-brand-soft"
                                : "border-dc-line hover:border-dc-brand-soft-line"
                            }`}
                          >
                            <span className="block text-[15.5px] font-bold text-dc-ink">{title}</span>
                            <span className="mt-0.5 block text-[13px] font-medium text-dc-ink-muted">
                              {note}
                            </span>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {selection.exam ? (
                      <>
                        <fieldset className="mt-5">
                          <legend className="flex flex-wrap items-center gap-2.5 text-[14.5px] font-bold text-dc-ink">
                            Dersini seç
                            <span className="rounded-full bg-dc-brand-soft px-2.5 py-1 text-[11.5px] font-semibold text-dc-brand-hover">
                              Paket fiyatına 1 ders dahil
                            </span>
                          </legend>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {subjects.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSelection((prev) => ({ ...prev, subject: s }))}
                                aria-pressed={selection.subject === s}
                                className={`rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${
                                  selection.subject === s
                                    ? "border-dc-brand bg-dc-brand-strong text-white"
                                    : "border-dc-line text-dc-ink hover:border-dc-brand"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </fieldset>

                        <fieldset className="mt-5">
                          <legend className="text-[14.5px] font-bold text-dc-ink">
                            Ek ders ekle{" "}
                            <span className="text-[13px] font-medium text-dc-ink-faint">
                              · opsiyonel, her ek ders pakete eklenir
                            </span>
                          </legend>
                          {subjects.filter((s) => s !== selection.subject).length ? (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {subjects
                                .filter((s) => s !== selection.subject)
                                .map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => toggleExtra(s)}
                                    aria-pressed={selection.extraSubjects.includes(s)}
                                    className={`rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition-colors ${
                                      selection.extraSubjects.includes(s)
                                        ? "border-dc-brand bg-dc-brand-strong text-white"
                                        : "border-dc-line text-dc-ink hover:border-dc-brand"
                                    }`}
                                  >
                                    + {s}
                                  </button>
                                ))}
                            </div>
                          ) : (
                            <p className="mt-2.5 text-[13.5px] leading-[1.6] text-dc-ink-muted">
                              {selection.exam} için tek ders açık.
                            </p>
                          )}
                        </fieldset>
                      </>
                    ) : (
                      <p className="mt-5 text-[13.5px] leading-[1.6] text-dc-ink-muted">
                        Ders seçebilmek için önce hedef sınavını seç.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* Avantaj kademeleri — 3 basamaklı gösterge */}
          <div className="grid gap-5 px-1 pt-1 sm:grid-cols-3 sm:gap-6">
            {[
              { tier: 1, label: "1 ürün — standart fiyat" },
              { tier: 2, label: "2 ürün — toplam daha az" },
              { tier: 3, label: "3 ürün — en düşük toplam" },
            ].map(({ tier, label }) => (
              <div key={tier}>
                <div
                  aria-hidden="true"
                  className={`h-1.5 rounded-full ${count >= tier ? "bg-dc-brand" : "bg-dc-line"}`}
                />
                <p className="mt-2.5 text-[13px] font-medium text-dc-ink-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky özet */}
        <aside
          aria-label="Paket özeti"
          className="rounded-dc-card border border-dc-line bg-white p-6 shadow-dc-sticky lg:sticky lg:top-[92px]"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-dc-ink-faint">
                Paketin
              </div>
              <div className="mt-1 text-[13px] font-bold text-dc-brand-hover">
                {selection.exam ? `${selection.exam} hedefi` : "Sınav seçilmedi"}
              </div>
            </div>
            {count === 3 ? (
              <span className="rounded-full bg-dc-brand-soft px-3 py-1.5 text-[12px] font-bold text-dc-brand-hover">
                En Avantajlı
              </span>
            ) : null}
          </div>

          <ul className="mt-4 flex flex-col gap-2.5">
            {quote.lines.map((line) => (
              <li key={line.product}>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] ${
                      line.selected
                        ? "bg-dc-brand-strong text-white"
                        : "border border-dc-line text-transparent"
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span
                    className={`text-[14px] ${
                      line.selected
                        ? "font-semibold text-dc-ink"
                        : "font-medium text-dc-ink-faint"
                    }`}
                  >
                    {line.label}
                  </span>
                  <span className="ml-auto text-[13.5px] font-semibold text-dc-ink-faint">
                    {line.cents !== null ? formatCents(line.cents) : "—"}
                  </span>
                </div>

                {line.product === "dershanem" && line.selected ? (
                  <>
                    <p className="ml-[30px] mt-1 text-[12.5px] leading-[1.5] text-dc-ink-faint">
                      {selection.format === "birebir" ? "Birebir özel ders" : "Maks. 4 kişilik grup"}
                      {" · "}
                      {selection.subject ?? "ders seçilmedi"}
                    </p>
                    {selection.extraSubjects.length ? (
                      <p className="ml-[30px] mt-1 text-[12.5px] font-semibold text-dc-brand-hover">
                        +{selection.extraSubjects.length} ek ders:{" "}
                        {selection.extraSubjects.join(", ")}
                      </p>
                    ) : null}
                  </>
                ) : null}

                {line.product === "kocum" && line.selected ? (
                  <p className="ml-[30px] mt-1 text-[12.5px] leading-[1.5] text-dc-ink-faint">
                    Tüm dersleri kapsar
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="my-5 h-px bg-dc-line-soft" />

          <div className="text-[13.5px] font-medium text-dc-ink-muted">
            {count <= 1 ? "Tek ürün fiyatı" : "Paket fiyatı"}
          </div>

          {quote.priceResolved && quote.bundleTotalCents !== null ? (
            <div className="mt-0.5 text-[34px] font-extrabold tracking-[-0.025em] text-dc-ink">
              {formatCents(quote.bundleTotalCents)}
            </div>
          ) : (
            <div className="mt-1 text-[15px] font-semibold leading-[1.5] text-dc-ink">
              {count === 0 ? "Henüz ürün seçilmedi" : "Fiyat ön görüşmede netleşir"}
            </div>
          )}

          <p className="mt-1.5 text-[12.5px] leading-[1.6] text-dc-ink-faint">
            Ders ve koçluk aylık, deneme kulübü dönemsel faturalanır. Farklı dönemler
            özet içinde ayrı gösterilir.
          </p>

          {/* İndirim dökümü — hangi rakamın nereden geldiği açıkça yazılır:
              liste fiyatı, kalem bazlı kampanya, birlikte alma indirimi. */}
          {quote.priceResolved &&
          quote.listTotalCents !== null &&
          quote.savingsCents !== null &&
          quote.savingsCents > 0 ? (
            <dl className="mt-3.5 flex flex-col gap-1.5 rounded-dc-card-sm border border-dc-line-soft px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[13px] text-dc-ink-faint">Liste fiyatı</dt>
                <dd className="text-[14px] text-dc-ink-faint line-through">
                  {formatCents(quote.listTotalCents)}
                </dd>
              </div>

              {quote.campaignSavingsCents !== null && quote.campaignSavingsCents > 0 ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] text-dc-ink-muted">Kampanya indirimi</dt>
                  <dd className="text-[14px] font-semibold text-dc-brand-hover">
                    −{formatCents(quote.campaignSavingsCents)}
                  </dd>
                </div>
              ) : null}

              {quote.bundleDiscountCents !== null && quote.bundleDiscountCents > 0 ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] text-dc-ink-muted">
                    Paket indirimi
                    <span className="block text-[11.5px] text-dc-ink-faint">
                      {count} ürünü birlikte aldığın için
                    </span>
                  </dt>
                  <dd className="text-[14px] font-semibold text-dc-brand-hover">
                    −{formatCents(quote.bundleDiscountCents)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {quote.savingsCents !== null && quote.savingsCents > 0 ? (
            <div className="mt-3 flex items-center justify-between rounded-dc-card-sm bg-dc-brand-soft px-3.5 py-2.5">
              <span className="text-[13.5px] font-semibold text-dc-brand-hover">
                Toplam avantajın
              </span>
              <span className="text-[15px] font-extrabold text-dc-brand-hover">
                {formatCents(quote.savingsCents)}
              </span>
            </div>
          ) : null}

          {/* Pasif durum opaklıkla değil, kendi erişilebilir tonuyla:
              yeşilin üstüne opacity uygulanınca beyaz metin 2.1:1'e düşüyordu. */}
          {count === 0 ? (
            <span
              aria-disabled="true"
              className="mt-5 flex w-full items-center justify-center rounded-full border border-dc-line bg-dc-surface-muted px-5 py-3 text-[15px] font-bold text-dc-ink-muted"
            >
              Bu Paketle Başla
            </span>
          ) : checkoutItem ? (
            <button type="button" onClick={startCheckout} className="site-btn site-btn-primary mt-5 w-full">
              Bu Paketle Başla
            </button>
          ) : (
            <Link
              href={`/iletisim/${builderContactQuery(selection)}`}
              className="site-btn site-btn-primary mt-5 w-full"
            >
              {quote.priceResolved ? "Bu Paketle Devam Et" : "Ön Görüşme Talep Et"}
            </Link>
          )}

          {/* Neden bazı yapılandırmalar doğrudan ödemeye gitmiyor — kullanıcı
              CTA'nın neden değiştiğini görebilsin. */}
          {count > 0 && !checkoutItem ? (
            <p className="mt-2.5 text-center text-[12px] leading-[1.5] text-dc-ink-faint">
              {selection.dershanem && !selection.kocum && !selection.denemeKulubum
                ? "Birebir ders ve ek ders yapılandırmaları ön görüşmede kesinleşir."
                : "Koçluk ve Deneme Kulübü için online kayıt akışı yayına alınmadan ödeme almıyoruz."}
            </p>
          ) : null}

          <p className="mt-3 text-center text-[12.5px] font-medium leading-[1.5] text-dc-ink-faint">
            {hintText(count)}
          </p>

          {crossSellText(selection, count) ? (
            <p className="mt-4 border-t border-dc-line-soft pt-4 text-[13.5px] leading-[1.6] text-dc-ink-muted">
              {crossSellText(selection, count)}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
