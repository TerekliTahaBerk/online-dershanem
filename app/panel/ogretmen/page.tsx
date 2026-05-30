import Link from "next/link";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { requireTeacher } from "@/lib/panel-teacher";
import {
  getTeacherTodayLessons,
  getTeacherPendingAttendance,
  getTeacherHomeworkReviewQueue,
  getTeacherClassesOverview,
  getTeacherRiskyStudents,
  getTeacherUpcomingLessons,
} from "@/lib/teacher-dashboard";
import { TodayTimeline } from "@/components/panel/teacher/dashboard/today-timeline";
import { PendingAttendance } from "@/components/panel/teacher/dashboard/pending-attendance";
import { HomeworkReviewQueue } from "@/components/panel/teacher/dashboard/homework-review-queue";
import { ClassesOverview } from "@/components/panel/teacher/dashboard/classes-overview";
import { RiskyStudents } from "@/components/panel/teacher/dashboard/risky-students";
import { UpcomingWeek } from "@/components/panel/teacher/dashboard/upcoming-week";

export const dynamic = "force-dynamic";

const TODAY_FMT = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long", day: "2-digit", month: "long", year: "numeric",
});

/**
 * Teacher Dashboard — Phase 2 / Session 1.
 *
 * Operational overview: today timeline, pending attendance, review queue,
 * classes, risky students, upcoming week. All data is teacher-scoped via
 * `requireTeacher()` — only the signed-in teacher's lessons/assignments/
 * classroom rosters are queried.
 */
export default async function TeacherDashboard() {
  const { teacher } = await requireTeacher();

  if (!teacher) {
    return (
      <>
        <PageHeader title="Öğretmen Paneli" />
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

  const [today, pending, reviewQueue, classes, risky, upcoming] = await Promise.all([
    getTeacherTodayLessons(teacher.id),
    getTeacherPendingAttendance(teacher.id),
    getTeacherHomeworkReviewQueue(teacher.id),
    getTeacherClassesOverview(teacher.id),
    getTeacherRiskyStudents(teacher.id),
    getTeacherUpcomingLessons(teacher.id),
  ]);

  return (
    <>
      <PageHeader
        title="Öğretmen Paneli"
        subtitle={`${teacher.fullName} · ${TODAY_FMT.format(new Date())}`}
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link href="/panel/ogretmen/yoklama/yeni" className="od-btn od-btn-primary od-btn-sm">+ Yoklama al</Link>
            <Link href="/panel/ogretmen/odevler/yeni" className="od-btn od-btn-primary od-btn-sm">+ Ödev oluştur</Link>
            <Link href="/panel/ogretmen/ders-programi" className="od-btn od-btn-ghost od-btn-sm">Ders programı</Link>
            <Link href="/panel/ogretmen/siniflarim" className="od-btn od-btn-ghost od-btn-sm">Sınıflarım</Link>
          </div>
        }
      />

      {/* Row 1 — today + pending attendance */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <TodayTimeline lessons={today} />
        <PendingAttendance rows={pending} />
      </div>

      {/* Row 2 — homework review + risky students */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <HomeworkReviewQueue rows={reviewQueue} />
        <RiskyStudents rows={risky} />
      </div>

      {/* Row 3 — classes overview (full width) */}
      <div style={{ marginBottom: 12 }}>
        <ClassesOverview rows={classes} />
      </div>

      {/* Row 4 — upcoming week */}
      <UpcomingWeek lessons={upcoming} />
    </>
  );
}
