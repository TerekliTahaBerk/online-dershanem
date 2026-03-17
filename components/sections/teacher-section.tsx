import { GraduationCap } from "lucide-react";
import { teachers } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

export function TeacherSection() {
  return (
    <section id="egitmenler" className="py-16 sm:py-20">
      <Container>
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Türkiye'nin Seçkin Eğitimci Kadrosu</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Öğretmen seçimi, öğrencinin kaderini belirleyen en kritik faktörlerden biri. Bu yüzden sadece akademik bilgiye değil;
            anlatım gücüne, öğrenci psikolojisini yönetebilme becerisine ve ölçme-değerlendirme disiplinine odaklanan bir kadroyla
            çalışıyoruz.
          </p>
        </FadeIn>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {teachers.map((teacher, i) => (
            <FadeIn key={teacher.name} delay={i * 0.08}>
              <article className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mint">
                  <GraduationCap className="h-6 w-6 text-ink" />
                </div>
                <h3 className="text-lg font-semibold text-ink">{teacher.name}</h3>
                <p className="mt-1 text-sm text-muted">{teacher.branch} • {teacher.uni}</p>
                <p className="mt-1 text-xs text-muted">Tecrübe: {teacher.exp}</p>
                <p className="mt-4 text-sm italic leading-relaxed text-muted">"{teacher.quote}"</p>
                <p className="mt-5 text-xs font-semibold text-brand">Yakın takip odaklı butik sınıf yaklaşımı</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
