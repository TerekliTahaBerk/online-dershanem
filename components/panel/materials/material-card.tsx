import Link from "next/link";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { MaterialTypeBadge } from "./material-type-badge";
import {
  getMaterialOpenUrl,
  getMaterialVisibilityLabel,
  type MaterialRow,
} from "@/lib/panel/materials";

type Props = {
  material: MaterialRow;
  /** Teacher panelinde "Düzenle" linki gösterilsin mi */
  editHref?: string;
  /** İkincil meta'yı (sınıf/ders) gizle (örn. zaten sınıf detayında) */
  hideContext?: boolean;
};

export function MaterialCard({ material: m, editHref, hideContext }: Props) {
  const openUrl = getMaterialOpenUrl(m);
  const date = m.publishedAt ?? m.createdAt;
  const dateText = new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Card padded className="od-mat-card">
      <div className="od-row od-row-between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="od-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <MaterialTypeBadge type={m.type} />
            {!m.isPublished ? <Badge tone="warn">Taslak</Badge> : null}
            {m.isArchived ? <Badge tone="neutral">Arşivli</Badge> : null}
            {m.visibility !== "CLASSROOM" ? (
              <Badge tone="neutral">{getMaterialVisibilityLabel(m.visibility)}</Badge>
            ) : null}
          </div>
          <div className="od-mat-card-title" style={{ marginTop: 8, fontWeight: 600, lineHeight: 1.3 }}>
            {m.title}
          </div>
          {m.description ? (
            <div className="od-muted" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45 }}>
              {m.description}
            </div>
          ) : null}
          {!hideContext ? (
            <div className="od-muted" style={{ marginTop: 8, fontSize: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {m.classroomName ? <span>🏷 {m.classroomName}</span> : null}
              {m.courseTitle ? <span>📘 {m.courseTitle}</span> : null}
              {m.subject && !m.courseTitle ? <span>{m.subject}</span> : null}
              {m.teacherName ? <span>👤 {m.teacherName}</span> : null}
              <span>· {dateText}</span>
            </div>
          ) : (
            <div className="od-muted" style={{ marginTop: 8, fontSize: 12 }}>{dateText}</div>
          )}
        </div>
        <div className="od-row" style={{ gap: 6, flexShrink: 0 }}>
          {openUrl ? (
            <a
              className="od-btn od-btn-sm od-btn-primary"
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Aç
            </a>
          ) : null}
          {editHref ? (
            <Link className="od-btn od-btn-sm od-btn-ghost" href={editHref}>
              Düzenle
            </Link>
          ) : null}
        </div>
      </div>
      {m.type === "NOTE" && m.description ? null /* note already shown above */ : null}
    </Card>
  );
}
