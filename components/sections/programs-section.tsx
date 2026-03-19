"use client";

import { useRouter } from "next/navigation";
import { programs } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { trackConversionEvent } from "@/lib/tracking";

type ProgramTarget = {
  href: string;
  label: string;
};

function getProgramTarget(programName: string): ProgramTarget {
  if (programName.includes("LGS")) {
    return { href: "/lgs/", label: "LGS özel landing sayfasına git" };
  }
  if (programName.includes("TYT-AYT")) {
    return { href: "/yks/", label: "TYT-AYT özel sayfalarına git" };
  }
  return { href: "/#paket-karsilastirma", label: "Ders bazlı paketleri incele" };
}

export function ProgramsSection() {
  const router = useRouter();

  const handleProgramSelect = (programName: string) => {
    const target = getProgramTarget(programName);
    trackConversionEvent("landing_cta_click", { source: "program_card", programName, target: target.href });
    router.push(target.href);
  };

  return (
    <section id="programlar" className="py-16 sm:py-20">
      <Container>
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Ders Bazlı Grup Özel Ders Modeli</h2>
          <p className="mt-3 max-w-3xl text-muted">
            Bu yapı klasik “tüm dersleri içeren online paket” değildir. TYT-AYT ve LGS tarafında ihtiyaç duyduğun dersi ayrı seçer,
            küçük gruplarda daha odaklı ve daha verimli bir öğrenme süreci yaşarsın.
          </p>
        </FadeIn>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program, i) => {
            const target = getProgramTarget(program.name);
            return (
              <FadeIn key={program.name} delay={i * 0.06}>
                <button
                  type="button"
                  onClick={() => handleProgramSelect(program.name)}
                  className="group block h-full rounded-3xl border border-line bg-white p-6 text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  data-analytics-id={`program_card_${program.name}`}
                >
                  <article className="h-full">
                    <span className="inline-flex rounded-full bg-soft px-3 py-1 text-xs font-medium text-muted/80">Grup Özel Ders</span>
                    <h3 className="mt-3 text-lg font-semibold text-ink">{program.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{program.desc}</p>
                    <p className="mt-3 border-l-2 border-line pl-3 text-xs leading-relaxed text-muted">
                      <span className="font-semibold text-ink">Odak:</span> {program.focus}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      <span className="font-semibold text-ink">Beklenen çıktı:</span> {program.outcome}
                    </p>
                    <span className="mt-4 inline-flex text-xs font-semibold text-brand transition-transform duration-300 group-hover:translate-x-1">
                      {target.label}
                    </span>
                  </article>
                </button>
              </FadeIn>
            );
          })}
        </div>
        <FadeIn delay={0.1}>
          <div className="mt-8 rounded-3xl border border-line bg-soft p-6">
            <p className="text-sm leading-relaxed text-muted">
              Ders seçiminde amaç, öğrenciyi gereksiz toplu pakete sokmak değil; doğru dersi, doğru grupla ve doğru seviyede
              başlatmaktır. Danışman ekibimiz bu eşleşmeyi netleştirir.
            </p>
            <a href="#paket-karsilastirma" className="mt-3 inline-flex text-sm font-semibold text-brand">
              Ders bazlı paketleri gör
            </a>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
