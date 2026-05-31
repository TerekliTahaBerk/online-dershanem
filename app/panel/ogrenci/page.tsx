import Link from "next/link";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { requireStudent } from "@/lib/panel-student";
import {
  getStudentNextLesson,
  getStudentTodayChecklist,
  getStudentHomeworkFocus,
  getStudentAttendanceSnapshot,
  getStudentRecentResults,
  getStudentSuggestedFocus,
  getStudentStudySummary,
} from "@/lib/panel/student-dashboard";
import { StudentNextLessonCard } from "@/components/panel/student/dashboard/student-next-lesson";
import { StudentTodayChecklist } from "@/components/panel/student/dashboard/student-today-checklist";
import { StudentHomeworkFocusCard } from "@/components/panel/student/dashboard/student-homework-focus";
import { StudentAttendanceSnapshotCard } from "@/components/panel/student/dashboard/student-attendance-snapshot";
import { StudentRecentResultsCard } from "@/components/panel/student/dashboard/student-recent-results";
import { StudentSuggestedFocusCard } from "@/components/panel/student/dashboard/student-suggested-focus";
import { StudentStudySummaryCard } from "@/components/panel/student/study-room/study-summary-card";
import { StudentSuggestedMaterialsCard } from "@/components/panel/materials/student-suggested-materials";
import { getStudentMaterialRecommendations } from "@/lib/panel/materials";
import { StudentGoalWidget } from "@/components/panel/academic-roadmap/student-goal-widget";
import { getStudentRoadmapCompactSummary } from "@/lib/panel/academic-roadmap";
import { StudentOdkCtaStrip } from "@/components/panel/odk/student/student-odk-cta-strip";
import { getStudentOdkSummary } from "@/lib/panel/odk-student";
import { getMaterialsForLesson } from "@/lib/panel/material-attachments";
import { canStudentAccessMaterial } from "@/lib/panel/materials";

export const dynamic = "force-dynamic";

const TODAY_FMT = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long", day: "2-digit", month: "long", year: "numeric",
});

/**
 * Student Dashboard — Phase 2 / Session 4.
 *
 * Operational, student-centered cockpit. Every helper is scoped to the
 * authenticated student via requireStudent(); there is no cross-student
 * URL surface to forge. The previous shallow KPI grid + recharts dashboard
 * was replaced; existing detailed sub-pages (/odevler, /ders-programi,
 * /odk, /performansim, /profilim, /sinifim, ...) are preserved and linked
 * to from the cockpit.
 */
export default async function StudentDashboard() {
  const { student } = await requireStudent();

  if (!student) {
    return (
      <>
        <PageHeader title="Öğrenci Paneli" />
        <Card>
          <CardBody>
            <EmptyState
              icon="user"
              title="Öğrenci profili bulunamadı"
              description="Hesabın henüz bir öğrenci kaydına bağlanmamış. Yöneticinden eşleştirme yapmasını isteyebilirsin."
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

  const firstName = student.fullName.split(" ")[0];

  const [nextLesson, checklist, homework, attendance, results, focus, study, materials, roadmap] =
    await Promise.all([
      getStudentNextLesson(student.id),
      getStudentTodayChecklist(student.id, student.userId),
      getStudentHomeworkFocus(student.id),
      getStudentAttendanceSnapshot(student.id),
      getStudentRecentResults(student.id, student.userId),
      getStudentSuggestedFocus(student.id),
      getStudentStudySummary(student.id),
      getStudentMaterialRecommendations(student.id),
      getStudentRoadmapCompactSummary(student.id, student.userId),
    ]);

  const odkSummary = student.userId
    ? await getStudentOdkSummary(student.userId, "STUDENT")
    : null;

  // ── Phase 2 / Session 9 — Pull next-lesson attached materials ──────
  let nextLessonMaterials: import("@/lib/panel/materials").MaterialRow[] = [];
  if (nextLesson) {
    const all = await getMaterialsForLesson(nextLesson.id);
    const checks = await Promise.all(all.map((m) => canStudentAccessMaterial(student.id, m.id)));
    nextLessonMaterials = all.filter((_, i) => checks[i]);
  }

  return (
    <>
      <PageHeader
        title={`Merhaba ${firstName}`}
        subtitle={`${TODAY_FMT.format(new Date())}${student.classLevel ? ` · ${student.classLevel}` : ""}${student.examType ? ` · ${student.examType}` : ""}`}
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link href="/panel/ogrenci/calisma-odasi" className="od-btn od-btn-primary od-btn-sm">
              {study.active ? "Çalışma odasına dön" : "Çalışma başlat"}
            </Link>
            <Link href="/panel/ogrenci/hedefim" className="od-btn od-btn-ghost od-btn-sm">Hedefim</Link>
            <Link href="/panel/ogrenci/odevler" className="od-btn od-btn-ghost od-btn-sm">Ödevlerim</Link>
            <Link href="/panel/ogrenci/ders-programi" className="od-btn od-btn-ghost od-btn-sm">Ders programı</Link>
            <Link href="/panel/ogrenci/odk/denemeler" className="od-btn od-btn-ghost od-btn-sm">Denemelerim</Link>
          </div>
        }
        meta={
          student.targetGoal ? (
            <span className="od-muted" style={{ fontSize: 12 }}>
              🎯 Hedefin: {student.targetGoal}
              {student.targetSchool ? ` · ${student.targetSchool}` : ""}
            </span>
          ) : null
        }
      />

      <div style={{ marginBottom: 12 }}>
        <StudentNextLessonCard lesson={nextLesson} attachedMaterials={nextLessonMaterials} />
      </div>

      {odkSummary ? (
        <div style={{ marginBottom: 12 }}>
          <StudentOdkCtaStrip summary={odkSummary} />
        </div>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <StudentGoalWidget summary={roadmap} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <StudentTodayChecklist items={checklist} firstName={firstName} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
        <StudentAttendanceSnapshotCard snapshot={attendance} />
        <StudentHomeworkFocusCard focus={homework} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
        <StudentRecentResultsCard items={results.items} averageNet={results.averageNet} />
        <StudentSuggestedFocusCard items={focus} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <StudentStudySummaryCard summary={study} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <StudentSuggestedMaterialsCard recommendations={materials} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/panel/ogrenci/profilim" className="od-btn od-btn-ghost od-btn-sm">
          Profilim →
        </Link>
      </div>
    </>
  );
}
