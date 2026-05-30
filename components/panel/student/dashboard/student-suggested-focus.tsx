import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { StudentSuggestedFocusItem } from "@/lib/panel/student-dashboard";

type Props = { items: StudentSuggestedFocusItem[] };

export function StudentSuggestedFocusCard({ items }: Props) {
  return (
    <Card>
      <CardHeader
        title="Çalışma odakların"
        subtitle={
          items.length === 0
            ? undefined
            : "Operasyonel öneri — gerçek verilerden"
        }
      />
      <CardBody>
        {items.length === 0 ? (
          <EmptyState
            icon="target"
            title="Henüz odak önerisi yok"
            description="Öğretmenin zayıf/güçlü konularını işaretledikçe veya deneme verilerin biriktikçe burada görünür."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((it) => {
              const inner = (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--pd-soft)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.subject}
                    </div>
                    <div className="od-muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {it.reason}
                    </div>
                  </div>
                  <Badge tone={it.tone === "ok" ? "ok" : it.tone === "warn" ? "warn" : it.tone === "bad" ? "bad" : "neutral"}>
                    {it.tone === "ok" ? "Güçlü" : it.tone === "bad" ? "Öncelik" : it.tone === "warn" ? "Dikkat" : "—"}
                  </Badge>
                </div>
              );
              return it.href ? (
                <Link
                  key={it.id}
                  href={it.href}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {inner}
                </Link>
              ) : (
                <div key={it.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
