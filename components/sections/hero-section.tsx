import { ArrowRight, CheckCircle2 } from "lucide-react";
import { contact, hero } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { ContactLink } from "@/components/ui/contact-link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-16 pt-16 sm:pt-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_#dff2e8,_transparent_55%),radial-gradient(circle_at_bottom_left,_#edf4ef,_transparent_50%)]" />
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <FadeIn>
            <p className="mb-5 inline-flex rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted/80 shadow-soft">
              Küçük Sınıf, Yakın Takip, Net Sonuç
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">{hero.headline}</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{hero.subheadline}</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{hero.detail}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ContactLink
                href={`tel:${contact.phone}`}
                channel="phone"
                placement="hero"
                className="inline-flex items-center justify-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-pine"
              >
                Hemen Bilgi Al
              </ContactLink>
              <Button href="#paketler" variant="secondary">
                Paketleri İncele
              </Button>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
              <h2 className="text-lg font-semibold text-ink">Neden Bu Sistem İşe Yarıyor?</h2>
              <ul className="mt-5 space-y-4">
                {hero.points.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#paketler" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand">
                Paket Detaylarını Gör
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
