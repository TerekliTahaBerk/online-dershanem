import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { TeacherUpcomingLesson } from "@/lib/teacher-dashboard";

const TIME_FMT = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

const DAY_LABEL = (d: Date): string => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const delta = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (delta === 0) return "Bugün";
  if (delta === 1) return "Yarın";
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "2-digit", month: "short" }).format(d);
};

type Props = { lessons: TeacherUpcomingLesson[] };

export function UpcomingWeek({ lessons }: Props) {
  // Group by ISO date.
  const byDay = new Map<string, TeacherUpcomingLesson[]>();
  for (const l of lessons) {
    const key = l.scheduledAt.toISOString().slice(0, 10);
    let arr = byDay.get(key);
    if (!arr) { arr = []; byDay.set(key, arr); }
    arr.push(l);
  }
  const dayKeys = Array.from(byDay.keys()).sort();

  return (
    <Card>
      <CardHeader title="Önümüzdeki 7 gün" subtitle={`${lessons.length} ders`} />
      <CardBody>
        {lessons.length === 0 ? (
          <EmptyState
            icon="cal"
            title="Önümüzdeki haftada ders yok."
            description="Yeni dersler eklendiğinde burada görünecek."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dayKeys.map((k) => {
              const items = byDay.get(k)!;
              return (
                <div key={k}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                    {DAY_LABEL(items[0].scheduledAt)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {items.map((l) => (
                      <div key={l.id} style={{
                        display: "grid",
                        gridTemplateColumns: "60px 1fr auto",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "var(--pd-soft)",
                        alignItems: "center",
                      }}>
                        <span className="od-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                          {TIME_FMT.format(l.scheduledAt)}
                        </span>
                        <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.title ?? l.subject ?? "Ders"}
                          {l.classroomName ? (
                            <span className="od-muted"> · {l.classroomName}</span>
                          ) : (
                            <span className="od-muted"> · {l.studentName}</span>
                          )}
                        </span>
                        <Badge tone={l.status === "LIVE" ? "accent" : "neutral"}>
                          {l.status === "LIVE" ? "Canlı" : "Planlı"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
