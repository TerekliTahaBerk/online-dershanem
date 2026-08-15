import Link from "next/link";

/**
 * 04 ÜÇ ÜRÜN — onaylı tasarım (Web.dc.html).
 * Beyaz zemin, 3 kolon ProductCard; her kartın üstünde ürüne özgü,
 * saf CSS ile çizilmiş 172px'lik bir önizleme alanı vardır (tasarımdaki
 * "canlı ders ekranı" / "haftalık plan" / "deneme grafiği" eskizleri).
 * Mobilde dikey; hover'da kenarlık markaya döner.
 */

/**
 * Canlı ders: paylaşılan tahta + en fazla dört katılımcı.
 *
 * Burada eskiden taralı bir yer tutucu ve "canlı ders ekranı" yazısı vardı;
 * canlı sitede yarım bırakılmış maket gibi duruyordu.
 */
function LivePreview() {
  return (
    <div className="flex h-[172px] flex-col gap-2 border-b border-dc-line-soft bg-dc-surface-muted p-[18px]">
      <div className="flex flex-1 flex-col justify-center gap-2 rounded-xl border border-dc-line bg-white px-4">
        <span className="h-2 w-[58%] rounded-full bg-[#CDE2D8]" />
        <span className="h-2 w-[80%] rounded-full bg-[#DCEAE3]" />
        <span className="h-2 w-[40%] rounded-full bg-dc-brand" />
      </div>
      <div className="flex gap-2">
        <span className="h-[34px] flex-1 rounded-lg bg-[#DFEBE5]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
      </div>
    </div>
  );
}

const planRow1 = ["#DFEBE5", "#14976B", "#EDF4F0", "#DFEBE5", "#14976B", "#EDF4F0", ""];
const planRow2 = ["#EDF4F0", "#DFEBE5", "#14976B", "#EDF4F0", "#DFEBE5", "#EDF4F0", ""];

function PlanPreview() {
  return (
    <div className="h-[172px] border-b border-dc-line-soft bg-dc-surface-muted p-[18px]">
      <div className="flex h-full flex-col gap-2 rounded-xl border border-dc-line bg-white p-3">
        <div className="font-mono text-[10px] font-semibold text-[var(--dc-ink-faint)]">haftalık plan</div>
        <div className="grid grid-cols-7 gap-[5px] text-center text-[9px] font-semibold text-[var(--dc-ink-faint)]">
          {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {[planRow1, planRow2].map((row, i) => (
          <div key={i} className="grid grid-cols-7 gap-[5px]">
            {row.map((c, j) => (
              <span
                key={j}
                className={`h-[22px] rounded-[5px] ${
                  c ? "" : "border border-dashed border-[#D6E2DC] bg-dc-surface-muted"
                }`}
                style={c ? { background: c, opacity: i === 0 && j === 4 ? 0.7 : i === 1 && j === 2 ? 0.55 : 1 } : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const bars = [
  { h: "38%", c: "#DFEBE5" },
  { h: "62%", c: "#BFDDD0" },
  { h: "48%", c: "#DFEBE5" },
  { h: "80%", c: "#14976B" },
  { h: "66%", c: "#BFDDD0" },
];

function ExamPreview() {
  return (
    <div className="h-[172px] border-b border-dc-line-soft bg-dc-surface-muted p-[18px]">
      <div className="flex h-full items-end gap-2 rounded-xl border border-dc-line bg-white p-3">
        {bars.map((b, i) => (
          <span
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: b.h, background: b.c }}
          />
        ))}
      </div>
    </div>
  );
}

const products = [
  {
    eyebrow: "ONLINE DERSHANEM",
    title: "Canlı derste öğretmenle ilerle.",
    body:
      "Birebir ya da en fazla 4 kişilik grupta ders. Öğretmen soruyu derste seninle çözer, ders sonrası neyi tekrar edeceğin yazılı kalır.",
    tracks: ["LGS", "YKS"],
    cta: "Online Dershanem'i İncele",
    href: "/urunler/online-dershanem",
    Preview: LivePreview,
  },
  {
    eyebrow: "ONLINE KOÇUM",
    title: "Haftanın planını yalnız kurmak zorunda değilsin.",
    body:
      "Koçun haftanı planlar; bir sonraki görüşmede ne kadarını yaptığınızı birlikte kontrol edersiniz. Tüm dersleri kapsar.",
    tracks: ["LGS", "YKS"],
    cta: "Online Koçum'u İncele",
    href: "/urunler/online-kocum",
    Preview: PlanPreview,
  },
  {
    eyebrow: "ONLINE DENEME KULÜBÜM",
    title: "Sonucun sadece net sayısı olarak kalmasın.",
    body:
      "LGS, TYT ve AYT denemeleri. Hangi konuda ve hangi soru tipinde puan kaybettiğini görürsün.",
    tracks: ["LGS", "TYT", "AYT"],
    cta: "Deneme Kulübünü İncele",
    href: "/urunler/online-deneme-kulubum",
    Preview: ExamPreview,
  },
];

export function ProductTrio({
  title = "Hangisi sana gerekiyor?",
  lede = "Üç ürün ayrı ayrı çalışır: ders, koçluk, deneme. Hangisini alacağına sen karar veriyorsun.",
}: {
  title?: string;
  lede?: string;
} = {}) {
  return (
    <section className="border-y border-dc-line-soft bg-white">
      <div className="site-container py-[var(--dc-section)]">
        <div className="max-w-[620px]">
          <h2 className="font-display text-[length:var(--public-title)] leading-[1.08] tracking-[-0.025em] text-dc-ink">
            {title}
          </h2>
          <p className="mt-4 text-[17px] leading-[1.65] text-dc-ink-body">{lede}</p>
        </div>

        <div className="mt-11 grid gap-[22px] md:grid-cols-2 lg:grid-cols-3">
          {products.map(({ eyebrow, title, body, tracks, cta, href, Preview }) => (
            <article
              key={eyebrow}
              className="flex flex-col overflow-hidden rounded-dc-card border border-dc-line bg-white transition-colors hover:border-dc-brand"
            >
              <Preview />
              <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="text-[12px] font-bold tracking-[0.08em] text-dc-brand-strong">
                  {eyebrow}
                </p>
                <h3 className="font-display text-[25px] leading-[1.25] tracking-[-0.02em] text-dc-ink">
                  {title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-dc-ink-muted">{body}</p>
                <div className="mt-0.5 flex flex-wrap gap-2">
                  {tracks.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-dc-brand-soft px-[11px] py-[5px] text-[12px] font-semibold text-dc-brand-hover"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <Link
                  href={href}
                  className="mt-auto self-start pt-2 text-[14.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
                >
                  {cta} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
