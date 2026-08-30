import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type PanelTone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * PANEL PRIMITIVE'LERİ — onaylı tasarım (Panel.dc.html).
 *
 * Tasarımdaki panel ekranları aynı birkaç kalıbı tekrar ediyor: sayfa başlığı,
 * beyaz kart (1px #E7EBE8, 14px radius, 22px iç boşluk), ızgara tablo, bölüm
 * etiketi ve onay kutulu görev satırı. Hepsi burada bir kez tanımlanır ki
 * ekranlar kısa kalsın ve ölçüler tek yerden değişsin.
 */

/* ── Sayfa başlığı ────────────────────────────────────────────────────── */

export function PanelHeading({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-[13px] text-dc-ink-faint">{eyebrow}</p> : null}
        <h1
          className={`text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em] text-dc-ink ${
            eyebrow ? "mt-2" : ""
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-[14.5px] text-dc-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function PanelPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.09em] text-dc-brand-strong">
            {Icon ? <Icon size={15} aria-hidden="true" /> : null}
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn("max-w-4xl font-semibold tracking-[-.04em] text-dc-ink", eyebrow ? "mt-2.5 text-3xl sm:text-4xl" : "text-[26px] sm:text-[28px]")}>
          {title}
        </h1>
        {description ? <p className="mt-2.5 max-w-3xl text-sm leading-7 text-dc-ink-body">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** Tasarımdaki beyaz kart. */
export function PanelCard({
  children,
  className = "",
  padded = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  /** Sayfa içi çapa hedefi (ör. "#yeni-hesap" bağlantısı). */
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("rounded-[14px] border border-dc-line bg-white", padded ? "p-[22px]" : "", className)}
    >
      {children}
    </section>
  );
}

/** Kart içi başlık. */
export function PanelCardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[16px] font-bold text-dc-ink">{children}</h2>;
}

/** Bölüm etiketi — tasarımda marka renginde, harf aralıklı, büyük harf. */
export function PanelSectionLabel({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <p
      className={`mt-6 text-[13px] font-bold uppercase tracking-[0.06em] ${
        muted ? "text-dc-ink-ghost" : "text-dc-brand-strong"
      }`}
    >
      {children}
    </p>
  );
}

/* ── Filtre çipleri (Yaklaşan / Tamamlanan gibi) ──────────────────────── */

export function PanelFilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-dc-brand-strong text-white"
          : "border border-dc-line-soft bg-white text-dc-ink-muted hover:border-dc-brand"
      }`}
    >
      {children}
    </Link>
  );
}

export function PanelMetric({
  label,
  value,
  icon: Icon,
  tone = "info",
  description,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: PanelTone;
  description?: string;
  valueClassName?: string;
}) {
  const toneClasses: Record<PanelTone, string> = {
    neutral: "bg-dc-surface-soft text-dc-ink-muted",
    info: "bg-[var(--pd-pastel-sky-soft)] text-[var(--pd-pastel-sky-ink)]",
    success: "bg-[var(--pd-pastel-mint-soft)] text-[var(--pd-pastel-mint-ink)]",
    warning: "bg-[var(--pd-pastel-yellow-soft)] text-[var(--pd-pastel-yellow-ink)]",
    danger: "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]",
  };
  return (
    <PanelCard className="p-4 sm:p-[18px]">
    {Icon ? (
      <span className={cn("grid h-9 w-9 place-items-center rounded-[10px]", toneClasses[tone])}>
        <Icon size={18} aria-hidden="true" />
      </span>
    ) : null}
    <p className={cn(Icon ? "mt-3" : "", "text-2xl font-black text-dc-ink", valueClassName)}>{value}</p>
    <p className="mt-1 text-xs text-dc-ink-muted">{label}</p>
    {description ? <p className="mt-1.5 text-xs text-dc-ink-faint">{description}</p> : null}
    </PanelCard>
  );
}

export function PanelStatusBadge({
  label,
  tone = "neutral",
  pulse = false,
}: {
  label: string;
  tone?: PanelTone;
  pulse?: boolean;
}) {
  const toneClasses: Record<PanelTone, string> = {
    neutral: "bg-slate-100 text-slate-700",
    info: "bg-[var(--pd-pastel-sky-soft)] text-[var(--pd-pastel-sky-ink)]",
    warning: "bg-[var(--pd-pastel-yellow-soft)] text-[var(--pd-pastel-yellow-ink)]",
    success: "bg-[var(--pd-pastel-mint-soft)] text-[var(--pd-pastel-mint-ink)]",
    danger: "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]",
  };
  return (
    <span className={cn("inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold", toneClasses[tone])}>
    {pulse ? <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden="true" /> : null}
    {label}
    </span>
  );
}

export function PanelAttentionCard({
  title,
  body,
  tone = "warning",
  action,
  className,
}: {
  title: string;
  body: string;
  tone?: Exclude<PanelTone, "neutral" | "success">;
  action?: ReactNode;
  className?: string;
}) {
  const toneClasses: Record<Exclude<PanelTone, "neutral" | "success">, string> = {
    info: "border-[var(--pd-pastel-sky-ink)]/20 bg-[var(--pd-pastel-sky-soft)]",
    warning: "border-[var(--pd-pastel-yellow-ink)]/20 bg-[var(--pd-pastel-yellow-soft)]",
    danger: "border-[var(--pd-pastel-blush-ink)]/25 bg-[var(--pd-pastel-blush-soft)]",
  };
  return (
    <PanelCard className={cn("border-dc-line-soft p-4 sm:p-5", toneClasses[tone], className)}>
    <h3 className="text-[15px] font-bold text-dc-ink">{title}</h3>
    <p className="mt-1.5 text-sm leading-6 text-dc-ink-body">{body}</p>
    {action ? <div className="mt-3">{action}</div> : null}
    </PanelCard>
  );
}

export function PanelActionRow({
  primaryAction,
  secondaryAction,
  className,
}: {
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  if (!primaryAction && !secondaryAction) return null;
  return (
    <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:items-center", className)}>
    {secondaryAction ? <div>{secondaryAction}</div> : null}
    {primaryAction ? <div>{primaryAction}</div> : null}
    </div>
  );
}

export function PanelProgress({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
    className={cn("h-2 overflow-hidden rounded-full bg-dc-line-soft", className)}
    role="progressbar"
    aria-valuenow={normalized}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={label}
    >
    <div className="h-full rounded-full bg-dc-brand" style={{ width: `${normalized}%` }} />
    </div>
  );
}

/* ── Tablo ────────────────────────────────────────────────────────────── */

/**
 * Izgara tablo. Tasarım `div` ızgarası kullanıyor; burada gerçek `<table>`
 * kullanılır (§38 — tablo semantiği). Dar ekranda yatay kaydırılır.
 */
export function PanelTable({
  columns,
  children,
  caption,
}: {
  columns: readonly string[];
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-[14px] border border-dc-line bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-dc-line bg-dc-panel-head">
            {columns.map((c) => (
              <th
                key={c}
                scope="col"
                className="px-4 py-3 text-[12.5px] font-bold text-dc-ink-muted first:pl-[18px]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function PanelTableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-dc-line-soft text-[13.5px] font-medium text-[var(--pd-ink-3)] last:border-0">
      {children}
    </tr>
  );
}

export function PanelTableCell({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "default" | "ok" | "warn";
}) {
  const color =
    tone === "ok" ? "text-dc-brand-hover" : tone === "warn" ? "text-[var(--pd-pastel-yellow-ink)]" : "";
  return <td className={`px-4 py-3.5 first:pl-[18px] ${color}`}>{children}</td>;
}

/* ── Onay kutulu görev satırı ─────────────────────────────────────────── */

export function PanelTaskRow({
  title,
  meta,
  right,
  done = false,
  rightTone = "default",
  last = false,
}: {
  title: string;
  meta?: string;
  right?: string;
  done?: boolean;
  rightTone?: "default" | "warn";
  last?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3.5 px-[18px] py-4 ${
        last ? "" : "border-b border-dc-line-soft"
      } ${done ? "text-dc-ink-ghost" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px] ${
          done
            ? "bg-dc-brand-strong text-[10px] font-bold text-white"
            : "border border-dc-line-soft"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[14.5px] font-semibold ${
            done ? "line-through" : "text-dc-ink"
          }`}
        >
          {title}
        </span>
        {meta ? <span className="block text-[12.5px] text-dc-ink-faint">{meta}</span> : null}
      </span>
      {right ? (
        <span
          className={`shrink-0 text-[13px] ${
            rightTone === "warn" ? "text-[var(--pd-pastel-yellow-ink)]" : "text-dc-ink-muted"
          }`}
        >
          {right}
        </span>
      ) : null}
    </li>
  );
}

/* ── Sayı kartı ve ilerleme çubuğu ────────────────────────────────────── */

export function PanelStatCard({
  title,
  value,
  note,
  progressPct,
}: {
  title: string;
  value: string;
  note?: string;
  progressPct?: number;
}) {
  return (
    <PanelCard>
      <PanelCardTitle>{title}</PanelCardTitle>
      <p className="mt-2 text-[26px] font-extrabold text-dc-ink">{value}</p>
      {progressPct !== undefined ? (
        <div
          className="mt-2.5 h-2 overflow-hidden rounded-full bg-dc-line-soft"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={title}
        >
          <div className="h-full rounded-full bg-dc-brand" style={{ width: `${progressPct}%` }} />
        </div>
      ) : null}
      {note ? <p className="mt-2 text-[13.5px] text-dc-ink-muted">{note}</p> : null}
    </PanelCard>
  );
}

/** Veri yokken gösterilecek dürüst durum. */
export function PanelEmpty({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <PanelCard className={cn("mt-5", className)}>
      <p className="text-[15px] font-bold text-dc-ink">{title}</p>
      <p className="mt-1.5 text-[14px] leading-[1.6] text-dc-ink-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </PanelCard>
  );
}
