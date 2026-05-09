import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Bottom helper line, e.g. "Don't have an account? Sign up". */
  footer?: ReactNode;
};

/**
 * Dark, minimal, centered authentication shell.
 *
 * Layout: full-screen near-black background, vertically centered card with
 * the brand mark on top, a serif title, a muted subtitle, then the supplied
 * form/content. A single optional footer line sits below the card.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#0E0E10] px-4 py-10 text-white sm:py-14">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <Link href="/" aria-label="Ana sayfa" className="mb-7 inline-flex">
          <Image
            src="/logo.png"
            alt="Online Dershanem"
            width={80}
            height={80}
            priority
            className="h-14 w-14 object-contain"
          />
        </Link>

        <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-tight text-white sm:text-[38px]">
          {title}
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[#9A9AA0]">{subtitle}</p>

        <div className="mt-8 w-full">{children}</div>

        {footer ? (
          <div className="mt-10 text-center text-[14px] text-[#9A9AA0]">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
