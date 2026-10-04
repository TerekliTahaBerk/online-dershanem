import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * KİMLİK EKRANI KABUĞU — onaylı tasarım (Web.dc.html → isLogin).
 * Ortalanmış 380px kolon: 48px logo, Google butonu, "veya" ayracı, form.
 *
 * Google butonu ÜRÜN KARARIYLA pasiftir: OAuth kimlik bilgileri (client id /
 * secret) henüz tanımlı değil. Çalışmayan bir düğmeyi çalışıyormuş gibi
 * göstermemek için `disabled` ve "yakında" etiketli — tıklanınca sessizce
 * hiçbir şey yapan bir buton bırakmak daha kötü olurdu.
 */
export function AuthCard({
  title,
  googleLabel,
  children,
  footer,
  wide = false,
  description,
  showDenemeLigiLogo = false,
}: {
  title: string;
  /** Verilmezse Google düğmesi ve "veya" ayracı basılmaz. */
  googleLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Çok adımlı kayıt gibi geniş formlar için 560px kolon. */
  wide?: boolean;
  description?: ReactNode;
  showDenemeLigiLogo?: boolean;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-scope grid min-h-dvh place-items-center bg-dc-canvas px-6 py-12"
    >
      <div className={wide ? "w-full max-w-[560px]" : "w-full max-w-[380px]"}>
        <AuthBrandLogos showDenemeLigiLogo={showDenemeLigiLogo} />

        <h1 className="mt-6 text-center text-[22px] font-extrabold tracking-[-0.02em] text-dc-ink">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 text-center text-[13.5px] leading-[1.6] text-dc-ink-muted">
            {description}
          </p>
        ) : null}

        {googleLabel ? (
          <>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="mt-7 flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-[#DDE4E0] bg-white p-3.5 text-[15px] font-semibold text-dc-ink opacity-55"
            >
              <span
                aria-hidden="true"
                className="text-[15px] font-bold text-[#4285F4]"
              >
                G
              </span>
              {googleLabel}
              <span className="rounded-full bg-dc-surface-muted px-2 py-0.5 text-xs font-semibold text-dc-ink-faint">
                yakında
              </span>
            </button>

            <div className="my-[22px] flex items-center gap-3">
              <span className="h-px flex-1 bg-dc-line" />
              <span className="text-[12.5px] text-dc-ink-ghost">veya</span>
              <span className="h-px flex-1 bg-dc-line" />
            </div>
          </>
        ) : (
          <div className="h-6" />
        )}

        {children}

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </main>
  );
}

/** Aynı marka çifti giriş formunda ve panel kapalı ekranında kullanılır. */
export function AuthBrandLogos({ showDenemeLigiLogo = false }: { showDenemeLigiLogo?: boolean }) {
  return (
        <div className="flex items-center justify-center gap-3">
          <Link
          href="/"
          aria-label="onlinedershanem. ana sayfa"
          className="block w-12 rounded-[13px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dc-brand-strong"
        >
          <Image
            src="/design/od-logo.png"
            alt="onlinedershanem."
            width={1254}
            height={1254}
            priority
            sizes="48px"
            className="h-12 w-12 rounded-[13px] object-cover"
          />
        </Link>
          {showDenemeLigiLogo ? (
            <Link
              href="/urunler/online-deneme-kulubum"
              aria-label="Deneme Ligi ürününü incele"
              className="block rounded-[13px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-700"
            >
              <Image
                src="/deneme-ligi/mascot-d.png"
                alt="Deneme Ligi taçlı D logosu"
                width={1254}
                height={1254}
                sizes="48px"
                className="h-12 w-12 rounded-[13px] object-contain"
              />
            </Link>
          ) : null}
        </div>
  );
}

/** Tasarımdaki input kutusu — 12px radius, 14px iç boşluk. */
export const authInputClass =
  "w-full rounded-xl border border-[#DDE4E0] bg-white p-3.5 text-[15px] text-dc-ink outline-hidden transition-colors placeholder:text-dc-ink-ghost focus-visible:border-dc-brand-strong focus-visible:ring-2 focus-visible:ring-dc-brand-strong";

/** Tasarımdaki birincil buton — dolu yeşil, 12px radius. */
export const authSubmitClass =
  "mt-4 w-full rounded-xl bg-dc-brand-strong p-[15px] text-[15.5px] font-bold text-white transition-colors hover:bg-dc-brand-hover disabled:cursor-not-allowed disabled:opacity-60";
