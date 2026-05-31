import Link from "next/link";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";
import { requireStudent } from "@/lib/panel-student";
import {
  getStudentStudySummary,
  getStudentCourseOptions,
  formatStudyDuration,
} from "@/lib/panel/student-dashboard";
import { StudyRoomTimer } from "@/components/panel/student/study-room/study-room-timer";
import { StudyRoomRelatedMaterials } from "@/components/panel/materials/study-room-related-materials";
import { StudyRoomGoalNudge } from "@/components/panel/academic-roadmap/study-room-goal-nudge";
import { getStudentRoadmapCompactSummary } from "@/lib/panel/academic-roadmap";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
});

/**
 * Study Room — Phase 2 / Session 4.
 *
 * Çalışma odası: tek-tıkla çalışma süresini başlat/durdur, ders/konu seç,
 * günlük geçmişi gör. Tüm yazma işlemleri `requireStudent()` ile gate'li
 * ve `studentId` sahipliği server-action seviyesinde doğrulanıyor —
 * başka bir öğrencinin oturumuna yazılamaz.
 */
export default async function StudyRoomPage() {
  const { student } = await requireStudent();

  if (!student) {
    return (
      <>
        <PageHeader
          title="Çalışma odası"
          breadcrumbs={[{ label: "Öğrenci", href: "/panel/ogrenci" }, { label: "Çalışma odası" }]}
        />
        <Card>
          <CardBody>
            <EmptyState
              icon="user"
              title="Öğrenci profili bulunamadı"
              description="Çalışma odasını kullanmak için hesabının bir öğrenci kaydına bağlı olması gerekiyor."
              action={
                <Link href="/iletisim" className="od-btn od-btn-primary od-btn-sm">
                  İletişime geç
                </Link>
              }
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const [summary, courseOptions] = await Promise.all([
    getStudentStudySummary(student.id),
    getStudentCourseOptions(student.id),
  ]);

  const roadmap = await getStudentRoadmapCompactSummary(
    student.id,
    student.userId,
  );

  const activeForClient = summary.active
    ? {
        id: summary.active.id,
        startedAt: summary.active.startedAt.toISOString(),
        courseTitle: summary.active.courseTitle,
        subject: summary.active.subject,
        note: summary.active.note,
      }
    : null;

  const max = Math.max(1, ...summary.last7Days.map((b) => b.totalSeconds));

  return (
    <>
      <PageHeader
        title="Çalışma odası"
        subtitle="Bireysel çalışmanı kayda al, hangi derse ne kadar zaman ayırdığını gör."
        breadcrumbs={[
          { label: "Öğrenci", href: "/panel/ogrenci" },
          { label: "Çalışma odası" },
        ]}
        right={
          <Link href="/panel/ogrenci" className="od-btn od-btn-ghost od-btn-sm">
            ← Panele dön
          </Link>
        }
        meta={
          summary.active ? (
            <Badge tone="accent">Aktif oturum</Badge>
          ) : null
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 380px) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <StudyRoomTimer active={activeForClient} courseOptions={courseOptions} />
          <StudyRoomGoalNudge recommendation={roadmap.topRecommendation} />
          {summary.active?.courseId ? (
            <StudyRoomRelatedMaterials
              studentId={student.id}
              courseId={summary.active.courseId}
              courseTitle={summary.active.courseTitle}
            />
          ) : null}
        </div>

        <Card>
          <CardHeader
            title="Son 7 gün"
            subtitle={
              summary.totalSecondsLast7 > 0
                ? `Toplam: ${formatStudyDuration(summary.totalSecondsLast7)}`
                : "Henüz kayıt yok"
            }
          />
          <CardBody>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
                padding: "8px 4px",
                marginBottom: 10,
                height: 90,
              }}
            >
              {summary.last7Days.map((b) => {
                const ratio = b.totalSeconds / max;
                const h = Math.max(4, Math.round(ratio * 70));
                const [, m, d] = b.day.split("-").map(Number);
                return (
                  <div
                    key={b.day}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                    title={`${b.day} · ${formatStudyDuration(b.totalSeconds)}`}
                  >
                    <div style={{ width: "100%", height: 70, display: "flex", alignItems: "flex-end" }}>
                      <div
                        style={{
                          width: "100%",
                          height: h,
                          borderRadius: 4,
                          background: b.totalSeconds > 0
                            ? "var(--pd-accent, #2563eb)"
                            : "var(--pd-muted-soft, rgba(148,163,184,0.25))",
                          opacity: b.totalSeconds > 0 ? 0.85 : 0.4,
                        }}
                      />
                    </div>
                    <span className="od-muted od-mono" style={{ fontSize: 10 }}>
                      {String(d).padStart(2, "0")}/{String(m).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--pd-soft)" }}>
                <div className="od-muted" style={{ fontSize: 11 }}>Bugün</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                  {formatStudyDuration(summary.todaySeconds)}
                </div>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--pd-soft)" }}>
                <div className="od-muted" style={{ fontSize: 11 }}>Son 7 gün</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                  {formatStudyDuration(summary.totalSecondsLast7)}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Son oturumların" subtitle="Bittiği zamana göre sıralı (yeniden eskiye)" />
        <CardBody>
          {summary.recent.length === 0 ? (
            <EmptyState
              icon="clock"
              title="Henüz tamamlanmış oturum yok"
              description="İlk çalışma oturumun bittiğinde burada görünecek."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {summary.recent.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr auto",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--pd-soft)",
                    alignItems: "center",
                  }}
                >
                  <span className="od-mono od-muted" style={{ fontSize: 12 }}>
                    {DATE_FMT.format(r.startedAt)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.courseTitle ?? r.subject ?? "Serbest çalışma"}
                    </div>
                    {r.note ? (
                      <div
                        className="od-muted"
                        style={{
                          fontSize: 11,
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.note}
                      </div>
                    ) : null}
                  </div>
                  <Badge tone="neutral">
                    {formatStudyDuration(r.durationSeconds ?? 0)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
