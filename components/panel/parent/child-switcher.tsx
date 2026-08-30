import Link from "next/link";
import type { ParentChild } from "@/lib/panel/parent-scope";

/**
 * ÖĞRENCİ SEÇİCİ — onaylı tasarım (Panel.dc.html → topbar, isParent).
 *
 * Tek çocuk varsa seçici gösterilmez (gereksiz gürültü). Birden çok çocukta
 * hangi öğrencinin verisine bakıldığı her ekranda görünür kalır — §23'ün
 * "veriler karıştırılmaz, seçim açık olur" kuralı.
 */
export function ChildSwitcher({
  options,
  selectedId,
  basePath,
}: {
  options: ParentChild[];
  selectedId: string | null;
  basePath: string;
}) {
  if (options.length < 2) return null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[13px] text-dc-ink-faint">Öğrenci:</span>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 pr-1">
        {options.map((child) => {
          const active = child.id === selectedId;
          return (
            <Link
              key={child.id}
              href={`${basePath}?studentId=${encodeURIComponent(child.id)}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-9 max-w-[18rem] shrink-0 items-center rounded-lg px-3 py-1.5 text-left text-[13px] font-semibold leading-tight transition-colors ${
                active
                  ? "bg-dc-brand-soft text-dc-brand-deep"
                  : "text-dc-ink-muted hover:bg-dc-surface-muted"
              }`}
            >
              {child.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
