import { teachers } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

const AVATAR_COLORS = [
  "bg-brand text-white",
  "bg-anchor text-mint",
  "bg-amber-500 text-white",
  "bg-violet-600 text-white",
  "bg-pine text-mint",
  "bg-rose-500 text-white"
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeacherSection() {
  return (
    <section id="egitmenler" className="py-16 sm:py-24">
      <Container>
        <FadeIn>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Kadromuz</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Geleceğini Teslim Edeceğin "Yıldız" Kadromuz
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Öğretmen seçimi bir şans oyunu değildir. Akademik başarısını kanıtlamış, anlatım gücü yüksek ve sınav kazandırma deneyimine sahip uzmanlarla çalışıyoruz.
          </p>
        </FadeIn>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {teachers.map((teacher, i) => (
            <FadeIn key={teacher.name} delay={i * 0.07}>
              <article className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(9,20,19,0.14)]">
                {/* Avatar + name row */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {initials(teacher.name)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-ink">{teacher.name}</h3>
                    <p className="text-xs text-muted">{teacher.uni}</p>
                  </div>
                </div>

                {/* Branch + experience badges */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-brand/25 bg-brand/8 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                    {teacher.branch}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-line bg-soft px-2.5 py-0.5 text-[11px] font-medium text-muted">
                    {teacher.exp} tecrübe
                  </span>
                </div>

                {/* Quote */}
                <p className="mt-4 flex-1 border-l-2 border-mint pl-3 text-sm italic leading-relaxed text-muted">
                  "{teacher.quote}"
                </p>

                {/* Tag */}
                <p className="mt-5 text-xs font-semibold text-brand">{teacher.tag}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
