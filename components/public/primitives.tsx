import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type SectionTone = "white" | "warm" | "soft" | "ink";
type SectionSpace = "compact" | "default" | "hero";

export function PublicSection({
  children,
  className,
  id,
  tone = "white",
  space = "default",
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: SectionTone;
  space?: SectionSpace;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("public-section", `public-section-${tone}`, `public-section-${space}`, className)}
    >
      <div className="public-container">{children}</div>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  body,
  action,
  align = "left",
  size = "section",
  titleId,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  size?: "display" | "section" | "subsection";
  titleId?: string;
  className?: string;
}) {
  return (
    <header className={cn("public-intro", `public-intro-${align}`, className)}>
      {eyebrow ? <p className="public-eyebrow">{eyebrow}</p> : null}
      <h2 id={titleId} className={cn("public-heading", `public-heading-${size}`)}>{title}</h2>
      {body ? <div className="public-lede">{body}</div> : null}
      {action ? <div className="public-intro-action">{action}</div> : null}
    </header>
  );
}

const buttonClasses = {
  primary: "public-button-primary",
  secondary: "public-button-secondary",
  quiet: "public-button-quiet",
} as const;

export function PublicButton({
  href,
  children,
  variant = "primary",
  size = "md",
  mobileFull = false,
  className,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonClasses;
  size?: "sm" | "md" | "lg";
  mobileFull?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn("public-button", buttonClasses[variant], `public-button-${size}`, mobileFull && "public-button-mobile-full", className)}
    >
      {children}
    </Link>
  );
}

export function PublicBadge({ children, tone = "olive", className }: { children: ReactNode; tone?: "olive" | "neutral" | "yellow" | "sky"; className?: string }) {
  return <span className={cn("public-badge", `public-badge-${tone}`, className)}>{children}</span>;
}

export function PublicCard({ children, className, interactive = false, as = "article" }: { children: ReactNode; className?: string; interactive?: boolean; as?: "article" | "div" }) {
  const Component = as;
  return <Component className={cn("public-card", interactive && "public-card-interactive", className)}>{children}</Component>;
}

export type ComparisonRow = { label: string; values: ReactNode[] };

export function ComparisonRows({
  caption,
  columns,
  rows,
  highlightColumn,
}: {
  caption: string;
  columns: string[];
  rows: ComparisonRow[];
  highlightColumn?: number;
}) {
  return (
    <div className="public-comparison">
      <div className="public-comparison-desktop" role="region" tabIndex={0} aria-label={`${caption}; yatay kaydırılabilir`}>
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead><tr><th scope="col">Ölçüt</th>{columns.map((column, index) => <th key={column} scope="col" className={index === highlightColumn ? "is-highlighted" : undefined}>{column}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, index) => <td key={index} className={index === highlightColumn ? "is-highlighted" : undefined}>{value}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="public-comparison-mobile" aria-label={caption}>
        {rows.map((row) => (
          <section key={row.label} className="public-comparison-card" aria-label={`${caption}: ${row.label}`}>
            <h3>{row.label}</h3>
            <dl>{columns.map((column, index) => <div key={column} className={index === highlightColumn ? "is-highlighted" : undefined}><dt>{column}</dt><dd>{row.values[index]}</dd></div>)}</dl>
          </section>
        ))}
      </div>
    </div>
  );
}

export function PricingValueBlock({ before, value, suffix, note, className }: { before?: ReactNode; value: ReactNode; suffix?: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <div className={cn("public-value-block", className)}>
      {before ? <div className="public-value-before">{before}</div> : null}
      <div className="public-value-line"><strong>{value}</strong>{suffix ? <span>{suffix}</span> : null}</div>
      {note ? <div className="public-value-note">{note}</div> : null}
    </div>
  );
}

export function FeatureStory({ eyebrow, title, body, visual, action, reverse = false }: { eyebrow?: ReactNode; title: ReactNode; body: ReactNode; visual: ReactNode; action?: ReactNode; reverse?: boolean }) {
  return (
    <div className={cn("public-feature-story", reverse && "public-feature-story-reverse")}>
      <div className="public-feature-copy">
        {eyebrow ? <p className="public-eyebrow">{eyebrow}</p> : null}
        <h3 className="public-heading public-heading-subsection">{title}</h3>
        <div className="public-lede">{body}</div>
        {action ? <div className="public-intro-action">{action}</div> : null}
      </div>
      <div className="public-feature-visual">{visual}</div>
    </div>
  );
}

export function TrustBand({ title, items }: { title: string; items: Array<{ value: string; label: string }> }) {
  return (
    <aside className="public-trust" aria-label={title}>
      <p>{title}</p>
      <dl>{items.map((item) => <div key={item.label}><dt>{item.value}</dt><dd>{item.label}</dd></div>)}</dl>
    </aside>
  );
}

export function FinalCta({ eyebrow, title, body, href, label, secondary }: { eyebrow?: string; title: ReactNode; body?: ReactNode; href: string; label: string; secondary?: { href: string; label: string } }) {
  return (
    <PublicSection tone="white" space="default">
      <div className="public-final-cta">
        <SectionIntro eyebrow={eyebrow} title={title} body={body} align="center" size="display" />
        <div className="public-final-actions">
          <PublicButton href={href} size="lg" mobileFull>{label}<ArrowRight size={17} aria-hidden="true" /></PublicButton>
          {secondary ? <PublicButton href={secondary.href} variant="quiet" size="lg" mobileFull>{secondary.label}</PublicButton> : null}
        </div>
      </div>
    </PublicSection>
  );
}
