import Image from "next/image";

export function PaymentTrustStrip() {
  return (
    <div className="flex flex-col gap-4 border-t border-[var(--pd-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
      {/* Label + badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--pd-muted)]">
          Güvenli Ödeme
        </span>
        <div className="hidden h-3.5 w-px bg-[var(--pd-line)] sm:block" />
        {/* PayTR */}
        <div className="flex h-9 items-center justify-center rounded-lg border border-[var(--pd-line)] bg-[var(--pd-bg-elevated)] px-3 transition hover:border-[var(--pd-line-2)]">
          <Image
            src="/paytr-logo-color.png"
            alt="PayTR"
            width={72}
            height={22}
            className="h-5 w-auto object-contain"
          />
        </div>
        {/* Card logos */}
        <div className="flex h-9 items-center justify-center rounded-lg border border-[var(--pd-line)] bg-[var(--pd-bg-elevated)] px-3 transition hover:border-[var(--pd-line-2)]">
          <Image
            src="/mc-visa-troy.png"
            alt="Mastercard · Visa · Troy"
            width={110}
            height={22}
            className="h-5 w-auto object-contain"
          />
        </div>
        {/* SSL badge */}
        <div className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--pd-line)] bg-[var(--pd-bg-elevated)] px-3">
          <svg className="h-3.5 w-3.5 shrink-0 text-[var(--pd-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--pd-ink-3)]">256-bit SSL</span>
        </div>
      </div>

      {/* yula.co attribution */}
      <a
        href="https://yula.co"
        target="_blank"
        rel="noopener noreferrer"
        className="group shrink-0 flex items-center gap-2.5"
        aria-label="yula.co"
      >
        <span className="text-base leading-none select-none">❤️</span>
        <span className="text-xs text-[var(--pd-muted)] transition-colors duration-200 group-hover:text-[var(--pd-ink-3)]">
          Online Dershanem bir{" "}
          <span className="font-semibold text-[var(--pd-ink-3)] transition-colors duration-200 group-hover:text-[var(--pd-ink)]">
            yula.co
          </span>{" "}
          markasıdır
        </span>
      </a>
    </div>
  );
}
