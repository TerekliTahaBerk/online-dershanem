import Link from "next/link";
import type { OdkExamCadenceFamily, OdkExamStatus } from "@prisma/client";

/**
 * ExamBoardCard — Stage 3B "Apple-light" pastel card used on ODK exam list
 * pages (admin + student). Pure server component. The caller decides on
 * tone, status label and CTA so this stays UI-only without depending on the
 * student/admin row shapes.
 *
 * Visual classes are defined in the PANEL REDESIGN v2 / STAGE 3B block of
 * globals.css.
 */

export type ExamBoardTone =
  | "lavender"
  | "mint"
  | "sky"
  | "yellow"
  | "blush"
  | "neutral";

type Props = {
  /** Optional link to wrap the whole card (e.g. detail page). Leave null to render as static. */
  href?: string | null;
  /** Optional eyebrow line shown above the title (e.g. cadence family). */
  eyebrow?: React.ReactNode;
  /** Card title. */
  title: string;
  /** Slug / secondary identifier. */
  slug?: string | null;
  /** Status label rendered as a soft-pill in the header. */
  statusLabel: string;
  /** Tone driving the pastel background + status pill. */
  tone: ExamBoardTone;
  /** Compact metadata rows (icon string + text). */
  meta?: Array<{ icon?: string; label: string }>;
  /** Optional readiness/secondary pill. */
  readiness?: { label: string; tone: ExamBoardTone } | null;
  /** Right-aligned action node (CTA button, link). */
  action?: React.ReactNode;
  /** Footer note shown below meta (e.g. last attempt info, attempt count). */
  footnote?: string | null;
};

export function ExamBoardCard({
  href,
  eyebrow,
  title,
  slug,
  statusLabel,
  tone,
  meta,
  readiness,
  action,
  footnote,
}: Props) {
  const card = (
    <article className={`od-exam-card tone-${tone}`}>
      <header className="od-exam-card-head">
        {eyebrow ? <div className="od-exam-card-eyebrow">{eyebrow}</div> : null}
        <h3 className="od-exam-card-title" title={title}>{title}</h3>
        {slug ? <div className="od-exam-card-slug">{slug}</div> : null}
        <div className="od-exam-card-pills">
          <span className={`soft-pill is-${tone}`}>{statusLabel}</span>
          {readiness ? (
            <span className={`soft-pill is-${readiness.tone}`}>{readiness.label}</span>
          ) : null}
        </div>
      </header>
      {meta && meta.length > 0 ? (
        <dl className="od-exam-card-meta">
          {meta.map((m, i) => (
            <div key={i} className="od-exam-card-meta-row">
              {m.icon ? <span className="od-exam-card-meta-ico" aria-hidden="true">{m.icon}</span> : null}
              <span>{m.label}</span>
            </div>
          ))}
        </dl>
      ) : null}
      {footnote ? <div className="od-exam-card-footnote">{footnote}</div> : null}
      {action ? <div className="od-exam-card-action">{action}</div> : null}
    </article>
  );
  if (href) {
    return (
      <Link href={href} className="od-exam-card-link">
        {card}
      </Link>
    );
  }
  return card;
}

// ─── Helpers exposed for callers ───────────────────────────────────────────

export function adminStatusTone(status: OdkExamStatus): ExamBoardTone {
  switch (status) {
    case "PUBLISHED": return "mint";
    case "DRAFT":     return "yellow";
    case "ARCHIVED":  return "blush";
    default:          return "neutral";
  }
}

export function adminStatusLabel(status: OdkExamStatus): string {
  switch (status) {
    case "PUBLISHED": return "Yayında";
    case "DRAFT":     return "Taslak";
    case "ARCHIVED":  return "Arşiv";
    default:          return String(status);
  }
}

export function cadenceTone(family: OdkExamCadenceFamily | string): ExamBoardTone {
  switch (family) {
    case "TYT":  return "lavender";
    case "AYT":  return "sky";
    case "LGS":  return "mint";
    case "KPSS": return "yellow";
    case "ALES": return "blush";
    default:     return "neutral";
  }
}

export function readinessTone(level: "ok" | "warn" | "error" | string): ExamBoardTone {
  switch (level) {
    case "ok":    return "mint";
    case "warn":  return "yellow";
    case "error": return "blush";
    default:      return "neutral";
  }
}
