import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { ClassUpcomingLesson } from "@/lib/teacher-dashboard";

const TIME_FMT = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

const DAY_LABEL = (d: Date): string => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const delta = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (delta === 0) return "Bugün";
  if (delta === 1) return "Yarın";
  if (delta === -1) return "Dün";
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "2-digit", month: "short" }).format(d);
};

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral" | "accent" | "purple"> = {
  SCHEDULED: "neutral", LIVE: "accent", ENDED: "purple",
  COMPLETED: "ok", CANCELLED: "bad", MISSED: "bad",
};
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Planlı", LIVE: "Canlı", ENDED: "Bitti",
  COMPLETED: "Tamamlandı", CANCELLED: "İptal", MISSED: "Kaçırıldı",
};

type Props = { classroomId: string; lessons: ClassUpcomingLesson[] };

export function ClassUpcomingLessons({ classroomId, lessons }: Props) {
  const byDay = new Map<string, ClassUpcomingLesson[]>();
  for (const l of lessons) {
    const k = l.scheduledAt.toISOString().slice(0, 10);
    let arr = byDay.get(k);
    if (!arr) { arr = []; byDay.set(k, arr); }
    arr.push(l);
  }
  const dayKeys = Array.from(byDay.keys()).sort();

  return (
    <Card>
      <CardHeader
        title="Yaklaşan dersler"
        subtitle={`${lessons.length} ders · 14 gün`}
        right={
          <Link href="/panel/ogretmen/ders-programi" className="od-btn od-btn-ghost od-btn-sm">
            Ders programı →
          </Link>
        }
      />
      <CardBody>
        {lessons.length === 0 ? (
          <EmptyState icon="cal" title="Bu sınıfa yaklaşan ders yok." description="Ders programına ekleme yapıldığında burada görünecek." />
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
                    {items.map((l) => {
                      const join = l.meetingJoinUrl ?? l.googleMeetLink;
                      const date = l.scheduledAt.toISOString().slice(0, 10);
                      return (
                        <div key={l.id} style={{
                          display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 10,
                          padding: "8px 10px", borderRadius: 8, background: "var(--pd-soft)",
                          alignItems: "center",
                        }}>
                          <span className="od-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                            {TIME_FMT.format(l.scheduledAt)}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {l.title ?? l.subject ?? "Ders"}
                            </div>
                            <div className="od-muted" style={{ fontSize: 11, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
                              <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>{STATUS_LABEL[l.status] ?? l.status}</Badge>
                              {l.attendanceTaken
                                ? <Badge tone="ok">Yoklama alındı</Badge>
                                : (l.isPast ? <Badge tone="warn">Yoklama bekliyor</Badge> : null)}
                              {join ? <span style={{ color: "var(--pd-acc)" }}>● bağlantı</span> : null}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {!l.attendanceTaken ? (
                              <Link
                                href={`/panel/ogretmen/yoklama/yeni?classroomId=${classroomId}&date=${date}`}
                                className="od-btn od-btn-primary od-btn-sm"
                              >
                                Yoklama al
                              </Link>
                            ) : null}
                            {join && !l.isPast ? (
                              <a href={join} target="_blank" rel="noopener noreferrer" className="od-btn od-btn-ghost od-btn-sm">
                                Derse katıl
                              </a>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
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
