import Link from "next/link";
import {
  BUSINESS_SECTION_GROUPS,
  SECTION_LABELS,
  type BusinessSectionSlug,
} from "@/lib/business/sections";

/** Geriye dönük uyumluluk: mevcut import'lar bu diziye dayanıyor. */
export const BUSINESS_SECTIONS = Object.entries(SECTION_LABELS) as Array<
  [BusinessSectionSlug, string]
>;

/**
 * İşletme menüsü.
 *
 * `allowed` yalnız kullanıcının görüntüleme izni olan bölümleri içerir;
 * bunlar sunucuda `getUserBusinessPermissions` ile hesaplanır. Menüyü
 * gizlemek bir güvenlik sınırı DEĞİLDİR — her sayfa kendi guard'ını
 * çalıştırmaya devam eder; bu yalnız kullanıcıya 404 ile biten linkler
 * göstermemek içindir.
 */
export function BusinessNav({
  active,
  allowed,
}: {
  active: string;
  allowed: readonly BusinessSectionSlug[];
}) {
  const allowedSet = new Set(allowed);
  const groups = BUSINESS_SECTION_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((slug) => allowedSet.has(slug)),
  })).filter((group) => group.sections.length > 0);

  return (
    <nav
      aria-label="İşletme panel menüsü"
      className="flex flex-col gap-4"
    >
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-px">
          <p
            id={`business-nav-group-${group.id}`}
            className="px-2.5 pb-1 pt-1 text-[11px] font-semibold tracking-[.04em] text-pn-text-muted"
          >
            {group.label.toLocaleUpperCase("tr-TR")}
          </p>
          <ul
            aria-labelledby={`business-nav-group-${group.id}`}
            className="flex flex-col gap-px"
          >
            {group.sections.map((slug) => {
              const selected = active === slug;
              return (
                <li key={slug}>
                  <Link
                    href={`/panel/yonetim/isletme/${slug}`}
                    aria-current={selected ? "page" : undefined}
                    className={`relative flex min-h-11 items-center rounded-md px-2.5 py-1.5 text-[14px] transition-colors lg:min-h-9 lg:text-[13.5px] ${
                      selected
                        ? "bg-pn-selected font-semibold text-pn-text"
                        : "font-medium text-pn-text-secondary hover:bg-pn-hover hover:text-pn-text"
                    }`}
                  >
                    {selected ? (
                      <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-pn-accent" />
                    ) : null}
                    {SECTION_LABELS[slug]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
