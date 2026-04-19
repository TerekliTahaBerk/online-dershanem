import Image from "next/image";

const universityLogos = [
  { name: "Boğaziçi Üniversitesi", shortName: "Boğaziçi", src: "/universities/bogazici-logo.png", width: 250, height: 244 },
  { name: "İstanbul Teknik Üniversitesi", shortName: "İTÜ", src: "/universities/itu-logo.png", width: 736, height: 1030 },
  { name: "Galatasaray Üniversitesi", shortName: "GSÜ", src: "/universities/gsu-logo.png", width: 1583, height: 2137 },
  { name: "Yıldız Teknik Üniversitesi", shortName: "YTÜ", src: "/universities/ytu-logo.png", width: 398, height: 405 },
  { name: "Orta Doğu Teknik Üniversitesi", shortName: "ODTÜ", src: "/universities/odtu-logo.png", width: 1280, height: 1082 }
] as const;

export function UniversityStrip() {
  const marqueeItems = [...universityLogos, ...universityLogos];

  return (
    <section className="pd-logo-strip" aria-label="Öğretmen kadrosu üniversiteleri">
      <div className="pd-logo-strip-copy">
        <span className="pd-logo-strip-label">Öğretmenlerimiz Türkiye&apos;nin lider üniversitelerinden</span>
      </div>
      <div className="pd-logo-marquee" aria-hidden="true">
        <div className="pd-logo-marquee-track">
          {marqueeItems.map((logo, index) => (
            <div key={`${logo.shortName}-${index}`} className="pd-logo-marquee-item">
              <Image
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className="pd-logo-marquee-image"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
