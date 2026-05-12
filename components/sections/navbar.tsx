"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

const links = [
  { label: "Misyonumuz", href: "/misyonumuz/" },
  { label: "Paketler", href: "/paketler/" },
  { label: "Deneme Kulübü", href: "/deneme-kulubu/" },
  { label: "Blog", href: "/blog/" },
  { label: "Kariyer", href: "/kariyer/" }
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    setOpen(false);
    setPanelOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!panelOpen) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  const role = session?.user?.role as
    | "ADMIN"
    | "TEACHER"
    | "STUDENT"
    | "PARENT"
    | undefined;
  const panelSegment =
    role === "ADMIN" ? "admin" :
    role === "TEACHER" ? "ogretmen" :
    role === "PARENT" ? "veli" : "ogrenci";
  const panelHref = `/panel/${panelSegment}`;
  const odkHref = `/panel/${panelSegment}/odk`;
  const panelLabel =
    role === "ADMIN" ? "Admin Panel" :
    role === "TEACHER" ? "Öğretmen Paneli" :
    role === "PARENT" ? "Veli Paneli" : "Öğrenci Paneli";

  const isActive = (href: string) => pathname.startsWith(href.replace(/\/$/, ""));
  const isHome = pathname === "/";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-transparent bg-transparent">
        <div className="relative mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
          <Link href="/" aria-label="Online Dershanem" className="flex shrink-0 items-center text-[#0E0E10]">
            <Image
              src="/onlinedershanem_.png"
              alt="Online Dershanem"
              width={1050}
              height={200}
              priority
              className="h-7 w-auto object-contain sm:h-8"
            />
          </Link>

          <nav className={`absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex ${isHome ? "lg:hidden" : ""}`}>
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

          <div className={`hidden items-center gap-2 lg:flex ${isHome ? "lg:hidden" : ""}`}>
            {status === "loading" ? null : status === "authenticated" ? (
              <>
                <div className="relative" ref={panelRef}>
                  <button
                    type="button"
                    onClick={() => setPanelOpen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-full border border-[#0E0E10]/15 bg-white px-4 py-2 text-[13.5px] font-medium text-[#0E0E10] transition hover:border-[#0E0E10]/35"
                    aria-haspopup="menu"
                    aria-expanded={panelOpen}
                  >
                    {panelLabel}
                    <ChevronDown size={14} className={`transition-transform ${panelOpen ? "rotate-180" : ""}`} />
                  </button>
                  {panelOpen ? (
                    <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-[#E5E5E0] bg-white p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)]" role="menu">
                      <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-[#9A9A9F]">Ürünler</div>
                      <Link
                        href={panelHref}
                        onClick={() => setPanelOpen(false)}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-[#F2F2EF]"
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2563eb]" aria-hidden />
                        <span className="flex flex-col">
                          <span className="text-[13.5px] font-semibold text-[#0E0E10]">OnlineDershanem</span>
                          <span className="text-[11.5px] text-[#5A5A5F]">{panelLabel}</span>
                        </span>
                      </Link>
                      <Link
                        href={odkHref}
                        onClick={() => setPanelOpen(false)}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-[#F2F2EF]"
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f59e0b]" aria-hidden />
                        <span className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#0E0E10]">
                            OnlineDenemeKulübü
                            <span className="rounded-full bg-amber-100 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider text-amber-700">ODK</span>
                          </span>
                          <span className="text-[11.5px] text-[#5A5A5F]">TYT · AYT · LGS denemeleri</span>
                        </span>
                      </Link>
                    </div>
                  ) : null}
                </div>
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
                  Hemen Kayıt Ol
                </Link>
              </>
            )}
          </div>

          <div className={`flex items-center gap-1.5 lg:hidden ${isHome ? "hidden" : ""}`}>
            {status === "loading" ? null : status === "authenticated" ? (
              <Link
                href={panelHref}
                className="rounded-full border border-[#0E0E10]/15 bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#0E0E10]"
              >
                {panelLabel}
              </Link>
            ) : (
              <Link
                href="/kayit"
                className="rounded-full border border-[#0E0E10]/15 bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#0E0E10]"
              >
                Kayıt Ol
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0E0E10]/12 bg-white text-[#0E0E10]"
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
                  Hemen Kayıt Ol
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
                <Link
                  href={odkHref}
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-amber-300 bg-amber-50 py-3 text-center text-[14.5px] font-medium text-amber-800"
                >
                  OnlineDenemeKulübü
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
