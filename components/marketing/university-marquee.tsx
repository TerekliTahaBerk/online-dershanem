import Image from "next/image";

const universities = [
  { name: "Boğaziçi Üniversitesi", logo: "/universities/bogazici-logo.png", width: 250, height: 244 },
  { name: "İstanbul Teknik Üniversitesi", logo: "/universities/itu-logo.png", width: 736, height: 1030 },
  { name: "Orta Doğu Teknik Üniversitesi", logo: "/universities/odtu-logo.png", width: 1280, height: 1082 },
  { name: "Yıldız Teknik Üniversitesi", logo: "/universities/ytu-logo.png", width: 398, height: 405 },
  { name: "Galatasaray Üniversitesi", logo: "/universities/gsu-logo.png", width: 1583, height: 2137 },
] as const;

function LogoSet({ decorative = false }: { decorative?: boolean }) {
  return (
    <ul className="university-marquee-set" aria-hidden={decorative || undefined}>
      {universities.map((university) => (
        <li key={university.name} className="university-logo-item">
          <Image
            src={university.logo}
            alt=""
            width={university.width}
            height={university.height}
            sizes="96px"
            className="university-logo-image"
          />
          <span>{university.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function UniversityMarquee() {
  return (
    <section className="overflow-hidden border-b border-[var(--site-line)] bg-[var(--site-bg-warm)] py-14 sm:py-16" aria-labelledby="university-heading">
      <div className="site-container text-center">
        <h2 id="university-heading" className="mx-auto mt-3 max-w-3xl text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-[1.05] tracking-[-.035em] text-[var(--site-ink)]">
          Seçkin eğitimciler. Seçkin üniversitelerden beslenen bir akademik kültür.
        </h2>
      </div>
      <div className="university-marquee mt-10" role="group" aria-label="Üniversiteler">
        <div className="university-marquee-track">
          <LogoSet />
          <LogoSet decorative />
        </div>
      </div>
    </section>
  );
}
