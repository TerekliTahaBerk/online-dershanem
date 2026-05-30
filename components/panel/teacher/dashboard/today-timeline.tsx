import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { TeacherTodayLesson } from "@/lib/teacher-dashboard";

const TIME_FMT = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

const STATUS_META: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "neutral" | "accent" | "purple" }> = {
  SCHEDULED: { label: "Planlandı",  tone: "neutral" },
  LIVE:      { label: "Canlı",      tone: "accent"  },
  ENDED:     { label: "Bitti",      tone: "purple"  },
  COMPLETED: { label: "Tamamlandı", tone: "ok"      },
  CANCELLED: { label: "İptal",      tone: "bad"     },
  MISSED:    { label: "Kaçırıldı",  tone: "bad"     },
};

type Props = { lessons: TeacherTodayLesson[] };

export function TodayTimeline({ lessons }: Props) {
  return (
    <Card>
      <CardHeader title="Bugün" subtitle={`${lessons.length} ders`} />
      <CardBody>
        {lessons.length === 0 ? (
          <EmptyState
            icon="cal"
            title="Bugün planlanmış dersiniz yok."
            description="Programını görmek için ders programına bakabilirsin."
            action={<Link href="/panel/ogretmen/ders-programi" className="od-btn od-btn-ghost od-btn-sm">Ders programı →</Link>}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lessons.map((l) => {
              const meta = STATUS_META[l.status] ?? STATUS_META.SCHEDULED;
              const joinUrl = l.meetingJoinUrl ?? l.googleMeetLink;
              const headline = l.title ?? l.courseName ?? l.subject ?? "Ders";
              return (
                <div key={l.id} className="od-row" style={{
                  display: "grid",
                  gridTemplateColumns: "72px 1fr auto",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--pd-soft)",
                  alignItems: "center",
                }}>
                  <div className="od-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                    {TIME_FMT.format(l.scheduledAt)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {headline}
                    </div>
                    <div className="od-muted" style={{ fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {l.classroomName ? <span>🏫 {l.classroomName}</span> : <span>👤 {l.studentName}</span>}
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {l.attendanceTaken
                        ? <Badge tone="ok">Yoklama alındı</Badge>
                        : <Badge tone="warn">Yoklama bekliyor</Badge>}
                      {joinUrl ? <span style={{ color: "var(--pd-acc)" }}>● canlı bağlantı</span> : null}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {!l.attendanceTaken && l.classroomId ? (
                      <Link
                        href={`/panel/ogretmen/yoklama/yeni?classroomId=${l.classroomId}&date=${l.scheduledAt.toISOString().slice(0, 10)}`}
                        className="od-btn od-btn-primary od-btn-sm"
                      >
                        Yoklama al
                      </Link>
                    ) : null}
                    {joinUrl ? (
                      <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="od-btn od-btn-ghost od-btn-sm">
                        Derse katıl
                      </a>
                    ) : null}
                    <Link href={`/panel/ogretmen/ders-programi#${l.id}`} className="od-btn od-btn-ghost od-btn-sm">
                      Detay
                    </Link>
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
