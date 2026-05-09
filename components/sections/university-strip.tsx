import Image from "next/image";

const universityLogos = [
  { name: "Boğaziçi Üniversitesi", src: "/universities/bogazici-logo.png", w: 250, h: 244 },
  { name: "İstanbul Teknik Üniversitesi", src: "/universities/itu-logo.png", w: 736, h: 1030 },
  { name: "Galatasaray Üniversitesi", src: "/universities/gsu-logo.png", w: 1583, h: 2137 },
  { name: "Yıldız Teknik Üniversitesi", src: "/universities/ytu-logo.png", w: 398, h: 405 },
  { name: "Orta Doğu Teknik Üniversitesi", src: "/universities/odtu-logo.png", w: 1280, h: 1082 }
] as const;

/**
 * Opennote-style trust strip: greyscale logos that scroll left infinitely.
 * Pure CSS marquee — no JS.
 */
export function UniversityStrip() {
  // Render logos twice so the loop is seamless.
  const reel = [...universityLogos, ...universityLogos];

  return (
    <section
      className="relative border-y border-[#E5E5E0] bg-[#FAFAF7] py-10"
      aria-label="Öğretmen kadrosu üniversiteleri"
    >
      <div className="mx-auto max-w-3xl px-5 text-center">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[#7A7A7F]">
          Hocalarımız Türkiye&apos;nin lider üniversitelerinden
        </p>
      </div>

      {/* gradient edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#FAFAF7] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#FAFAF7] to-transparent" />

      <div className="relative mt-7 overflow-hidden">
        <div className="flex w-max animate-[marquee_40s_linear_infinite] items-center gap-16 px-8">
          {reel.map((u, i) => (
            <div
              key={`${u.src}-${i}`}
              className="flex h-12 w-28 shrink-0 items-center justify-center sm:h-14 sm:w-32"
              title={u.name}
            >
              <Image
                src={u.src}
                alt={u.name}
                width={u.w}
                height={u.h}
                className="max-h-12 w-auto object-contain opacity-55 grayscale transition hover:opacity-90 hover:grayscale-0 sm:max-h-14"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
