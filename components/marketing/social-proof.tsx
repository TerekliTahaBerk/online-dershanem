import Image from "next/image";
import { socialProof } from "@/lib/site-content";

/**
 * Sosyal kanıt barı — hero altında yumuşak krem bar + gri üniversite logoları.
 * Gerçek logo asset'leri kullanılır (public/universities). Placement iddiası
 * içermez; hedef okullara giden yolda matematik temeli vurgusu.
 */
export function SocialProof() {
  return (
    <section className="bg-white">
      <div className="site-container py-10 sm:py-12">
        <div className="rounded-[24px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-6 py-8 sm:px-10">
          <p className="text-center text-[14px] leading-6 text-[var(--site-body)]">{socialProof.text}</p>
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14">
            {socialProof.universities.map((u) => (
              <li key={u.name}>
                <Image
                  src={u.src}
                  alt={u.name}
                  width={120}
                  height={48}
                  sizes="120px"
                  className="h-8 w-auto opacity-60 grayscale transition sm:h-9"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
