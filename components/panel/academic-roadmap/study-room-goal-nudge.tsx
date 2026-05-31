import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import type { RoadmapRecommendation } from "@/lib/panel/academic-roadmap";

const TONE_LABEL: Record<RoadmapRecommendation["tone"], string> = {
  bad: "Öncelik",
  warn: "Dikkat",
  ok: "İyi gidiyor",
  neutral: "Sıradaki",
};

/**
 * Compact, single-recommendation surface used inside non-roadmap pages
 * (Study Room, optionally other places). Defers to the full roadmap page
 * for context and action history.
 */
export function StudyRoomGoalNudge({
  recommendation,
}: {
  recommendation: RoadmapRecommendation | null;
}) {
  return (
    <Card>
      <CardHeader
        title="Bugünkü hedef aksiyonu"
        right={
          <Link
            href="/panel/ogrenci/hedefim"
            className="od-btn od-btn-ghost od-btn-sm"
          >
            Yol haritası →
          </Link>
        }
      />
      <CardBody>
        {!recommendation ? (
          <div className="od-muted" style={{ fontSize: 13 }}>
            Şu an öne çıkan bir öneri yok. Çalışmana devam edebilirsin.
          </div>
        ) : (
          <div
            className="od-row od-row-between"
            style={{ gap: 12, alignItems: "flex-start" }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="od-row"
                style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
              >
                <Badge tone={recommendation.tone}>
                  {TONE_LABEL[recommendation.tone]}
                </Badge>
                <span style={{ fontWeight: 600 }}>
                  {recommendation.title}
                </span>
              </div>
              <div
                className="od-muted"
                style={{ fontSize: 13, marginTop: 4 }}
              >
                {recommendation.reason}
              </div>
            </div>
            {recommendation.href && recommendation.cta ? (
              <Link
                href={recommendation.href}
                className="od-btn od-btn-primary od-btn-sm"
                style={{ flexShrink: 0 }}
              >
                {recommendation.cta}
              </Link>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
