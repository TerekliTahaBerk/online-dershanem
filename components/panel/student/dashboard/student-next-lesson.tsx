import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { StudentNextLesson } from "@/lib/panel/student-dashboard";
import type { MaterialRow } from "@/lib/panel/materials";
import { getMaterialOpenUrl, getMaterialTypeGlyph } from "@/lib/panel/materials";

const TIME_FMT = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "2-digit", month: "long" });

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral" | "accent" | "purple"> = {
  SCHEDULED: "neutral", LIVE: "accent", ENDED: "purple",
  COMPLETED: "ok", CANCELLED: "bad", MISSED: "bad",
};
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Planlı", LIVE: "Canlı", ENDED: "Bitti",
  COMPLETED: "Tamamlandı", CANCELLED: "İptal", MISSED: "Kaçırıldı",
};

type Props = {
  lesson: StudentNextLesson | null;
  /**
   * Phase 2 / Session 9 — Up to ~3 materials the teacher attached to
   * this lesson, surfaced inline so the student doesn't have to dig.
   * Pass `[]` (or omit) to render the card unchanged.
   */
  attachedMaterials?: MaterialRow[];
};

function formatRelative(target: Date, now = new Date()): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "şimdi";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} dk sonra`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa sonra`;
  const d = Math.floor(h / 24);
  return `${d} gün sonra`;
}

export function StudentNextLessonCard({ lesson, attachedMaterials = [] }: Props) {
  if (!lesson) {
    return (
      <Card>
        <CardHeader title="Sıradaki dersin" />
        <CardBody>
          <EmptyState
            icon="cal"
            title="Yaklaşan ders yok"
            description="Programına yeni dersler eklendiğinde burada göreceksin."
            action={
              <Link href="/panel/ogrenci/ders-programi" className="od-btn od-btn-ghost od-btn-sm">
                Ders programını aç →
              </Link>
            }
          />
        </CardBody>
      </Card>
    );
  }

  const join = lesson.meetingJoinUrl ?? lesson.googleMeetLink;
  const showJoin = lesson.isLiveNow || lesson.isStartingSoon;

  return (
    <Card>
      <CardHeader
        title="Sıradaki dersin"
        subtitle={
          lesson.isLiveNow
            ? "Şu an canlı"
            : lesson.isStartingSoon
            ? `Yakında başlıyor · ${formatRelative(lesson.scheduledAt)}`
            : `${DATE_FMT.format(lesson.scheduledAt)} · ${formatRelative(lesson.scheduledAt)}`
        }
        right={
          <Badge tone={STATUS_TONE[lesson.status] ?? "neutral"}>
            {STATUS_LABEL[lesson.status] ?? lesson.status}
          </Badge>
        }
      />
      <CardBody>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 14,
            alignItems: "center",
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--pd-soft)",
          }}
        >
          <div
            style={{
              minWidth: 64,
              textAlign: "center",
              padding: "6px 10px",
              borderRadius: 8,
              background: "var(--pd-accent-soft, rgba(59,130,246,0.08))",
              color: "var(--pd-accent, #2563eb)",
              fontWeight: 700,
            }}
          >
            <div className="od-mono" style={{ fontSize: 18 }}>{TIME_FMT.format(lesson.scheduledAt)}</div>
            <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{lesson.duration} dk</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lesson.title ?? lesson.subject ?? "Ders"}
            </div>
            <div className="od-muted" style={{ fontSize: 12, marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {lesson.subject ? <span>{lesson.subject}</span> : null}
              {lesson.classroomName ? <span>· {lesson.classroomName}</span> : null}
              {lesson.teacherName ? <span>· {lesson.teacherName}</span> : null}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {showJoin && join ? (
              <a href={join} target="_blank" rel="noopener noreferrer" className="od-btn od-btn-primary od-btn-sm">
                Derse katıl
              </a>
            ) : (
              <Link href="/panel/ogrenci/ders-programi" className="od-btn od-btn-ghost od-btn-sm">
                Detay →
              </Link>
            )}
          </div>
        </div>
        {attachedMaterials.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <div className="od-muted" style={{ fontSize: 11, marginBottom: 4 }}>
              📎 Bu ders için materyaller
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {attachedMaterials.slice(0, 4).map((m) => {
                const url = getMaterialOpenUrl(m);
                const label = `${getMaterialTypeGlyph(m.type)} ${m.title}`;
                return url ? (
                  <a
                    key={m.id}
                    href={url}
                    target={url.startsWith("http") ? "_blank" : undefined}
                    rel={url.startsWith("http") ? "noreferrer noopener" : undefined}
                    className="od-chip"
                    title={m.title}
                    style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {label}
                  </a>
                ) : (
                  <span key={m.id} className="od-chip" title={m.title}>{label}</span>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
