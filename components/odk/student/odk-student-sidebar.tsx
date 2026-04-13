"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, BarChart2, User, Trophy } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

const navItems = [
  { href: "/odk/panel", label: "Ana Sayfa", icon: LayoutDashboard, exact: true },
  { href: "/odk/panel/sinavlar", label: "Sınavlarım", icon: FileText },
  { href: "/odk/panel/sonuclar", label: "Sonuçlarım", icon: BarChart2 },
  { href: "/odk/panel/profil", label: "Profil", icon: User },
];

export function OdkStudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-[#091413] flex flex-col shrink-0 sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/odk/panel" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-white">Online Deneme</p>
            <p className="text-xs font-bold text-emerald-400">Kulübü</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        <Link
          href="/servis-secimi"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          ← Hizmet seçimine dön
        </Link>
        <div className="px-3">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
