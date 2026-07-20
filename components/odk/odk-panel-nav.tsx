"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Activity, BarChart3, ClipboardCheck, LayoutDashboard, Rocket } from "lucide-react";
import { productRolePath } from "@/lib/auth/roles";

export function OdkPanelNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const home = productRolePath("ODK", role);
  const items = [{ href: home, label: "ODK ana sayfa", icon: LayoutDashboard }, ...(role === "ADMIN" ? [{ href: `${home}/sinavlar`, label: "Deneme planlama", icon: ClipboardCheck }, { href: `${home}/operasyon`, label: "Canlı operasyon", icon: Activity }, { href: `${home}/pilot`, label: "Pilot yayını", icon: Rocket }] : []), ...(role === "STUDENT" ? [{ href: `${home}/denemeler`, label: "Denemelerim", icon: ClipboardCheck }] : []), ...(role === "ADMIN" || role === "TEACHER" || role === "PARENT" ? [{ href: `${home}/raporlar`, label: "Deneme raporları", icon: BarChart3 }] : [])];
  return <nav aria-label="Online Deneme Kulübü menüsü" className="space-y-1">{items.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href !== home && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-bold ${active ? "bg-[var(--panel-nav-active)] text-[var(--brand-olive)]" : "text-[var(--site-body)] hover:bg-white"}`}><span className="grid h-8 w-8 place-items-center rounded-xl bg-white"><Icon size={16} /></span>{label}</Link>; })}</nav>;
}
