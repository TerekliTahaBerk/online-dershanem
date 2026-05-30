import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { requireTeacher } from "@/lib/panel-teacher";
import {
  getTeacherClassDetail,
  getTeacherClassRiskRows,
  getTeacherClassUpcomingLessons,
  getTeacherClassAttendanceSummary,
  getTeacherClassHomeworkSummary,
} from "@/lib/teacher-dashboard";
import { ClassRiskHeatmap } from "@/components/panel/teacher/class/class-risk-heatmap";
import { ClassAttendanceSummaryCard } from "@/components/panel/teacher/class/class-attendance-summary";
import { ClassHomeworkSummaryCard } from "@/components/panel/teacher/class/class-homework-summary";
import { ClassUpcomingLessons } from "@/components/panel/teacher/class/class-upcoming-lessons";
import { ClassRecentActivity } from "@/components/panel/teacher/class/class-recent-activity";

export const dynamic = "force-dynamic";

/**
 * Teacher Classroom Cockpit — Phase 2 / Session 2.
 *
 * Drill-in detail for a single classroom the signed-in teacher is assigned to.
 * Permission model: hard-gated by `getTeacherClassDetail` which calls
 * `getTeacherClassroomLink`. A teacher who is NOT linked to this classroom
 * (via ClassroomTeacher) gets `notFound()` even if they guess the URL.
 * Every downstream helper independently re-verifies the link.
 */
export default async function TeacherClassroomDetail({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const { teacher } = await requireTeacher();

  if (!teacher) {
    return (
      <>
        <PageHeader title="Sınıf detayı" />
        <Card>
          <EmptyState
            icon="user"
            title="Öğretmen profili bulunamadı"
            description="Hesabın bir öğretmen kaydına bağlanmamış. Yöneticinden bağlama yapmasını isteyebilirsin."
          />
        </Card>
      </>
    );
  }

  const detail = await getTeacherClassDetail(teacher.id, classroomId);
  if (!detail) notFound();

  const [riskRows, upcoming, attendance, homework] = await Promise.all([
    getTeacherClassRiskRows(teacher.id, classroomId),
    getTeacherClassUpcomingLessons(teacher.id, classroomId),
    getTeacherClassAttendanceSummary(teacher.id, classroomId),
    getTeacherClassHomeworkSummary(teacher.id, classroomId),
  ]);

  const todayDate = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Öğretmen Paneli", href: "/panel/ogretmen" },
          { label: "Sınıflarım", href: "/panel/ogretmen/siniflarim" },
          { label: detail.name },
        ]}
        title={detail.name}
        subtitle={
          [
            detail.branch,
            detail.level,
            detail.subject,
            `${detail.studentCount} öğrenci`,
          ].filter(Boolean).join(" · ")
        }
        meta={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {detail.isLead ? <Badge tone="purple">Lead öğretmen</Badge> : <Badge tone="neutral">Branş öğretmeni</Badge>}
            {detail.todayLessonCount > 0 ? <Badge tone="accent">Bugün {detail.todayLessonCount} ders</Badge> : null}
            {detail.upcomingLessonCount > 0 ? <Badge tone="teal">7 gün {detail.upcomingLessonCount} ders</Badge> : null}
            {detail.coTeachers.length > 0 ? (
              <Badge tone="neutral">
                + {detail.coTeachers.map((t) => t.fullName.split(" ")[0]).join(", ")}
              </Badge>
            ) : null}
          </div>
        }
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link href={`/panel/ogretmen/yoklama/yeni?classroomId=${classroomId}&date=${todayDate}`} className="od-btn od-btn-primary od-btn-sm">
              + Yoklama al
            </Link>
            <Link href={`/panel/ogretmen/odevler/yeni?classroomId=${classroomId}`} className="od-btn od-btn-primary od-btn-sm">
              + Ödev oluştur
            </Link>
            <Link href={`/panel/ogretmen/ders-programi`} className="od-btn od-btn-ghost od-btn-sm">
              Ders programı
            </Link>
          </div>
        }
      />

      {/* Row 1 — risk heatmap (full width) */}
      <div style={{ marginBottom: 12 }}>
        <ClassRiskHeatmap rows={riskRows} />
      </div>

      {/* Row 2 — attendance + homework */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <ClassAttendanceSummaryCard classroomId={classroomId} summary={attendance} />
        <ClassHomeworkSummaryCard classroomId={classroomId} summary={homework} />
      </div>

      {/* Row 3 — upcoming lessons */}
      <div style={{ marginBottom: 12 }}>
        <ClassUpcomingLessons classroomId={classroomId} lessons={upcoming} />
      </div>

      {/* Row 4 — recent activity (deferred — empty state) */}
      <ClassRecentActivity />
    </>
  );
}
