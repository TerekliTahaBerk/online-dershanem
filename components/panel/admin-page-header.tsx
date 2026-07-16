import type { LucideIcon } from "lucide-react";

export function AdminPageHeader({ eyebrow, title, description, icon: Icon, meta }: { eyebrow: string; title: string; description: string; icon: LucideIcon; meta?: string }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]"><span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--brand-olive-soft)]"><Icon size={13} /></span>{eyebrow}</p>
        <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.65rem)] font-semibold leading-[1.06] tracking-[-.05em] text-[var(--site-ink)]">{title}</h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[var(--site-body)]">{description}</p>
      </div>
      {meta ? <span className="w-fit rounded-full border border-[var(--site-line)] bg-white px-3 py-1.5 text-[10.5px] font-bold text-[var(--site-muted)] shadow-sm">{meta}</span> : null}
    </header>
  );
}
