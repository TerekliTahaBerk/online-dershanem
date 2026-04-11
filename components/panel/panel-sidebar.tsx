"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Package, User, LogOut,
  Calendar, CreditCard, Menu, X, GraduationCap,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/panel", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/panel/dersler", label: "Derslerim", icon: CalendarDays, exact: false },
  { href: "/panel/takvim", label: "Takvim", icon: Calendar, exact: false },
  { href: "/panel/ogretmenlerim", label: "Öğretmenlerim", icon: GraduationCap, exact: false },
  { href: "/panel/odemeler", label: "Ödemelerim", icon: CreditCard, exact: false },
  { href: "/panel/paketler", label: "Paketler", icon: Package, exact: false },
  { href: "/panel/profil", label: "Profilim", icon: User, exact: false },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-600 text-white"
                : "text-stone-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function LogoBlock() {
  return (
    <Link href="/panel" aria-label="Online Dershanem">
      <Image
        src="/logo.png"
        alt="Online Dershanem"
        width={160}
        height={38}
        className="h-8 w-auto"
        priority
      />
    </Link>
  );
}

export function PanelSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#091413] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <LogoBlock />
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-stone-400 hover:text-white p-1 rounded transition"
          aria-label="Menü"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed top-0 left-0 bottom-0 z-30 w-56 bg-[#091413] flex flex-col transform transition-transform duration-200 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="px-5 py-4 border-b border-white/10 mt-12">
          <LogoBlock />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/giris" })}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-[#091413] flex-col min-h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-white/10">
          <LogoBlock />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/giris" })}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}
