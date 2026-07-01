import Link from "next/link";
import { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
};

export function Button({ children, href, variant = "primary" }: ButtonProps) {
  const base =
    "inline-flex min-h-12 items-center justify-center rounded-[10px] px-6 py-3 text-[15px] font-medium transition-colors duration-150";
  const styles =
    variant === "primary"
      ? "bg-[var(--od-olive)] text-[var(--od-cream)] hover:bg-[#2C3A21]"
      : "bg-[var(--od-cream)] text-[var(--od-ink)] ring-1 ring-[var(--od-ink)] hover:bg-[var(--od-cream-2)]";

  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}
