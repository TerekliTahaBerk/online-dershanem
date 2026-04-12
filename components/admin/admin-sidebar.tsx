"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarDays,
  Package,
  GraduationCap,
  FileText,
  BarChart2,
  Tent
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
  { href: "/admin/istatistikler", label: "İstatistikler", icon: BarChart2 }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-[#091413] flex flex-col shrink-0 sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
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
        <p className="text-stone-600 text-xs text-center">Admin · {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
