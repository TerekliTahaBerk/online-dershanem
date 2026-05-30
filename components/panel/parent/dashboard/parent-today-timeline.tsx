import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { ParentTimelineEvent, TimelineTone } from "@/lib/panel/parent-dashboard";

const TONE_COLOR: Record<TimelineTone, string> = {
  positive: "var(--pd-good, #047857)",
  neutral:  "var(--pd-muted, #6b7280)",
  warning:  "var(--pd-warn, #b45309)",
  danger:   "var(--pd-bad, #dc2626)",
};

const TONE_GLYPH: Record<TimelineTone, string> = {
  positive: "✓",
  neutral:  "·",
  warning:  "⚠",
  danger:   "✗",
};

type Props = { events: ParentTimelineEvent[]; childFirstName: string };

/**
 * "Çocuğum bugün ne yaptı?" — bugün için birleşik aktivite akışı.
 * Sadece gerçek DB kayıtları kullanılır (ders, yoklama, ödev, ODK).
 * Hiç event yoksa dürüst boş durum.
 */
export function ParentTodayTimeline({ events, childFirstName }: Props) {
  return (
    <Card>
      <CardHeader
        title={`${childFirstName} bugün`}
        subtitle={events.length > 0 ? `${events.length} aktivite` : undefined}
      />
      <CardBody>
        {events.length === 0 ? (
          <EmptyState
            icon="cal"
            title="Bugün için kayıtlı aktivite yok."
            description="Ders, ödev veya yoklama kaydedildikçe burada görünecek."
          />
        ) : (
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {events.map((e) => {
              const color = TONE_COLOR[e.tone];
              const glyph = TONE_GLYPH[e.tone];
              const inner = (
                <div style={{
                  display: "grid", gridTemplateColumns: "44px 22px 1fr",
                  gap: 8, padding: "8px 10px", borderRadius: 8,
                  background: "var(--pd-soft)", alignItems: "baseline",
                }}>
                  <span className="od-mono od-muted" style={{ fontSize: 11 }}>
                    {e.timeLabel ?? "—"}
                  </span>
                  <span style={{ color, fontWeight: 700, textAlign: "center" }}>{glyph}</span>
                  <span style={{ fontSize: 13, color }}>{e.message}</span>
                </div>
              );
              return (
                <li key={e.id}>
                  {e.href ? (
                    <Link href={e.href} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
                      {inner}
                    </Link>
                  ) : inner}
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
