"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { buildPanelChoiceHref, getPanelAccess, getPanelHref } from "@/lib/panel-access";
import { LogoutButton } from "@/components/auth/logout-button";

const links = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Paketler", href: "/paketler/" },
  { label: "Kamplar", href: "/kamplar/" },
  { label: "Deneme Kulübü", href: "/deneme-kulubu/" },
  { label: "Blog", href: "/blog/" }
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => { setOpen(false); }, [pathname]);

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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <>
      <header className="pd-mnav">
        <Link href="/" className="pd-mnav-brand" aria-label="Online Dershanem Ana Sayfa">
          <Image src="/onlinedershanem_.png" alt="Online Dershanem" width={1050} height={200} className="pd-brand-wordmark" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="pd-mnav-links hidden lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`pd-mnav-link ${isActive(l.href) ? "active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block" style={{ flex: 1 }} />

        {/* Desktop auth */}
        {status !== "loading" && (
          <div className="hidden lg:flex items-center gap-2">
            {status === "authenticated" ? (
              <>
                <Link href={panelHref} className="pd-btn pd-btn-primary pd-btn-sm">{panelLabel}</Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/giris" className="pd-btn pd-btn-ghost pd-btn-sm">Giriş Yap</Link>
                <Link href="/kayit" className="pd-btn pd-btn-primary pd-btn-sm">
                  Ücretsiz Dene <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        )}

        {/* Mobile: auth + hamburger */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          {status === "unauthenticated" && (
            <Link
              href="/giris"
              className="whitespace-nowrap text-sm font-medium text-[var(--pd-ink-3)] transition-colors hover:text-[var(--pd-ink)]"
            >
              Giriş Yap
            </Link>
          )}
          {status !== "loading" && (
            status === "authenticated" ? (
              <Link href={panelHref} className="pd-btn pd-btn-primary pd-btn-sm">
                {panelLabel}
              </Link>
            ) : (
              <Link href="/kayit" className="pd-btn pd-btn-primary pd-btn-sm whitespace-nowrap">
                Ücretsiz Dene
              </Link>
            )
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--pd-line)] bg-[var(--pd-bg-elevated)] transition hover:bg-[var(--pd-bg-subtle)]"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
          >
            {open ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <>
          <div className="fixed inset-0 top-[52px] z-[39] lg:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 top-[52px] z-40 border-b border-[var(--pd-line)] bg-[var(--pd-bg-elevated)] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.1)] lg:hidden">
            <nav className="flex flex-col gap-0.5 px-4 pt-3 pb-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${
                    isActive(l.href)
                      ? "bg-[var(--pd-bg-subtle)] text-[var(--pd-ink)]"
                      : "text-[var(--pd-ink-3)] hover:bg-[var(--pd-bg-subtle)] hover:text-[var(--pd-ink)]"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            {status === "unauthenticated" && (
              <div className="flex flex-col gap-2 border-t border-[var(--pd-line)] px-4 py-3">
                <Link href="/giris" onClick={() => setOpen(false)} className="pd-btn pd-btn-ghost w-full justify-center py-3 text-[15px]">
                  Giriş Yap
                </Link>
                <Link href="/kayit" onClick={() => setOpen(false)} className="pd-btn pd-btn-primary w-full justify-center py-3 text-[15px]">
                  Ücretsiz Dene <ArrowRight size={14} />
                </Link>
              </div>
            )}
            {status === "authenticated" && (
              <div className="flex flex-col gap-2 border-t border-[var(--pd-line)] px-4 py-3">
                <Link href={panelHref} onClick={() => setOpen(false)} className="pd-btn pd-btn-primary w-full justify-center py-3 text-[15px]">
                  {panelLabel}
                </Link>
                <div className="flex justify-center pb-1">
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
