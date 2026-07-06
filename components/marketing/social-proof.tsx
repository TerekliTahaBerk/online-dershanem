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
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {socialProof.badges.map((badge) => (
              <li key={badge} className="rounded-full border border-[var(--site-line)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--site-body)]">
                {badge}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
