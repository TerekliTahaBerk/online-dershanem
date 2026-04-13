"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { navLinks } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LogoutButton } from "@/components/auth/logout-button";
import { ComingSoonButton } from "@/components/ui/coming-soon-button";
import navbarLogo from "@/public/onlinedershanem_.png";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const packageLinks = [
    { label: "TYT-AYT Paketleri", href: "/yks/" },
    { label: "LGS Paketleri", href: "/lgs/" }
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-shadow duration-300 ${
          scrolled
            ? "border-line/60 bg-paper/95 shadow-[0_1px_16px_-4px_rgba(9,20,19,0.10)] backdrop-blur-xl"
            : "border-line/40 bg-paper/80 backdrop-blur-xl"
        }`}
      >
        <Container className="flex h-[68px] items-center justify-between">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center shrink-0" aria-label="Online Dershanem Ana Sayfa">
            <Image
              src={navbarLogo}
              alt="Online Dershanem"
              width={300}
              height={52}
              className="h-8 w-[200px] object-contain object-left"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((item) =>
              item.label === "Paketler" ? (
                <div key={item.label} className="group relative">
                  <Link
                    href="/paketler/"
                    className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      pathname.startsWith("/paketler") || pathname.startsWith("/yks") || pathname.startsWith("/lgs")
                        ? "bg-soft text-ink"
                        : "text-muted hover:bg-soft/70 hover:text-ink"
                    }`}
                  >
                    Paketler <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
                  </Link>
                  <div className="absolute left-0 top-full z-50 w-52 pt-2">
                    <div className="pointer-events-none rounded-2xl border border-line bg-paper/98 p-1.5 opacity-0 shadow-soft backdrop-blur-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                      {packageLinks.map((pkg) => (
                        <Link
                          key={pkg.label}
                          href={pkg.href}
                          className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-soft ${
                            isActive(pkg.href) ? "bg-soft text-ink" : "text-muted hover:text-ink"
                          }`}
                        >
                          {pkg.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-soft text-ink"
                      : "text-muted hover:bg-soft/70 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2 md:flex">
            <ComingSoonButton />
            {status === "loading" ? null : status === "authenticated" ? (
              <>
                <Link
                  href={
                    session?.user?.role === "ADMIN" ? "/admin" :
                    session?.user?.role === "TEACHER" ? "/ogretmen" :
                    "/panel"
                  }
                  className="inline-flex rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition hover:bg-soft"
                >
                  {session?.user?.role === "ADMIN" ? "Admin Paneli" :
                   session?.user?.role === "TEACHER" ? "Öğretmen Paneli" :
                   "Panelim"}
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/kayit"
                  className="inline-flex rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition hover:bg-soft"
                >
                  Kayıt Ol
                </Link>
                <Link
                  href="/giris"
                  className="inline-flex rounded-full bg-anchor px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine"
                >
                  Giriş Yap
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-soft transition hover:bg-soft md:hidden"
            aria-label={isMobileMenuOpen ? "Menüyü Kapat" : "Menüyü Aç"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5 text-ink" /> : <Menu className="h-5 w-5 text-ink" />}
          </button>
        </Container>
      </header>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-anchor/30 backdrop-blur-sm" />
          <nav
            id="mobile-nav-menu"
            className="absolute inset-x-3 top-[78px] rounded-2xl border border-line bg-paper p-3 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted/60">Gezinti</p>
              <Link href="/paketler/" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-soft">
                Paketler
              </Link>
              {packageLinks.map((pkg) => (
                <Link key={pkg.label} href={pkg.href} className="flex items-center rounded-xl px-3 py-2 text-sm text-muted hover:bg-soft hover:text-ink">
                  <span className="mr-2 text-brand">›</span> {pkg.label}
                </Link>
              ))}
              <Link href="/kamplar/" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-soft">
                Kamplar
              </Link>
              <Link href="/blog/" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-soft">
                Blog
              </Link>
            </div>

            <div className="mt-3 border-t border-line-soft pt-3 flex flex-col gap-2">
              <ComingSoonButton />
              {status === "loading" ? null : status === "authenticated" ? (
                <>
                  <Link
                    href={
                      session?.user?.role === "ADMIN" ? "/admin" :
                      session?.user?.role === "TEACHER" ? "/ogretmen" :
                      "/panel"
                    }
                    className="inline-flex items-center justify-center rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-soft"
                  >
                    {session?.user?.role === "ADMIN" ? "Admin Paneli" :
                     session?.user?.role === "TEACHER" ? "Öğretmen Paneli" :
                     "Panelim"}
                  </Link>
                  <LogoutButton className="w-full justify-center" />
                </>
              ) : (
                <>
                  <Link
                    href="/kayit"
                    className="inline-flex items-center justify-center rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-soft"
                  >
                    Kayıt Ol
                  </Link>
                  <Link
                    href="/giris"
                    className="inline-flex items-center justify-center rounded-xl bg-anchor px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine"
                  >
                    Giriş Yap
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
