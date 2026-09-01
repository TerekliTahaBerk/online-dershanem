import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * ODK ve işletme admin tabloları için mobil kart / masaüstü tablo düzeni.
 * `panel-table-responsive` CSS'i ile çalışır (globals.css).
 */
export function ResponsiveDataTable({
  children,
  minWidthClassName = "lg:min-w-[640px]",
  className,
}: {
  children: ReactNode;
  minWidthClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("panel-table-shell", className)}>
      <p
        className="panel-table-scroll-hint mb-2 text-[11.5px] font-semibold text-dc-ink-faint lg:hidden"
        aria-hidden="true"
      >
        Detaylar kart olarak listelenir.
      </p>
      <div className="overflow-x-auto rounded-[14px] border border-dc-line bg-white lg:overflow-visible">
        <table
          className={cn(
            "panel-table-responsive w-full border-collapse text-left text-xs",
            minWidthClassName,
          )}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function ResponsiveDataTableHead({ children }: { children: ReactNode }) {
  return <thead className="max-lg:sr-only">{children}</thead>;
}

export function ResponsiveDataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function ResponsiveDataTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("panel-table-row border-t border-[var(--site-line)]", className)}>
      {children}
    </tr>
  );
}

export function ResponsiveDataTableCell({
  label,
  children,
  className,
  header,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  header?: boolean;
}) {
  const Tag = header ? "th" : "td";
  return (
    <Tag
      data-label={label}
      scope={header ? "col" : undefined}
      className={cn(
        "panel-table-cell py-2 pr-3",
        header ? "pb-2 text-left text-[10px] uppercase tracking-wide text-[var(--site-muted)]" : "",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
