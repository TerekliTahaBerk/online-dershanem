import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { StatusPresentation, StatusTone } from "@/lib/panel/status-vocabulary";

/**
 * PANEL TEMEL BİLEŞENLERİ — docs/panel-design-roadmap.md §5, §8, §18.2.
 *
 * Kartsız, içerik öncelikli yapı taşları. Hepsi sunucu bileşenidir; renkler
 * `.pn-scope` token'larından gelir (kabuk dışında kullanılırsa sarmalayıcıya
 * `pn-scope` sınıfı verin). Ürün rengi yalnız vurgu olarak kullanılır;
 * durum tonları semantiktir ve üründen bağımsızdır.
 */

/* ── Section: kart yerine başlıklı bölüm ─────────────────────────────── */

export function Section({
  title,
  description,
  actions,
  children,
  id,
  className,
  headingLevel = 2,
  divider = true,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  headingLevel?: 2 | 3;
  /** Üstte ince ayraç çizgisi (sayfa içindeki ilk bölümde kapatılabilir). */
  divider?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingId = id ? `${id}-baslik` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn("mt-8", divider ? "border-t border-pn-border pt-6" : "", className)}
    >
      {title || actions ? (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <Heading id={headingId} className="text-[15px] font-semibold leading-[22px] tracking-[-0.005em] text-pn-text">
                {title}
              </Heading>
            ) : null}
            {description ? <p className="mt-0.5 text-[13px] leading-5 text-pn-text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ── EmptyState: satır içi, dekorsuz boş durum ───────────────────────── */

export function EmptyState({
  title,
  body,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  body?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-[10px] border border-dashed border-pn-border px-4 py-4", className)}>
      {Icon ? <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-pn-text-muted" /> : null}
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-pn-text">{title}</p>
        {body ? <p className="mt-0.5 text-[13px] leading-5 text-pn-text-muted">{body}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

/* ── StatusBadge: tek durum dili ─────────────────────────────────────── */

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-(--pn-tone-neutral-soft) text-(--pn-tone-neutral)",
  info: "bg-(--pn-tone-info-soft) text-(--pn-tone-info)",
  success: "bg-(--pn-tone-success-soft) text-(--pn-tone-success)",
  warning: "bg-(--pn-tone-warning-soft) text-(--pn-tone-warning)",
  critical: "bg-(--pn-tone-critical-soft) text-(--pn-tone-critical)",
};

export function StatusBadge({
  label,
  tone = "neutral",
  live = false,
  presentation,
}: {
  label?: string;
  tone?: StatusTone;
  /** Canlı durum (ör. sınav canlı): nabız atan nokta + ekran okuyucu metni. */
  live?: boolean;
  /** `status-vocabulary` çıktısı; verilirse label/tone yerine kullanılır. */
  presentation?: StatusPresentation;
}) {
  const text = presentation?.label ?? label ?? "";
  const resolvedTone = presentation?.tone ?? tone;
  return (
    <span
      className={cn(
        "inline-flex min-h-[22px] items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12px] font-semibold",
        TONE_CLASS[resolvedTone],
      )}
    >
      {live ? (
        <>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" />
          <span className="sr-only">canlı: </span>
        </>
      ) : null}
      {text}
    </span>
  );
}

/* ── PropertyList: belge başlığı altındaki özellik satırları ─────────── */

export function PropertyList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid gap-y-1.5", className)}>{children}</dl>;
}

export function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[12.5px] font-medium leading-6 text-pn-text-muted">{label}</dt>
      <dd className="min-w-0 text-[14px] leading-6 text-pn-text">{children}</dd>
    </div>
  );
}

/* ── ListRow: kart yerine satır ──────────────────────────────────────── */

export function ListRow({
  title,
  description,
  meta,
  status,
  action,
  href,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  action?: ReactNode;
  /** Verilirse başlık bağlantı olur (satırın tamamı değil: içteki eylemler ayrı kalır). */
  href?: string;
}) {
  return (
    <li className="flex min-h-(--pn-row-h) flex-wrap items-center gap-x-3 gap-y-1 border-b border-pn-border py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <Link href={href} className="text-[14px] font-medium text-pn-text hover:underline">
              {title}
            </Link>
          ) : (
            <span className="text-[14px] font-medium text-pn-text">{title}</span>
          )}
          {status}
        </div>
        {description ? <p className="mt-0.5 text-[13px] leading-5 text-pn-text-secondary">{description}</p> : null}
        {meta ? <p className="mt-0.5 text-[12px] text-pn-text-muted">{meta}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}

export function List({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="border-t border-pn-border">
      {children}
    </ul>
  );
}

/* ── ViewTabs: görünüm sekmeleri (searchParams bağlantıları) ─────────── */

export type ViewTab = { id: string; label: string; href: string; count?: number };

export function ViewTabs({ tabs, activeId, label }: { tabs: ViewTab[]; activeId: string; label: string }) {
  return (
    <nav aria-label={label} className="-mb-px flex gap-1 overflow-x-auto border-b border-pn-border">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13.5px] transition-colors",
              active
                ? "border-pn-accent font-semibold text-pn-text"
                : "border-transparent font-medium text-pn-text-muted hover:text-pn-text",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="rounded bg-pn-selected px-1.5 text-[11.5px] font-semibold text-pn-text-secondary">{tab.count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Button: birincil eylem nötr koyu, ürün renginden bağımsız ───────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-dc-ink text-white hover:bg-black disabled:bg-dc-ink/50",
  secondary: "border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover",
  ghost: "text-pn-text-secondary hover:bg-pn-hover hover:text-pn-text",
  danger: "border border-(--pn-tone-critical)/30 bg-white text-(--pn-tone-critical) hover:bg-(--pn-tone-critical-soft)",
};
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "min-h-8 px-2.5 text-[13px]",
  md: "min-h-10 px-3.5 text-[13.5px]",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed",
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    className,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
