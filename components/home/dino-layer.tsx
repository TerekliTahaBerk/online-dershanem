import Link from "next/link";

/**
 * 07 DINO AI — onaylı tasarım (Web.dc.html).
 * 2 kolon: solda metin + link, sağda üç içgörü satırı (ayraçlı liste).
 *
 * Bu üç cümle ÜRÜN ANLATIMIDIR — canlı bir AI çıktısı değildir ve öyle
 * sunulmaz (§22). Gerçek Dino AI yüzeyleri panelde, izin sınırları içinde
 * çalışır.
 */

const examples = [
  {
    context: "Ders sonrası",
    line: "Bugünkü derste ikinci dereceden denklemlerde takıldın. Yarın 40 dakika bu konuya ayır.",
  },
  {
    context: "Koç planı kurarken",
    line: "Son iki haftada paragraf sorularına hiç dönmemiş. Bu haftaya iki oturum koymayı düşünebilirsin.",
  },
  {
    context: "Deneme sonrası",
    line: "Son üç denemede yüzde problemlerinde aynı hatayı yapıyorsun. Kayıp buradan geliyor.",
  },
];

export function DinoLayer() {
  return (
    <section className="site-container py-[var(--dc-section)]">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.08em] text-dc-brand-strong">DINO AI</p>
          <h2 className="mt-4 font-display text-[length:var(--public-title)] leading-[1.12] tracking-[-0.025em] text-dc-ink">
            Dino AI ne yapıyor?
          </h2>
          <p className="mt-4 text-[17px] leading-[1.65] text-dc-ink-body">
            Ders notunu, planı ve deneme sonucunu birlikte okur; hangi konuya dönmenin
            faydalı olabileceğini sade bir dille açıklar. Kararı öğretmen ve koç verir.
          </p>
          <Link
            href="/dino-ai"
            className="mt-6 inline-block text-[15px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
          >
            Dino AI&apos;ın çalıştığı yerler →
          </Link>
        </div>

        <ul className="flex flex-col">
          {examples.map(({ context, line }, i) => (
            <li
              key={context}
              className={`border-t border-dc-line py-[22px] ${
                i === examples.length - 1 ? "border-b" : ""
              }`}
            >
              <p className="text-[13px] font-semibold text-dc-brand-strong">{context}</p>
              <p className="mt-1.5 text-[18px] font-bold leading-[1.45] text-dc-ink">
                &ldquo;{line}&rdquo;
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
