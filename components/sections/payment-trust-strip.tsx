import Image from "next/image";

const paymentLogos = [
  {
    id: "paytr",
    src: "/paytr-logo-color.png",
    alt: "PayTR Güvenli Ödeme",
    width: 110,
    height: 30,
    wrapperClass: "min-w-[150px]"
  },
  {
    id: "cards",
    src: "/mc-visa-troy.png",
    alt: "Mastercard Visa Troy Kartları",
    width: 172,
    height: 34,
    wrapperClass: "min-w-[180px]"
  }
] as const;

export function PaymentTrustStrip() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f2a2a]/90 px-4 py-4 sm:px-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint">Ödeme Güvencesi</p>

      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {paymentLogos.map((logo) => (
          <div
            key={logo.id}
            className={`flex min-h-[52px] items-center justify-center rounded-xl border border-white/10 bg-[#123535]/95 px-4 transition-transform duration-200 hover:scale-105 ${logo.wrapperClass}`}
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              className="h-auto max-h-8 w-auto max-w-full object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
