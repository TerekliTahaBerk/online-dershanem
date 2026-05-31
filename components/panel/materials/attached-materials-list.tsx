/**
 * Phase 2 / Session 9 — `AttachedMaterialsList`
 *
 * Read-only list of materials currently attached to a homework or
 * lesson. Used in BOTH teacher and student views. When the caller
 * passes `onDetachAction`, a per-row detach button is rendered after
 * the open link (teacher view only).
 *
 * Server component — but the detach button is a tiny inline form so
 * we can keep this as a server component without `"use client"`.
 */
import Link from "next/link";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getMaterialOpenUrl,
  getMaterialTypeGlyph,
  getMaterialTypeLabel,
  getMaterialTypeTone,
  type MaterialRow,
} from "@/lib/panel/materials";

type DetachKind = "assignment" | "lesson";

type Props = {
  materials: MaterialRow[];
  /** When provided, renders a "Kaldır" button per row that calls this server action. */
  detach?: {
    kind: DetachKind;
    parentId: string;
    action: (parentId: string, materialId: string) => Promise<void>;
  };
  /** Override empty state text — useful for the student "no materials yet" wording. */
  emptyText?: string;
};

export function AttachedMaterialsList({ materials, detach, emptyText }: Props) {
  if (!materials.length) {
    return (
      <EmptyState
        icon="folder"
        title={emptyText ?? "Henüz materyal eklenmemiş."}
      />
    );
  }

  return (
    <ul className="od-list" style={{ display: "grid", gap: 8 }}>
      {materials.map((m) => {
        const openUrl = getMaterialOpenUrl(m);
        return (
          <li
            key={m.id}
            className="od-row"
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            <span aria-hidden style={{ fontSize: 18 }}>
              {getMaterialTypeGlyph(m.type)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {m.title}
              </div>
              <div
                className="od-muted"
                style={{ fontSize: 12, display: "flex", gap: 6, flexWrap: "wrap" }}
              >
                <Badge tone={getMaterialTypeTone(m.type)}>{getMaterialTypeLabel(m.type)}</Badge>
                {m.subject ? <span>· {m.subject}</span> : null}
                {m.courseTitle ? <span>· {m.courseTitle}</span> : null}
              </div>
            </div>
            {openUrl ? (
              <Link
                href={openUrl}
                target={openUrl.startsWith("http") ? "_blank" : undefined}
                rel={openUrl.startsWith("http") ? "noreferrer noopener" : undefined}
                className="od-btn od-btn-ghost od-btn-sm"
              >
                Aç →
              </Link>
            ) : null}
            {detach ? (
              <form
                action={detach.action.bind(null, detach.parentId, m.id)}
                style={{ display: "inline" }}
              >
                <button type="submit" className="od-btn od-btn-ghost od-btn-sm" title="Kaldır">
                  Kaldır
                </button>
              </form>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
