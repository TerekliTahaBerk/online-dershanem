"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarDays,
  Package,
  GraduationCap,
  FileText
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/admin/ogrenciler", label: "Öğrenciler", icon: Users },
  { href: "/admin/odemeler", label: "Ödemeler", icon: CreditCard },
  { href: "/admin/dersler", label: "Dersler", icon: CalendarDays },
  { href: "/admin/paketler", label: "Paketler", icon: Package },
  { href: "/admin/hocalar", label: "Hocalar", icon: GraduationCap },
  { href: "/admin/formlar", label: "Formlar", icon: FileText }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-[#091413] flex flex-col shrink-0">
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-[#B0E4CC] font-bold text-lg tracking-tight">
          Dershane Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[#B0E4CC]/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
          Ana Menü
        </p>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#285A48] text-[#B0E4CC]"
                  : "text-[#B0E4CC]/60 hover:bg-white/5 hover:text-[#B0E4CC]"
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
        <p className="text-[#B0E4CC]/30 text-xs text-center">v1.0 · {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
