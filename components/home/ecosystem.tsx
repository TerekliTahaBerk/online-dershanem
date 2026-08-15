import Image from "next/image";

/**
 * 05 EKOSİSTEM — onaylı tasarım (Web.dc.html).
 * Yatay 3 adım, altında Dino bandı. Handoff notu: "Dino 4. adım DEĞİL" —
 * bu yüzden bant numaralandırılmış adımların dışında, ayraçtan sonra durur.
 */

const steps = [
  {
    n: "01",
    title: "Derste konuyu kapatırsın",
    body: "Öğretmen hangi kazanımda zorlandığını ders sonunda not eder.",
    product: "Online Dershanem",
  },
  {
    n: "02",
    title: "Bu not haftalık plana girer",
    body: "Koçun planı kurarken derste eksik kalan konuyu öne alır.",
    product: "Online Koçum",
  },
  {
    n: "03",
    title: "Deneme, planın işe yarayıp yaramadığını gösterir",
    body: "Sonuç ertesi haftanın planına dönüşür; döngü baştan işler.",
    product: "Online Deneme Kulübüm",
  },
];

export function Ecosystem() {
  return (
    <section className="site-container py-[var(--dc-section)]">
      <div className="max-w-[640px]">
        <h2 className="font-display text-[length:var(--public-title)] leading-[1.08] tracking-[-0.025em] text-dc-ink">
          Ürünleri birlikte alınca ne oluyor?
        </h2>
        <p className="mt-3.5 text-[17px] leading-[1.65] text-dc-ink-body">
          Üçü ayrı ayrı da çalışır. Birlikte kullanıldığında biri diğerine bilgi taşır.
        </p>
      </div>

      <ol className="mt-13 grid gap-11 md:grid-cols-3">
        {steps.map(({ n, title, body, product }) => (
          <li key={n}>
            {/* Sıra bilgisini <ol> zaten taşıyor; bu numara yalnız dekoratif.
                aria-hidden olmasaydı çok açık tonu kontrast ihlali sayılırdı. */}
            <span
              aria-hidden="true"
              className="font-display text-[34px] tracking-[-0.02em] text-[#7D9084]"
            >
              {n}
            </span>
            <span className="my-4 block h-px bg-[#DDE4E0]" />
            <h3 className="text-[20px] font-bold text-dc-ink">{title}</h3>
            <p className="mt-2 text-[15px] leading-[1.65] text-dc-ink-muted">{body}</p>
            <p className="mt-2.5 text-[13px] font-semibold text-dc-brand-strong">{product}</p>
          </li>
        ))}
      </ol>

      {/* Dino bandı — dördüncü adım değil */}
      <div className="mt-14 flex items-start gap-6 border-t border-dc-line pt-7">
        <Image
          src="/design/dino-mascot.png"
          alt=""
          aria-hidden="true"
          width={1319}
          height={1193}
          sizes="96px"
          className="w-[72px] flex-none sm:w-24"
        />
        <div className="max-w-[760px]">
          <h3 className="text-[20px] font-bold text-dc-ink">Bu aktarımı Dino AI yapıyor</h3>
          <p className="mt-2 text-[15.5px] leading-[1.65] text-dc-ink-muted">
            Ders notunu koçun plan ekranına, deneme sonucunu bir sonraki haftanın
            çalışmasına taşır. Ayrı satılan dördüncü bir ürün değil; aldığın ürünlerin
            içinde çalışır.
          </p>
        </div>
      </div>
    </section>
  );
}
