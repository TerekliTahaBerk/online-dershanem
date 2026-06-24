"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { subjectPackageGroups } from "@/lib/content";

const links = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Misyonumuz", href: "/misyonumuz/" },
  { label: "İletişim", href: "/iletisim/" }
];

const lessonPkg = subjectPackageGroups[0].packages.find(
  (p) => p.subject === "Ders Paketi",
)!;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--od-line)] bg-[#FBF8F0]/92 text-[var(--od-ink)] backdrop-blur-xl">
        <div className="relative mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
          <Link href="/" aria-label="Online Dershanem" className="flex shrink-0 items-center text-[var(--od-ink)]">
            <Image
              src="/onlinedershanem_.png"
              alt="Online Dershanem"
              width={1050}
              height={200}
              sizes="170px"
              className="h-7 w-auto object-contain sm:h-8"
            />
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[14.5px] transition-colors ${
                  isActive(l.href) ? "text-[var(--od-ink)]" : "text-[var(--od-ink-soft)] hover:text-[var(--od-ink)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <PurchaseFunnelTrigger
              source="navbar_cta"
              packageName={lessonPkg.name}
              category={lessonPkg.category}
              subject={lessonPkg.subject}
              priceLabel={lessonPkg.discountedPrice}
              paymentLink=""
              className="inline-flex items-center justify-center rounded-full bg-[var(--od-olive)] px-5 py-2 text-[13.5px] font-semibold text-white transition hover:bg-[#2E3B24]"
            >
              Matematik Dersini Satın Al
            </PurchaseFunnelTrigger>
          </div>

          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white text-[var(--od-ink)]"
              aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <>
          <div className="fixed inset-0 top-16 z-30 bg-[var(--od-ink)]/18 lg:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 top-16 z-40 border-b border-[var(--od-line)] bg-[#FBF8F0] text-[var(--od-ink)] lg:hidden">
            <nav className="flex flex-col gap-1 px-5 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-3 text-[15px] transition ${
                    isActive(l.href)
                      ? "bg-[var(--od-mint)]/55 text-[var(--od-ink)]"
                      : "text-[var(--od-ink-soft)] hover:bg-white hover:text-[var(--od-ink)]"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <PurchaseFunnelTrigger
                source="navbar_mobile_cta"
                packageName={lessonPkg.name}
                category={lessonPkg.category}
                subject={lessonPkg.subject}
                priceLabel={lessonPkg.discountedPrice}
                paymentLink=""
                className="mt-2 inline-flex items-center justify-center rounded-full bg-[var(--od-olive)] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#2E3B24]"
              >
                Matematik Dersini Satın Al
              </PurchaseFunnelTrigger>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
