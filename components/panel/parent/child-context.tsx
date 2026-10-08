import Link from "next/link";
import type { ParentChild } from "@/lib/panel/parent-scope";

/**
 * VELİ · ÖĞRENCİ BAĞLAMI (docs/panel-design-roadmap.md §9.7) — sayfa
 * başlığının özellik satırında: hangi çocuğun verisine bakıldığı her zaman
 * yazılı; birden çok çocukta diğerlerine geçiş bağlantıları. Seçim URL'de
 * (`?studentId=`) kalır; sunucu kapsamı (`resolveParentScope`) yetkidir.
 */
export function ChildContext({
  options,
  selectedId,
  basePath,
}: {
  options: ParentChild[];
  selectedId: string | null;
  basePath: string;
}) {
  const selected = options.find((child) => child.id === selectedId) ?? null;
  if (!selected) return null;
  const others = options.filter((child) => child.id !== selected.id);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-pn-text-secondary">
      <span>
        Öğrenci: <strong className="font-semibold text-pn-text">{selected.name}</strong>
      </span>
      {others.length ? (
        <nav aria-label="Öğrenci seç" className="flex flex-wrap items-center gap-1">
          <span aria-hidden="true" className="text-pn-text-muted">
            ·
          </span>
          {others.map((child) => (
            <Link
              key={child.id}
              href={`${basePath}?studentId=${encodeURIComponent(child.id)}`}
              className="rounded px-1.5 py-0.5 text-pn-text-secondary underline-offset-2 hover:bg-pn-hover hover:text-pn-text hover:underline"
            >
              {child.name}
              <span className="sr-only"> öğrencisine geç</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </span>
  );
}
