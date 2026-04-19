"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight } from "lucide-react";
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
  const pathname = usePathname();
  const { data: session, status } = useSession();
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
    <header className="pd-mnav">
      <Link href="/" className="pd-mnav-brand" aria-label="Online Dershanem Ana Sayfa">
        <span className="pd-mnav-logo">OD</span>
        <span>onlinedershanem.com</span>
      </Link>

      <nav className="pd-mnav-links">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`pd-mnav-link ${isActive(l.href) ? "active" : ""}`}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {status === "loading" ? null : status === "authenticated" ? (
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
    </header>
  );
}
