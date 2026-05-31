import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { RoadmapRecommendation } from "@/lib/panel/academic-roadmap";

const TONE_LABEL: Record<RoadmapRecommendation["tone"], string> = {
  bad: "Öncelik",
  warn: "Dikkat",
  ok: "İyi gidiyor",
  neutral: "Sıradaki",
};

export function RoadmapRecommendations({
  items,
}: {
  items: RoadmapRecommendation[];
}) {
  return (
    <Card>
      <CardHeader
        title="Yol haritası önerileri"
        subtitle="Verilerinden çıkarılan, yorumsuz aksiyonlar"
      />
      <CardBody>
        {items.length === 0 ? (
          <EmptyState
            icon="folder"
            title="Şu an öneri yok"
            description="Yeni veri geldikçe öneriler güncellenir."
          />
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((r) => (
              <div
                key={r.id}
                className="od-row od-row-between"
                style={{
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--pd-soft)",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="od-row"
                    style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
                  >
                    <Badge tone={r.tone}>{TONE_LABEL[r.tone]}</Badge>
                    <span style={{ fontWeight: 600 }}>{r.title}</span>
                  </div>
                  <div
                    className="od-muted"
                    style={{ fontSize: 13, marginTop: 4 }}
                  >
                    {r.reason}
                  </div>
                </div>
                {r.href && r.cta ? (
                  <Link
                    href={r.href}
                    className="od-btn od-btn-ghost od-btn-sm"
                    style={{ flexShrink: 0 }}
                  >
                    {r.cta}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
