"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { rolePath } from "@/lib/auth/roles";
import { usePanelFeatureFlags } from "@/components/panel/panel-feature-provider";
import {
  mobilePrimaryNav,
  panelNavSections,
  type PanelNavItem,
  type PanelNavSection,
} from "@/lib/panel/navigation";
import { withParentStudentContext } from "@/lib/parent-home-summary";
import type { StaffPermission } from "@/lib/products/staff-permission-matrix";

export type { PanelNavItem, PanelNavSection };
export { mobilePrimaryNav, panelNavSections };

export function PanelNav({
  role,
  products = [],
  scope = null,
  staffOdkPermissions = null,
  onNavigate,
}: {
  role: UserRole;
  products?: ProductCode[];
  /** Seçili ürün paneli; menüyü o ürüne daraltır (yetki değil, sunum). */
  scope?: ProductCode | null;
  /** Deneme Ligi personel izinleri (yalnız enforce modunda öğretmen için; sunum). */
  staffOdkPermissions?: readonly StaffPermission[] | null;
  onNavigate?: () => void;
}) {
  const flags = usePanelFeatureFlags();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const root = rolePath(role);
  const sections = panelNavSections(role, products, flags, root, scope, staffOdkPermissions);
  const selectedStudentId =
    role === "PARENT" ? searchParams.get("studentId") : null;

  return (
    <nav aria-label="Panel menüsü" className="flex flex-col gap-4">
      {sections.map((navSection) => (
        <section key={navSection.id} className="flex flex-col gap-px">
          <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold tracking-[.04em] text-pn-text-muted">
            {navSection.title}
          </p>
          {navSection.items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== root && pathname.startsWith(`${item.href}/`));
            const shouldPreserveParentContext =
              Boolean(selectedStudentId) &&
              (item.href.startsWith(root) ||
                item.href.startsWith("/panel/odk/veli"));
            const href = shouldPreserveParentContext
              ? withParentStudentContext(item.href, selectedStudentId)
              : item.href;

            return (
              <Link
                key={item.id}
                href={href}
                prefetch
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-11 items-center rounded-md px-2.5 py-1.5 text-[14px] lg:min-h-9 lg:text-[13.5px] transition-colors ${
                  active
                    ? "bg-pn-selected font-semibold text-pn-text"
                    : "font-medium text-pn-text-secondary hover:bg-pn-hover hover:text-pn-text"
                }`}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-pn-accent"
                  />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
