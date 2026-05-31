import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { OdkWeakSignal } from "@/lib/panel/odk-student";

const TONE_LABEL: Record<OdkWeakSignal["tone"], string> = {
  bad: "Öncelik",
  warn: "Dikkat",
  neutral: "Sıradaki",
  ok: "İyi gidiyor",
};

export function OdkResultRecommendations({
  signals,
}: {
  signals: OdkWeakSignal[];
}) {
  return (
    <Card>
      <CardHeader
        title="Öneriler"
        subtitle="Bu denemede tespit edilen sinyaller"
      />
      <CardBody>
        {signals.length === 0 ? (
          <EmptyState
            icon="target"
            title="Öneri yok"
            description="Bu deneme için bir sinyal üretilemedi."
          />
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {signals.map((s) => (
              <li
                key={s.id}
                className="od-row od-row-between"
                style={{
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--pd-soft)",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="od-row"
                    style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
                  >
                    <Badge tone={s.tone}>{TONE_LABEL[s.tone]}</Badge>
                    <strong style={{ fontSize: 13 }}>{s.title}</strong>
                  </div>
                  <div
                    className="od-muted"
                    style={{ fontSize: 12, marginTop: 4 }}
                  >
                    {s.reason}
                  </div>
                </div>
                {s.href && s.cta ? (
                  <Link
                    href={s.href}
                    className="od-btn od-btn-ghost od-btn-sm"
                  >
                    {s.cta}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
