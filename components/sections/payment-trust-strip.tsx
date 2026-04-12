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
        className="group shrink-0 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
        aria-label="yula.co"
      >
        <span className="text-lg leading-none group-hover:scale-110 transition-transform duration-200 inline-block">❤️</span>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-medium text-white/40 group-hover:text-white/60 transition uppercase tracking-widest">
            Made with love by
          </span>
          <span className="text-sm font-bold tracking-tight text-white/70 group-hover:text-white transition">
            yula.co
          </span>
        </div>
      </a>
    </div>
  );
}
