"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarDays,
  Package,
  GraduationCap,
  FileText,
  BarChart2,
  Tent,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/admin/ogrenciler", label: "Öğrenciler", icon: Users },
  { href: "/admin/odemeler", label: "Ödemeler", icon: CreditCard },
  { href: "/admin/dersler", label: "Dersler", icon: CalendarDays },
  { href: "/admin/paketler", label: "Paketler", icon: Package },
  { href: "/admin/kamplar", label: "Kamplar", icon: Tent },
  { href: "/admin/hocalar", label: "Hocalar", icon: GraduationCap },
  { href: "/admin/formlar", label: "Formlar", icon: FileText },
  { href: "/admin/istatistikler", label: "İstatistikler", icon: BarChart2 },
];

const odkNavItems = [
  { href: "/odk/admin", label: "ODK — Deneme Kulübü", icon: BarChart2 },
];

function LogoBlock() {
  return (
    <Link href="/admin" aria-label="Admin Panel">
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

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-stone-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-0.5">
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-600">Diğer Paneller</p>
        {odkNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-stone-500 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#091413] border-b border-white/10 px-4 h-12 flex items-center justify-between">
        <LogoBlock />
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-stone-300 hover:text-white p-1 rounded transition"
          aria-label="Menüyü aç"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-30 w-60 bg-[#091413] flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 h-12 border-b border-white/10 flex items-center">
          <LogoBlock />
        </div>
        <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        <div className="px-3 py-4 border-t border-white/10">
          <p className="text-stone-600 text-xs text-center">Admin · {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 min-h-screen bg-[#091413] flex-col shrink-0 sticky top-0">
        <div className="px-5 py-5 border-b border-white/10">
          <LogoBlock />
        </div>
        <SidebarContent pathname={pathname} />
        <div className="px-3 py-4 border-t border-white/10">
          <p className="text-stone-600 text-xs text-center">Admin · {new Date().getFullYear()}</p>
        </div>
      </aside>
    </>
  );
}
