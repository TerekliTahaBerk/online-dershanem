"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { ComingSoonButton } from "@/components/ui/coming-soon-button";
import navbarLogo from "@/public/onlinedershanem_.png";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const packageLinks = [
    { label: "TYT-AYT", href: "/yks/" },
    { label: "LGS", href: "/lgs/" }
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/90 backdrop-blur-xl">
        <Container className="flex h-20 items-center justify-between">
          <Link href="/" className="inline-flex items-center" aria-label="Online Dershanem Ana Sayfa">
            <Image
              src={navbarLogo}
              alt="Online Dershanem"
              width={300}
              height={52}
              className="h-9 w-[220px] object-contain object-left"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) =>
              item.label === "Paketler" ? (
                <div key={item.label} className="group relative">
                  <Link href="/paketler/" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand">
                    Paketler <ChevronDown className="h-4 w-4" />
                  </Link>
                  <div className="absolute left-0 top-full z-50 w-44 pt-2">
                    <div className="pointer-events-none rounded-2xl border border-line bg-paper/95 p-2 opacity-0 shadow-soft backdrop-blur-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                      {packageLinks.map((pkg) => (
                        <Link
                          key={pkg.label}
                          href={pkg.href}
                          className="block rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-soft hover:text-brand"
                        >
                          {pkg.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link key={item.label} href={item.href} className="text-sm text-muted transition-colors hover:text-brand">
                  {item.label}
                </Link>
              )
            )}
          </nav>
          <div className="hidden items-center md:flex">
            <ComingSoonButton />
          </div>
          <button
            type="button"
            className="md:hidden"
            aria-label={isMobileMenuOpen ? "Menüyü Kapat" : "Menüyü Aç"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5 text-ink" /> : <Menu className="h-5 w-5 text-ink" />}
          </button>
        </Container>
      </header>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-anchor/35 backdrop-blur-[1px]" />
          <nav
            id="mobile-nav-menu"
            className="absolute inset-x-3 top-24 rounded-2xl border border-line bg-paper p-4 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-1">
              <Link href="/paketler/" className="block rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-soft">
                Paketler
              </Link>
              {packageLinks.map((pkg) => (
                <Link key={pkg.label} href={pkg.href} className="block rounded-xl px-3 py-2 text-sm text-muted hover:bg-soft hover:text-ink">
                  {pkg.label}
                </Link>
              ))}
              <Link href="/kamplar/" className="block rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-soft">
                Kamplar
              </Link>
              <Link href="/blog/" className="block rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-soft">
                Blog
              </Link>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <ComingSoonButton />
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
