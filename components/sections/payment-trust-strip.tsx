import Image from "next/image";

export function PaymentTrustStrip() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 pt-5">
      {/* Label + badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-mint/70 shrink-0">
          Güvenli Ödeme
        </span>
        <div className="h-3.5 w-px bg-white/15 hidden sm:block" />
        {/* PayTR */}
        <div className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 hover:bg-white/10 transition">
          <Image
            src="/paytr-logo-color.png"
            alt="PayTR"
            width={72}
            height={22}
            className="h-5 w-auto object-contain"
          />
        </div>
        {/* Card logos */}
        <div className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 hover:bg-white/10 transition">
          <Image
            src="/mc-visa-troy.png"
            alt="Mastercard · Visa · Troy"
            width={110}
            height={22}
            className="h-5 w-auto object-contain"
          />
        </div>
        {/* SSL badge */}
        <div className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3">
          <svg className="w-3.5 h-3.5 text-mint/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[11px] font-semibold text-mint/80 whitespace-nowrap">256-bit SSL</span>
        </div>
      </div>

      {/* yula.co attribution */}
      <a
        href="https://yula.co"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 group shrink-0"
        aria-label="yula.co"
      >
        <span className="text-[11px] text-white/30 group-hover:text-white/50 transition">
          Online Dershanem bir
        </span>
        <span className="text-[11px] font-bold tracking-tight text-white/50 group-hover:text-white/80 transition">
          yula.co
        </span>
        <span className="text-[11px] text-white/30 group-hover:text-white/50 transition">
          markasıdır
        </span>
      </a>
    </div>
  );
}
