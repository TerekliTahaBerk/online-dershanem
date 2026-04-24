"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Tag,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/odk/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/odk/admin/sinavlar", label: "Sınavlar", icon: FileText },
  { href: "/odk/admin/paketler", label: "Paketler", icon: Package },
  { href: "/odk/admin/ogrenciler", label: "Öğrenciler", icon: Users },
  { href: "/odk/admin/etiketler", label: "Erişim Etiketleri", icon: Tag },
];

function Brand() {
  return (
    <Link href="/odk/admin" className="flex items-center gap-2">
      <div className="rounded-lg bg-white p-1 flex items-center justify-center">
        <Image src="/odklogo1.png" alt="odk." width={40} height={40} className="h-7 w-7 object-contain" />
      </div>
      <p className="text-xs font-bold text-stone-300">Admin</p>
    </Link>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          ← Ana Yönetim Paneli
        </Link>
        <Link
          href="/servis-secimi"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-stone-600 hover:text-stone-400 transition-colors"
        >
          ← Hizmet seçimine dön
        </Link>
      </div>
    </>
  );
}

export function OdkAdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#091413] border-b border-white/10 px-4 h-12 flex items-center justify-between">
        <Brand />
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
          <Brand />
        </div>
        <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 min-h-screen bg-[#091413] flex-col shrink-0 sticky top-0">
        <div className="px-5 py-5 border-b border-white/10">
          <Brand />
        </div>
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}
