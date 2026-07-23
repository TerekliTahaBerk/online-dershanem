"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Activity, BarChart3, ClipboardCheck, LayoutDashboard, Rocket } from "lucide-react";
import { productRolePath } from "@/lib/auth/roles";

export function OdkPanelNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const home = productRolePath("ODK", role);
  const items = [
    { href: home, label: role === "ADMIN" ? "Kontrol merkezi" : "Özet", hint: "Bugün ve sıradaki adım", icon: LayoutDashboard },
    ...(role === "ADMIN" ? [
      { href: `${home}/sinavlar`, label: "Deneme planlama", hint: "İçerik, takvim ve yayın", icon: ClipboardCheck },
      { href: `${home}/operasyon`, label: "Canlı operasyon", hint: "Oturumlar ve bağlantı", icon: Activity },
      { href: `${home}/raporlar`, label: "Deneme raporları", hint: "Sonuç ve kazanım", icon: BarChart3 },
      { href: `${home}/pilot`, label: "Pilot yayını", hint: "Kapılar ve geri alma", icon: Rocket },
    ] : []),
    ...(role === "STUDENT" ? [{ href: `${home}/denemeler`, label: "Denemelerim", hint: "Yaklaşan ve geçmiş", icon: ClipboardCheck }] : []),
    ...(role === "TEACHER" || role === "PARENT" ? [{ href: `${home}/raporlar`, label: "Deneme raporları", hint: "Sonuç ve gelişim", icon: BarChart3 }] : []),
  ];

  return (
    <nav aria-label="Online Deneme Kulübü menüsü" className={`panel-nav-scroll flex gap-2 overflow-x-auto ${role === "ADMIN" ? "lg:flex-col lg:gap-1 lg:overflow-visible" : ""}`}>
      {items.map(({ href, label, hint, icon: Icon }) => {
        const active = pathname === href || (href !== home && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex min-w-fit items-center gap-3 rounded-2xl px-3 py-2.5 transition-all ${role === "ADMIN" ? "lg:w-full" : ""} ${active ? "bg-[var(--panel-nav-active)] text-[var(--brand-olive)] shadow-[inset_0_0_0_1px_rgba(58,74,44,.05)]" : "text-[var(--site-body)] hover:bg-white hover:text-[var(--site-ink)]"}`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${active ? "bg-white text-[var(--brand-olive)] shadow-sm" : "bg-white/65 text-[var(--site-muted)] group-hover:text-[var(--site-ink)]"}`}>
              <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-bold leading-4">{label}</span>
              {role === "ADMIN" ? <span className="mt-0.5 hidden text-[10.5px] leading-4 text-[var(--site-muted)] lg:block">{hint}</span> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
