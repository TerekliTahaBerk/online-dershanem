"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, Users, User, LogOut,
  Calendar, Menu, X, BookOpen,
} from "lucide-react";

const navItems = [
  { href: "/ogretmen", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/ogretmen/dersler", label: "Derslerim", icon: BookOpen, exact: false },
  { href: "/ogretmen/takvim", label: "Takvim", icon: Calendar, exact: false },
  { href: "/ogretmen/ogrencilerim", label: "Öğrencilerim", icon: Users, exact: false },
  { href: "/ogretmen/profil", label: "Profilim", icon: User, exact: false },
];

function LogoBlock() {
  return (
    <Link href="/ogretmen" className="flex items-center h-14 px-4 shrink-0">
      <Image src="/logo.png" alt="Online Dershanem" width={160} height={38} className="h-8 w-auto" priority />
    </Link>
  );
}

function NavLink({ href, label, icon: Icon, exact }: typeof navItems[number]) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-emerald-600 text-white"
          : "text-stone-400 hover:text-white hover:bg-white/10"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </Link>
  );
}

export function OgretmenSidebar() {
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <LogoBlock />
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/giris" })}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-[#091413] px-4 h-12">
        <Image src="/logo.png" alt="Online Dershanem" width={120} height={28} className="h-6 w-auto" priority />
        <button
          onClick={() => setOpen(true)}
          className="text-stone-300 hover:text-white p-1"
          aria-label="Menüyü aç"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-56 bg-[#091413] transition-transform duration-300 ${
          open ? "-translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/10">
          <Image src="/logo.png" alt="Online Dershanem" width={120} height={28} className="h-6 w-auto" />
          <button onClick={() => setOpen(false)} className="text-stone-300 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/giris" })}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-[#091413] sticky top-0 h-screen overflow-hidden">
        {sidebarContent}
      </aside>
    </>
  );
}
