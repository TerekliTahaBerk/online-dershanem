/**
 * Problem bölümü — hero'dan hemen sonra tek güçlü mesaj:
 * "Matematikte sorun genelde çalışmamak değil, eksik yeri görememek."
 * Sade, editorial; dekoratif pill/eyebrow ve ikon yok.
 */

const POINTS = [
  {
    title: "Eksik nerede, belli değil",
    text: "Saatlerce çalışılır ama hangi kazanımın net düşürdüğü görülemez.",
  },
  {
    title: "Biz görünür hale getiriyoruz",
    text: "Her deneme kazanım bazında çözümlenir; eksik konu tek tek ortaya çıkar.",
  },
  {
    title: "Sonra da birlikte kapatıyoruz",
    text: "Canlı ders ve haftalık planla eksik, çalışılması gereken yere dönüşür.",
  },
];

export function HomeProblem() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-[30px] font-normal leading-[1.14] tracking-tight text-[var(--od-ink)] sm:text-[42px]">
            Matematikte sorun genelde çalışmamak değil,
            <br className="hidden sm:block" />{" "}
            <em className="italic text-[var(--od-olive)]">eksik yeri görememek.</em>
          </h2>
          <p className="mt-6 text-[15.5px] leading-[1.85] text-[var(--od-ink-soft)]">
            Çoğu öğrenci aslında çalışıyor. Ama hangi konuda, hangi kazanımda
            takıldığını net göremeyince emek doğru yere gitmiyor. Biz önce orayı
            görünür yapıyoruz.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {POINTS.map(({ title, text }) => (
            <div
              key={title}
              className="flex flex-col gap-2 rounded-[20px] border border-[var(--od-line)] bg-[var(--od-cream)] p-7"
            >
              <h3 className="font-display text-[19px] leading-tight text-[var(--od-ink)]">
                {title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-[var(--od-ink-soft)]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
