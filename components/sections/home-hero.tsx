import Link from "next/link";

/**
 * Opennote-style centered hero.
 *
 * Anatomy:
 *  - tiny eyebrow pill
 *  - massive serif italic headline
 *  - one-line muted subtitle
 *  - single primary CTA (dark pill)
 *  - subtle "no card / cancel anytime" line
 *
 * Lives on the warm off-white (#FAFAF7) background defined globally.
 */
export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#FAFAF7]">
      {/* soft radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[520px] max-w-5xl opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 30%, rgba(84,107,65,0.08) 0%, rgba(250,250,247,0) 70%)",
        }}
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#0E0E10]/10 bg-white/70 px-3 py-1 text-[12px] font-medium tracking-wide text-[#5A5A5F] backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22A06B]" />
          TYT · AYT · LGS — Küçük grup canlı ders
        </span>

        <h1 className="mt-7 font-display text-[44px] font-normal leading-[1.05] tracking-[-0.015em] text-[#0E0E10] sm:text-[64px] sm:leading-[1.02]">
          Seninle birlikte
          <br />
          düşünen <em className="italic text-[#3A4A2C]">dershane.</em>
        </h1>

        <p className="mt-6 max-w-xl text-[16px] leading-7 text-[#5A5A5F] sm:text-[17px]">
          Toplu paket zorunluluğu yok. Sadece ihtiyacın olan dersi seç; en fazla
          dört kişilik gruplarda birebir hıza yakın bir takiple çalış.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3">
          <Link
            href="/kayit"
            className="inline-flex items-center justify-center rounded-full bg-[#0E0E10] px-7 py-3.5 text-[14.5px] font-medium text-white shadow-[0_10px_30px_-12px_rgba(14,14,16,0.45)] transition hover:bg-[#1F1F23]"
          >
            Ücretsiz dene
          </Link>
          <p className="text-[12.5px] text-[#7A7A7F]">
            Kart bilgisi istemiyoruz · İstediğin an iptal et
          </p>
        </div>
      </div>
    </section>
  );
}
