"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Tag,
  Trophy
} from "lucide-react";

const navItems = [
  { href: "/odk/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/odk/admin/sinavlar", label: "Sınavlar", icon: FileText },
  { href: "/odk/admin/paketler", label: "Paketler", icon: Package },
  { href: "/odk/admin/ogrenciler", label: "Öğrenciler", icon: Users },
  { href: "/odk/admin/etiketler", label: "Erişim Etiketleri", icon: Tag },
];

export function OdkAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-[#091413] flex flex-col shrink-0 sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/odk/admin" className="flex items-center gap-2.5">
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
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/servis-secimi"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          ← Hizmet seçimine dön
        </Link>
      </div>
    </aside>
  );
}
