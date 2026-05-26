import Link from "next/link";

export type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Üst satırda küçük breadcrumb yolu */
  breadcrumbs?: Crumb[];
  /** Başlığın altına meta bilgi satırı (count, status badge, last sync vb.) */
  meta?: React.ReactNode;
  /** Toolbar üstüne / başlık altına ikincil filtre/aksiyon satırı */
  secondary?: React.ReactNode;
};

export function PageHeader({ title, subtitle, right, breadcrumbs, meta, secondary }: Props) {
  return (
    <div className="od-page-head">
      <div style={{ minWidth: 0, flex: 1 }}>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="od-crumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((c, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <span key={`${c.label}-${i}`} className="od-crumb">
                  {c.href && !last ? (
                    <Link href={c.href}>{c.label}</Link>
                  ) : (
                    <span aria-current={last ? "page" : undefined}>{c.label}</span>
                  )}
                  {!last ? <span className="od-crumb-sep" aria-hidden> / </span> : null}
                </span>
              );
            })}
          </nav>
        ) : null}
        <h1 className="od-page-title">{title}</h1>
        {subtitle ? <p className="od-page-sub">{subtitle}</p> : null}
        {meta ? <div className="od-page-meta">{meta}</div> : null}
        {secondary ? <div className="od-page-secondary">{secondary}</div> : null}
      </div>
      {right ? <div className="od-page-actions">{right}</div> : null}
    </div>
  );
}
