import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { StudentRecentResult } from "@/lib/panel/student-dashboard";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

type Props = {
  items: StudentRecentResult[];
  averageNet: number | null;
};

export function StudentRecentResultsCard({ items, averageNet }: Props) {
  return (
    <Card>
      <CardHeader
        title="Son sonuçların"
        subtitle={
          averageNet != null
            ? `Ortalama net: ${averageNet}`
            : items.length === 0
            ? undefined
            : "Net hesaplanamadı"
        }
        right={
          <Link href="/panel/ogrenci/performansim" className="od-btn od-btn-ghost od-btn-sm">
            Performansım →
          </Link>
        }
      />
      <CardBody>
        {items.length === 0 ? (
          <EmptyState
            icon="target"
            title="Henüz deneme sonucu yok"
            description="İlk deneme sonucun girildiğinde burada görünecek."
            action={
              <Link href="/panel/ogrenci/odk/denemeler" className="od-btn od-btn-primary od-btn-sm">
                ODK denemelerine git →
              </Link>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {items.map((r) => {
              const inner = (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 1fr auto auto",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--pd-soft)",
                    alignItems: "center",
                  }}
                >
                  <span className="od-mono od-muted" style={{ fontSize: 12 }}>
                    {DATE_FMT.format(r.takenAt)}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.title}
                  </span>
                  <span className="od-muted" style={{ fontSize: 11 }}>
                    D {r.correctCount} · Y {r.wrongCount} · B {r.blankCount}
                  </span>
                  <Badge tone={r.net != null && r.net >= 0 ? "ok" : "neutral"}>
                    {r.net != null ? `Net ${r.net}` : "—"}
                  </Badge>
                </div>
              );
              return r.href ? (
                <Link
                  key={r.id}
                  href={r.href}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {inner}
                </Link>
              ) : (
                <div key={r.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
