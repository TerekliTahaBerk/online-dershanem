"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { rolePath } from "@/lib/auth/roles";

/**
 * Panel navigasyonu.
 *
 * Menü rolden TÜRETİLİR, elle yazılmaz: yeni bir rol eklendiğinde
 * `Record<UserRole, ...>` derleme hatası verir ve menüsüz kalmaz.
 *
 * Zeytin yeşili burada CTA değil, AKTİF DURUM rengidir.
 */
type NavItem = { href: string; label: string };

const NAV: Record<UserRole, (root: string) => NavItem[]> = {
  ADMIN: (root) => [
    { href: root, label: "Özet" },
    { href: `${root}/kullanicilar`, label: "Kullanıcılar" },
    { href: `${root}/egitim`, label: "Gruplar & dersler" },
    { href: `${root}/isler`, label: "Sipariş & talepler" },
  ],
  TEACHER: (root) => [{ href: root, label: "Bugün" }],
  STUDENT: (root) => [{ href: root, label: "Özet" }],
  PARENT: (root) => [{ href: root, label: "Özet" }],
};

export function PanelNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV[role](rolePath(role));

  if (items.length < 2) return null;

  return (
    <nav aria-label="Panel menüsü" className="flex flex-wrap gap-1 border-b border-[var(--site-line)] pb-3">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${
              active
                ? "bg-[var(--brand-olive-soft)] font-semibold text-[var(--brand-olive)]"
                : "text-[var(--site-body)] hover:text-[var(--site-ink)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
