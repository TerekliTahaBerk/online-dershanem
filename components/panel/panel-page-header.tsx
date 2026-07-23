import type { LucideIcon } from "lucide-react";

export function PanelPageHeader({ eyebrow, title, description, icon: Icon, action }: { eyebrow: string; title: string; description?: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.09em] text-[var(--brand-olive)]">
          {Icon ? <Icon size={15} aria-hidden="true" /> : null}
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)] sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--site-body)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
