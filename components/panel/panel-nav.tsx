"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, CalendarDays, CreditCard, History, LayoutDashboard, UsersRound } from "lucide-react";
import { rolePath } from "@/lib/auth/roles";

type NavItem = { href: string; label: string; hint?: string; icon: LucideIcon };

const NAV: Record<UserRole, (root: string) => NavItem[]> = {
  ADMIN: (root) => [
    { href: root, label: "Kontrol merkezi", hint: "Bugün ve uyarılar", icon: LayoutDashboard },
    { href: `${root}/takvim`, label: "Takvim", hint: "Haftalık ders akışı", icon: CalendarDays },
    { href: `${root}/kullanicilar`, label: "Kişiler", hint: "Hesaplar ve roller", icon: UsersRound },
    { href: `${root}/egitim`, label: "Eğitim", hint: "Gruplar ve dersler", icon: BookOpenCheck },
    { href: `${root}/isler`, label: "Operasyon", hint: "Talepler ve ödemeler", icon: CreditCard },
    { href: `${root}/kayitlar`, label: "İşlem geçmişi", hint: "Değişiklik ve güvenlik izi", icon: History },
  ],
  TEACHER: (root) => [{ href: root, label: "Bugün", icon: BookOpenCheck }],
  STUDENT: (root) => [{ href: root, label: "Özet", icon: LayoutDashboard }],
  PARENT: (root) => [{ href: root, label: "Özet", icon: LayoutDashboard }],
};

export function PanelNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const root = rolePath(role);
  const items = NAV[role](root);

  if (items.length < 2) return null;

  return (
    <nav aria-label="Panel menüsü" className="panel-nav-scroll flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group flex min-w-fit items-center gap-3 rounded-2xl px-3 py-2.5 transition-all lg:w-full ${
              active
                ? "bg-[var(--panel-nav-active)] text-[var(--brand-olive)] shadow-[inset_0_0_0_1px_rgba(58,74,44,.05)]"
                : "text-[var(--site-body)] hover:bg-white hover:text-[var(--site-ink)]"
            }`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${active ? "bg-white text-[var(--brand-olive)] shadow-sm" : "bg-white/65 text-[var(--site-muted)] group-hover:text-[var(--site-ink)]"}`}>
              <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-bold leading-4">{item.label}</span>
              {item.hint ? <span className="mt-0.5 hidden text-[10.5px] leading-4 text-[var(--site-muted)] lg:block">{item.hint}</span> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
