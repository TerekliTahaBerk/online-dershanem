/**
 * 10 NASIL BAŞLIYORSUN — onaylı tasarım (Web.dc.html).
 * 4 adım; yalnız ilk adımın üst kenarlığı marka rengindedir.
 */

const steps = [
  { n: "01", title: "Hedefini söyle", body: "LGS mi YKS mi, hangi alan ve hangi dönem." },
  {
    n: "02",
    title: "Nerede zorlandığını konuşalım",
    body: "Kısa bir ön görüşme; hangi konularda takıldığını dinliyoruz.",
  },
  {
    n: "03",
    title: "Paketini oluştur",
    body: "Ders, koçluk, deneme; tek tek ya da birlikte.",
  },
  {
    n: "04",
    title: "Başla ve takipte kal",
    body: "Her ders sonrası not, veli özeti ve Dino AI önerileri panelinde.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-dc-line-soft bg-white">
      <div className="site-container py-[var(--dc-section-tight)]">
        <h2 className="font-display text-[length:var(--public-title)] leading-[1.1] tracking-[-0.025em] text-dc-ink">
          Nasıl başlıyorsun?
        </h2>

        <ol className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ n, title, body }, i) => (
            <li
              key={n}
              className={`pt-[18px] ${
                i === 0 ? "border-t-2 border-dc-brand" : "border-t-2 border-[#DDE4E0]"
              }`}
            >
              <span
                className={`font-mono text-[11px] font-semibold ${
                  i === 0 ? "text-dc-brand-strong" : "text-[var(--dc-ink-faint)]"
                }`}
              >
                {n}
              </span>
              <h3 className="mt-2.5 font-display text-[19px] text-dc-ink">{title}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-dc-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
