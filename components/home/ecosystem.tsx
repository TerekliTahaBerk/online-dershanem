import Image from "next/image";
import Link from "next/link";

/**
 * 05 EKOSİSTEM — onaylı tasarım (Web.dc.html).
 * Yatay 3 adım, altında Dino bandı. Handoff notu: "Dino 4. adım DEĞİL" —
 * bu yüzden bant numaralandırılmış adımların dışında, ayraçtan sonra durur.
 */

const steps = [
  {
    title: "Öğren",
    body: "Canlı derste zorlandığın konuyu öğretmenle kapatırsın.",
    product: "Online Dershanem",
  },
  {
    title: "Planla",
    body: "Koçun bu hafta hangi konuya ne kadar zaman ayıracağını planlar.",
    product: "Online Koçum",
  },
  {
    title: "Ölç",
    body: "Deneme sonucu planın işe yarayıp yaramadığını gösterir.",
    product: "Online Deneme Kulübüm",
  },
];

export function Ecosystem({ showDinoLayer = true }: { showDinoLayer?: boolean } = {}) {
  return (
    <section className="site-container py-[var(--dc-section)]">
      <div className="max-w-[640px]">
        <h2 className="font-display text-[length:var(--public-title)] leading-[1.08] tracking-[-0.025em] text-dc-ink">
          Birlikte nasıl çalışır?
        </h2>
        <p className="mt-3.5 text-[17px] leading-[1.65] text-dc-ink-body">
          Öğren → Planla → Ölç döngüsü aynı öğrenci akışında birbirini besler.
        </p>
      </div>

      <ol className="mt-13 grid gap-11 md:grid-cols-3">
        {steps.map(({ title, body, product }) => (
          <li key={title}>
            <span className="inline-flex rounded-full bg-dc-brand-soft px-3 py-1 text-[12px] font-bold tracking-[0.08em] text-dc-brand-strong">
              {title}
            </span>
            <span className="my-4 block h-px bg-[#DDE4E0]" />
            <h3 className="text-[20px] font-bold text-dc-ink">{product}</h3>
            <p className="mt-2 text-[15px] leading-[1.65] text-dc-ink-muted">{body}</p>
          </li>
        ))}
      </ol>

      {showDinoLayer ? (
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
            <h3 className="text-[20px] font-bold text-dc-ink">Dino AI bu akışı nasıl destekler?</h3>
            <p className="mt-2 text-[15.5px] leading-[1.65] text-dc-ink-muted">
              Dino, ders, plan ve deneme verilerinin ne söylediğini sade biçimde
              açıklamaya yardımcı olur. Koçun ve öğretmenin kararını destekleyen ortak
              bir açıklama katmanıdır; ayrı satılan dördüncü bir ürün değildir.
            </p>
            <Link
              href="/dino-ai"
              className="mt-3 inline-block text-[14.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
            >
              Dino AI&apos;ın çalıştığı yerler →
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
