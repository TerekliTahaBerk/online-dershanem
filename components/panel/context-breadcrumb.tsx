"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { rolePath } from "@/lib/auth/roles";
import { usePanelFeatureFlags } from "@/components/panel/panel-feature-provider";
import { panelNavSections, type PanelNavItem } from "@/lib/panel/navigation";
import type { StaffPermission } from "@/lib/products/staff-permission-matrix";

/**
 * Bağlam çubuğu breadcrumb'ı: `Çalışma alanı / Menü öğesi / Sayfa`.
 *
 * Menü öğesi, kenar çubuğuyla AYNI menü modelinden (`panelNavSections`)
 * bulunur; en uzun eşleşen `href` kazanır. Sayfa başlığı, eşleşen öğenin
 * adıyla aynıysa tekrar edilmez. Kendi menüsü olan alanlarda (İşletme) yalnız
 * çalışma alanı ve sayfa başlığı gösterilir.
 */
export function ContextBreadcrumb({
  workspace,
  pageTitle,
  role,
  products,
  scope,
  staffOdkPermissions,
  useRoleNav,
}: {
  workspace: { label: string; href: string };
  pageTitle?: string;
  role: UserRole;
  products: ProductCode[];
  scope: ProductCode | null;
  staffOdkPermissions: readonly StaffPermission[] | null;
  /** Rol menüsü kullanılıyorsa true; özel menülü alanlarda false. */
  useRoleNav: boolean;
}) {
  const flags = usePanelFeatureFlags();
  const pathname = usePathname();
  const root = rolePath(role);

  let match: PanelNavItem | null = null;
  if (useRoleNav) {
    for (const navSection of panelNavSections(role, products, flags, root, scope, staffOdkPermissions)) {
      for (const item of navSection.items) {
        const hit = pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`));
        if (hit && (!match || item.href.length > match.href.length)) match = item;
      }
    }
  }

  const crumbs: Array<{ label: string; href?: string }> = [{ label: workspace.label, href: workspace.href }];
  if (match && match.href !== workspace.href) crumbs.push({ label: match.label, href: match.href });
  const last = crumbs[crumbs.length - 1];
  if (pageTitle && pageTitle !== last.label && pageTitle !== match?.label) crumbs.push({ label: pageTitle });

  return (
    <nav aria-label="Konum" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-[13px]">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className={`flex min-w-0 items-center gap-1 ${index > 0 && !isLast ? "hidden md:flex" : ""} ${
                index === 0 && crumbs.length > 1 ? "hidden sm:flex" : ""
              }`}
            >
              {index > 0 ? <ChevronRight size={13} aria-hidden="true" className="shrink-0 text-pn-text-muted" /> : null}
              {isLast || !crumb.href ? (
                <span aria-current={isLast ? "page" : undefined} className={`truncate ${isLast ? "font-semibold text-pn-text" : "text-pn-text-muted"}`}>
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate text-pn-text-muted transition-colors hover:text-pn-text">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
