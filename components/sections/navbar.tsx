"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { buildPanelChoiceHref, getPanelAccess, getPanelHref } from "@/lib/panel-access";
import { LogoutButton } from "@/components/auth/logout-button";

const links = [
  { label: "Paketler", href: "/paketler/" },
  { label: "Deneme Kulübü", href: "/deneme-kulubu/" },
  { label: "Blog", href: "/blog/" }
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const panelAccess = getPanelAccess(session?.user);
  const panelHref = panelAccess.requiresPanelChoice
    ? buildPanelChoiceHref()
    : panelAccess.defaultPanel
      ? getPanelHref(panelAccess.defaultPanel)
      : "/panel";
  const panelLabel = panelAccess.requiresPanelChoice
    ? "Panel Seç"
    : panelAccess.defaultPanel === "admin"
      ? "Admin"
      : panelAccess.defaultPanel === "teacher"
        ? "Öğretmen"
        : "Panelim";

  const isActive = (href: string) => pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-[#E5E5E0]/60 bg-[#FAFAF7]/85 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Online Dershanem" className="flex items-center gap-2 text-[#0E0E10]">
            <Image src="/logo.png" alt="" width={32} height={32} priority className="h-7 w-7 object-contain" />
            <span className="font-display text-[20px] leading-none tracking-tight text-[#0E0E10]">Online Dershanem</span>
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[14.5px] transition-colors ${
                  isActive(l.href) ? "text-[#0E0E10]" : "text-[#5A5A5F] hover:text-[#0E0E10]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {status === "loading" ? null : status === "authenticated" ? (
              <>
                <Link
                  href={panelHref}
                  className="rounded-full border border-[#0E0E10]/15 bg-white px-4 py-2 text-[13.5px] font-medium text-[#0E0E10] transition hover:border-[#0E0E10]/35"
                >
                  {panelLabel}
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/giris"
                  className="rounded-full px-3 py-2 text-[13.5px] text-[#5A5A5F] transition hover:text-[#0E0E10]"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  className="rounded-full border border-[#0E0E10]/15 bg-white px-4 py-2 text-[13.5px] font-medium text-[#0E0E10] shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:border-[#0E0E10]/35 hover:bg-[#F2F2EF]"
                >
                  Ücretsiz Dene
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {status === "loading" ? null : status === "authenticated" ? (
              <Link
                href={panelHref}
                className="rounded-full border border-[#0E0E10]/15 bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#0E0E10]"
              >
                {panelLabel}
              </Link>
            ) : (
              <Link
                href="/kayit"
                className="rounded-full border border-[#0E0E10]/15 bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#0E0E10]"
              >
                Ücretsiz Dene
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0E0E10]/12 bg-white text-[#0E0E10]"
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
          <div className="fixed inset-0 top-16 z-30 bg-[#0E0E10]/20 lg:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 top-16 z-40 border-b border-[#E5E5E0] bg-[#FAFAF7] lg:hidden">
            <nav className="flex flex-col gap-1 px-5 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-3 text-[15px] transition ${
                    isActive(l.href)
                      ? "bg-[#F2F2EF] text-[#0E0E10]"
                      : "text-[#5A5A5F] hover:bg-[#F2F2EF] hover:text-[#0E0E10]"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            {status === "unauthenticated" && (
              <div className="flex flex-col gap-2 border-t border-[#E5E5E0] px-5 py-4">
                <Link
                  href="/giris"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[#0E0E10]/15 bg-white py-3 text-center text-[14.5px] font-medium text-[#0E0E10]"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-[#0E0E10] py-3 text-center text-[14.5px] font-medium text-white"
                >
                  Ücretsiz Dene
                </Link>
              </div>
            )}
            {status === "authenticated" && (
              <div className="flex flex-col gap-2 border-t border-[#E5E5E0] px-5 py-4">
                <Link
                  href={panelHref}
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-[#0E0E10] py-3 text-center text-[14.5px] font-medium text-white"
                >
                  {panelLabel}
                </Link>
                <div className="flex justify-center">
                  <LogoutButton />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
