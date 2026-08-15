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
}: {
  title: string;
  googleLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="site-scope grid min-h-dvh place-items-center bg-dc-canvas px-6 py-12">
      <div className="w-full max-w-[380px]">
        <Link href="/" aria-label="Online Dershanem ana sayfa" className="mx-auto block w-12">
          <Image
            src="/design/od-logo.png"
            alt="Online Dershanem"
            width={1254}
            height={1254}
            priority
            sizes="48px"
            className="h-12 w-12 rounded-[13px] object-cover"
          />
        </Link>

        <h1 className="mt-6 text-center text-[22px] font-extrabold tracking-[-0.02em] text-dc-ink">
          {title}
        </h1>

        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-7 flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-[#DDE4E0] bg-white p-3.5 text-[15px] font-semibold text-dc-ink opacity-55"
        >
          <span aria-hidden="true" className="text-[15px] font-bold text-[#4285F4]">
            G
          </span>
          {googleLabel}
          <span className="rounded-full bg-dc-surface-muted px-2 py-0.5 text-[11px] font-semibold text-dc-ink-faint">
            yakında
          </span>
        </button>

        <div className="my-[22px] flex items-center gap-3">
          <span className="h-px flex-1 bg-dc-line" />
          <span className="text-[12.5px] text-dc-ink-ghost">veya</span>
          <span className="h-px flex-1 bg-dc-line" />
        </div>

        {children}

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Tasarımdaki input kutusu — 12px radius, 14px iç boşluk. */
export const authInputClass =
  "w-full rounded-xl border border-[#DDE4E0] bg-white p-3.5 text-[15px] text-dc-ink outline-none transition-colors placeholder:text-dc-ink-ghost focus-visible:border-dc-brand";

/** Tasarımdaki birincil buton — dolu yeşil, 12px radius. */
export const authSubmitClass =
  "mt-4 w-full rounded-xl bg-dc-brand-strong p-[15px] text-[15.5px] font-bold text-white transition-colors hover:bg-dc-brand-hover disabled:cursor-not-allowed disabled:opacity-60";
