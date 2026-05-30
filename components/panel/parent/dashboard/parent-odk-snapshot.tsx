import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { ParentOdkSnapshot } from "@/lib/panel/parent-dashboard";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

type Props = { snapshot: ParentOdkSnapshot; childUserId: string | null };

export function ParentOdkSnapshotCard({ snapshot, childUserId }: Props) {
  const odkHref = childUserId ? `/panel/veli/odk/cocuklarim/${childUserId}` : "/panel/veli/odk";
  return (
    <Card>
      <CardHeader
        title="ODK Denemeler"
        subtitle={
          snapshot.totalSubmitted > 0
            ? `${snapshot.totalSubmitted} deneme${snapshot.averageNet != null ? ` · ortalama net ${snapshot.averageNet}` : ""}`
            : undefined
        }
        right={
          <Link href={odkHref} className="od-btn od-btn-ghost od-btn-sm">
            ODK →
          </Link>
        }
      />
      <CardBody>
        {!snapshot.hasUserLink ? (
          <EmptyState
            icon="report"
            title="ODK için öğrenci hesabı bağlı değil."
            description="Çocuğunuzun ODK denemelerini görebilmek için öğrenci hesabı eşleştirmesi gerekiyor."
          />
        ) : snapshot.recent.length === 0 ? (
          <EmptyState
            icon="report"
            title="Bu öğrenci için henüz deneme verisi yok."
            description="Tamamlanan denemeler burada listelenecek."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {snapshot.recent.map((a) => {
              const tone = a.net == null ? "neutral" : a.net >= 20 ? "ok" : a.net >= 0 ? "warn" : "bad";
              return (
                <div key={a.id} style={{
                  display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 8,
                  padding: "8px 10px", borderRadius: 6, background: "var(--pd-soft)",
                  alignItems: "center",
                }}>
                  <span className="od-mono od-muted" style={{ fontSize: 12 }}>
                    {a.submittedAt ? DATE_FMT.format(a.submittedAt) : "—"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.examTitle}
                    </div>
                    <div className="od-muted" style={{ fontSize: 11, marginTop: 2 }}>
                      D:{a.correctCount} · Y:{a.wrongCount} · B:{a.blankCount}
                    </div>
                  </div>
                  <Badge tone={tone}>net {a.net ?? "—"}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
