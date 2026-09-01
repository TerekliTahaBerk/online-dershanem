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

export type { PanelNavItem, PanelNavSection };
export { mobilePrimaryNav, panelNavSections };

export function PanelNav({
  role,
  products = [],
  onNavigate,
}: {
  role: UserRole;
  products?: ProductCode[];
  onNavigate?: () => void;
}) {
  const flags = usePanelFeatureFlags();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const root = rolePath(role);
  const sections = panelNavSections(role, products, flags, root);
  const selectedStudentId = role === "PARENT" ? searchParams.get("studentId") : null;

  return (
    <nav aria-label="Panel menüsü" className="flex flex-col gap-3">
      {sections.map((navSection) => (
        <section key={navSection.id} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 pt-0.5 text-[10.5px] font-extrabold uppercase tracking-[.08em] text-dc-ink-ghost">
            {navSection.title}
          </p>
          {navSection.items.map((item) => {
            const active =
              pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`));
            const shouldPreserveParentContext =
              Boolean(selectedStudentId) &&
              (item.href.startsWith(root) || item.href.startsWith("/panel/odk/veli"));
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
                className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                  active
                    ? "bg-dc-brand-soft text-dc-brand-deep"
                    : "text-[var(--pd-ink-3)] hover:bg-dc-surface-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 flex-none rounded-full ${
                    active ? "bg-dc-brand" : "bg-dc-line"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
