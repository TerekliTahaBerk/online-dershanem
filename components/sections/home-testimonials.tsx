import { Star } from "lucide-react";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

const ITEMS: Testimonial[] = [
  {
    quote:
      "Dağınık notlardan ve sonsuz sekmelerden çıktım. Artık hocam, planım ve denemelerim aynı yerde — sadece çalışıyorum.",
    name: "Elif",
    role: "12. sınıf, Sayısal",
  },
  {
    quote:
      "Dört kişilik grupta hocaya soru sormak utanılacak bir şey değil; gerçekten dinleniyorsun. Net ortalamam iki ayda 14 arttı.",
    name: "Mert",
    role: "TYT öğrencisi",
  },
  {
    quote:
      "Velim de panelden her şeyi görebiliyor; eve gelince soruşturmuyor, soruyor. Aramız bile düzeldi diyebilirim.",
    name: "Zeynep",
    role: "11. sınıf, Eşit Ağırlık",
  },
];

export function HomeTestimonials() {
  return (
    <section className="bg-[var(--od-cream)] py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 text-center">
        <span className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[#8B8B7E]">
          Öğrencilerimiz
        </span>
        <h2 className="mt-4 font-display text-[32px] font-normal leading-[1.15] tracking-tight text-[var(--od-ink)] sm:text-[40px]">
          Onların kelimeleriyle.
        </h2>
      </div>

      <div className="mx-auto mt-16 flex max-w-3xl flex-col gap-24 px-5">
        {ITEMS.map((t, i) => (
          <figure key={i} className="text-center">
            <div className="flex items-center justify-center gap-1 text-[var(--od-ink)]">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} size={14} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <blockquote className="mt-6 font-display text-[24px] font-normal leading-[1.4] tracking-tight text-[var(--od-ink)] sm:text-[30px]">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 text-[13.5px] text-[var(--od-ink-soft)]">
              <span className="text-[var(--od-ink)]">{t.name}</span>
              <span className="mx-1.5 text-[#C8C8C5]">·</span>
              {t.role}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
