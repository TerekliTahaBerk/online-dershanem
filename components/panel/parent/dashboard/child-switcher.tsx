import Link from "next/link";
import { Badge } from "@/components/panel/ui/badge";
import type { ParentLinkedStudent } from "@/lib/panel/parent-dashboard";

type Props = {
  roster: ParentLinkedStudent[];
  selectedId: string;
};

/**
 * Multi-child switcher. If parent has only one child, renders a compact
 * "selected child" summary (no buttons). With multiple children, renders
 * one button per child; selected gets accent styling. Each button is a
 * `<Link>` with `?studentId=…` so navigation is fully URL-driven and
 * shareable / browser-back friendly.
 */
export function ChildSwitcher({ roster, selectedId }: Props) {
  if (roster.length === 0) return null;

  if (roster.length === 1) {
    const c = roster[0];
    return (
      <div style={{
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        padding: "10px 14px", borderRadius: 10, background: "var(--pd-soft)",
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{c.fullName}</div>
        <span className="od-muted" style={{ fontSize: 12 }}>
          {[c.classLevel, c.examType, c.classroomNames[0]].filter(Boolean).join(" · ") || "—"}
        </span>
        <Badge tone={c.relationshipType === "MOTHER" || c.relationshipType === "FATHER" ? "purple" : "neutral"}>
          {c.relationshipLabel}
        </Badge>
        {c.isPrimary ? <Badge tone="accent">Birincil</Badge> : null}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16,
    }}>
      {roster.map((c) => {
        const active = c.studentId === selectedId;
        return (
          <Link
            key={c.studentId}
            href={`/panel/veli?studentId=${c.studentId}`}
            scroll={false}
            style={{
              display: "flex", flexDirection: "column", gap: 4,
              minWidth: 160, maxWidth: 240,
              padding: "10px 14px", borderRadius: 10,
              background: active ? "var(--pd-accent-soft, #eef4ff)" : "var(--pd-soft)",
              border: active ? "2px solid var(--pd-accent)" : "1px solid var(--pd-line)",
              color: "inherit", textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.fullName}
              </span>
              {c.isPrimary ? <Badge tone="accent">★</Badge> : null}
            </div>
            <div className="od-muted" style={{ fontSize: 11, display: "flex", gap: 4, flexWrap: "wrap" }}>
              <span>{c.classLevel ?? "—"}</span>
              {c.classroomNames[0] ? <span>· {c.classroomNames[0]}</span> : null}
            </div>
            <div style={{ fontSize: 11 }}>
              <Badge tone="neutral">{c.relationshipLabel}</Badge>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
