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
  { label: "Ders Paketi", href: "/matematik-ders-paketi/" },
  { label: "Kamplar", href: "/kamplar/" },
  { label: "Misyonumuz", href: "/misyonumuz/" },
  { label: "SSS", href: "/sss/" },
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
      <header className="sticky top-0 z-40 w-full border-b border-[var(--od-line)] bg-[#FBFAF5]/92 text-[var(--od-ink)] backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="Online Dershanem ana sayfa" className="flex shrink-0 items-center">
            <Image
              src="/onlinedershanem_.png"
              alt="Online Dershanem"
              width={1050}
              height={200}
              priority
              sizes="150px"
              className="h-[26px] w-auto"
            />
          </Link>

          <nav aria-label="Ana menü" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 xl:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-md px-1 py-2 text-[13.5px] transition-colors ${
                  isActive(l.href) ? "font-medium text-[var(--od-ink)]" : "text-[var(--od-ink-soft)] hover:text-[var(--od-ink)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden xl:block">
            <PurchaseFunnelTrigger
              source="navbar_cta"
              packageName={lessonPkg.name}
              category={lessonPkg.category}
              subject={lessonPkg.subject}
              priceLabel={lessonPkg.discountedPrice}
              paymentLink=""
              className="inline-flex min-h-10 items-center justify-center rounded-[9px] bg-[var(--od-olive)] px-4 py-2 text-[13.5px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21]"
            >
              Satın Al
            </PurchaseFunnelTrigger>
          </div>

          <div className="flex items-center gap-1.5 xl:hidden">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-[var(--od-line)] bg-[var(--od-paper)] text-[var(--od-ink)]"
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
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="fixed inset-0 top-16 z-30 bg-[var(--od-ink)]/18 xl:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 top-16 z-40 border-b border-[var(--od-line)] bg-[#FBFAF5] text-[var(--od-ink)] shadow-[0_18px_40px_-28px_rgba(20,20,15,0.35)] xl:hidden">
            <nav aria-label="Mobil menü" className="mx-auto flex max-w-[1080px] flex-col gap-1 px-5 py-4 sm:px-8">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-3 text-[15px] transition ${
                    isActive(l.href)
                      ? "bg-[var(--od-cream-2)] font-medium text-[var(--od-ink)]"
                      : "text-[var(--od-ink-soft)] hover:bg-[var(--od-paper)] hover:text-[var(--od-ink)]"
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
                className="mt-2 inline-flex min-h-12 items-center justify-center rounded-[10px] bg-[var(--od-olive)] px-5 py-3 text-[15px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21]"
              >
                Satın Al
              </PurchaseFunnelTrigger>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
