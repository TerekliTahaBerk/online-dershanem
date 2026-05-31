/**
 * Student detail page — refactored into 8 tabs.
 *
 * Pattern: each tab's data fetch is guarded by a conditional `await
 * Promise.all([...])` that returns `undefined` on inactive tabs. We don't
 * pay the database cost for tabs the user isn't viewing.
 *
 * The presentation layer lives in `components/panel/students/student-360-tabs.tsx`.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Badge } from "@/components/panel/ui/badge";
import { getStudentProductFlags } from "@/lib/access/student-product-flags";
import { computeStudentRisk } from "@/lib/analytics/risk";
import { RiskBadge, InsightList } from "@/components/panel/analytics";
import { sortInsights } from "@/lib/analytics/insights";
import {
  Student360TabBar,
  StudentOverviewTab,
  StudentEducationTab,
  StudentAttendanceTab,
  StudentHomeworkTab,
  StudentOdkTab,
  StudentFinanceTab,
  StudentNotesTab,
  StudentLogsTab,
  parseStudentTab,
  type StudentTab,
} from "@/components/panel/students/student-360-tabs";
import { StudentAcademicSummaryCard } from "@/components/panel/academic-roadmap/student-academic-summary-card";

export const dynamic = "force-dynamic";

export default async function StudentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const { tab: tabRaw } = await searchParams;
  const tab: StudentTab = parseStudentTab(tabRaw);

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, phone: true, email: true,
      city: true, district: true, schoolName: true,
      classLevel: true, department: true, examType: true,
      targetGoal: true, targetSchool: true,
      status: true, createdAt: true, userId: true,
    },
  });
  if (!student) notFound();

  const flagsMap = await getStudentProductFlags([student.id]);
  const flags = flagsMap.get(student.id);
  const risk = tab === "overview" ? await computeStudentRisk(student.id) : null;

  // ── Per-tab data ───────────────────────────────────────────────────────
  const overviewData = tab === "overview"
    ? await Promise.all([
        prisma.classroomStudent.findMany({
          where: { studentId: student.id },
          include: { classroom: { select: { id: true, name: true, level: true } } },
        }),
        prisma.parentStudent.findMany({
          where: { studentId: student.id },
          include: { parent: { select: { id: true, fullName: true, phone: true } } },
        }),
        prisma.studentPackageEnrollment.findMany({
          where: { studentId: student.id },
          orderBy: { createdAt: "desc" },
          include: { package: { select: { id: true, name: true, price: true } } },
        }),
        prisma.studentExamResult.findMany({
          where: { studentId: student.id },
          orderBy: { takenAt: "desc" },
          take: 5,
        }),
      ])
    : undefined;

  const educationData = tab === "education"
    ? await Promise.all([
        prisma.classroomStudent.findMany({
          where: { studentId: student.id },
          include: { classroom: { select: { id: true, name: true, level: true, branch: true } } },
        }),
        prisma.lesson.findMany({
          where: { studentId: student.id, scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: "asc" },
          take: 30,
          include: {
            teacher: { select: { fullName: true } },
            course: { select: { title: true } },
          },
        }),
        prisma.lesson.findMany({
          where: { studentId: student.id, scheduledAt: { lt: new Date() } },
          orderBy: { scheduledAt: "desc" },
          take: 30,
          include: {
            teacher: { select: { fullName: true } },
            course: { select: { title: true } },
          },
        }),
      ])
    : undefined;

  const attendanceRows = tab === "attendance"
    ? await prisma.attendance.findMany({
        where: { studentId: student.id },
        orderBy: { sessionDate: "desc" },
        take: 50,
      })
    : [];
  const attendanceStats = (() => {
    if (tab !== "attendance" || attendanceRows.length === 0) return null;
    const total = attendanceRows.length;
    const present = attendanceRows.filter((a) => a.status === "PRESENT").length;
    const absent = attendanceRows.filter((a) => a.status === "ABSENT").length;
    const late = attendanceRows.filter((a) => a.status === "LATE").length;
    // LEFT_EARLY counts as a soft warning, not absence; participation rate
    // includes PRESENT + LATE + LEFT_EARLY + EXCUSED.
    const leftEarly = attendanceRows.filter((a) => a.status === "LEFT_EARLY").length;
    const excused = attendanceRows.filter((a) => a.status === "EXCUSED").length;
    const participated = present + late + leftEarly + excused;
    return { total, present, absent, late, pct: Math.round((participated / total) * 100) };
  })();

  const homeworkData = tab === "homework"
    ? await Promise.all([
        prisma.assignmentSubmission.findMany({
          where: { studentId: student.id },
          orderBy: { submittedAt: "desc" },
          take: 50,
          include: { assignment: { select: { id: true, title: true, dueAt: true } } },
        }),
        prisma.assignmentSubmission.groupBy({
          by: ["status"],
          where: { studentId: student.id },
          _count: { _all: true },
        }),
      ])
    : undefined;
  const submissionCounts = { PENDING: 0, SUBMITTED: 0, GRADED: 0, LATE: 0, MISSED: 0 };
  if (homeworkData) {
    for (const g of homeworkData[1]) {
      submissionCounts[g.status] = g._count._all;
    }
  }

  const odkData = tab === "odk" && student.userId
    ? await Promise.all([
        prisma.odkExamAttempt.findMany({
          where: { userId: student.userId },
          orderBy: { startedAt: "desc" },
          take: 10,
          include: { exam: { select: { id: true, title: true } } },
        }),
        prisma.odkUserAccessTag.findMany({
          where: { userId: student.userId, revokedAt: null },
          include: { accessTag: { select: { id: true, key: true, title: true } } },
        }),
      ])
    : undefined;

  const financeData = tab === "finance"
    ? await Promise.all([
        prisma.studentPackageEnrollment.findMany({
          where: { studentId: student.id },
          orderBy: { createdAt: "desc" },
          include: { package: { select: { id: true, name: true, price: true } } },
        }),
        prisma.accountingEntry.findMany({
          where: { studentId: student.id },
          orderBy: { occurredAt: "desc" },
          take: 50,
        }),
      ])
    : undefined;

  const notesData = tab === "notes"
    ? await Promise.all([
        prisma.studentNote.findMany({
          where: { studentId: student.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { author: { select: { name: true, email: true } } },
        }),
        prisma.teacherComment.findMany({
          where: { studentId: student.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { teacher: { select: { fullName: true } } },
        }),
        student.userId
          ? prisma.notification.findMany({
              where: { userId: student.userId },
              orderBy: { createdAt: "desc" },
              take: 30,
            })
          : Promise.resolve([] as Awaited<ReturnType<typeof prisma.notification.findMany>>),
      ])
    : undefined;

  const auditLogs = tab === "logs"
    ? await prisma.auditLog.findMany({
        where: { entityType: "Student", entityId: student.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actor: { select: { name: true, email: true } } },
      })
    : [];

  const baseHref = `/panel/admin/ogrenciler/${student.id}`;

  return (
    <>
      <PageHeader
        title={student.fullName}
        subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"} · ${student.phone ?? "—"}`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge tone={flags?.hasOD ? "teal" : "neutral"}>{flags?.hasOD ? "OD ✓" : "OD ✗"}</Badge>
            <Badge tone={flags?.hasODK ? "purple" : "neutral"}>{flags?.hasODK ? "ODK ✓" : "ODK ✗"}</Badge>
            {risk ? <RiskBadge level={risk.level} score={risk.score} /> : null}
            {flags?.hasODK && student.userId ? (
              <Link href={`/panel/admin/odk/ogrenciler/${student.userId}`} className="od-btn od-btn-ghost od-btn-sm">
                ODK detayı →
              </Link>
            ) : null}
            <Link href={`${baseHref}/duzenle`} className="od-btn od-btn-primary od-btn-sm">
              Düzenle
            </Link>
          </div>
        }
      />

      <Student360TabBar current={tab} baseHref={baseHref} />

      {tab === "overview" && risk && risk.signals.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <InsightList
            insights={sortInsights(
              risk.signals.map((s, i) => ({
                id: `risk-${i}`,
                severity: risk.level === "high" ? "danger" as const : risk.level === "medium" ? "warn" as const : "info" as const,
                icon: "⚠️",
                title: s.message,
                body: `Risk sinyali · ağırlık ${s.weight}`,
              })),
            )}
          />
        </div>
      ) : null}

      {tab === "overview" && overviewData ? (
        <StudentOverviewTab
          identity={{
            fullName: student.fullName,
            phone: student.phone,
            email: student.email,
            city: student.city,
            district: student.district,
            schoolName: student.schoolName,
            classLevel: student.classLevel,
            examType: student.examType,
            department: student.department,
            targetGoal: student.targetGoal,
            targetSchool: student.targetSchool,
            status: student.status,
            createdAt: student.createdAt,
          }}
          classrooms={overviewData[0].map((c) => ({
            classroomId: c.classroomId,
            classroom: c.classroom,
          }))}
          parents={overviewData[1].map((p) => ({
            parentId: p.parentId,
            relationship: p.relationship,
            isPrimary: p.isPrimary,
            parent: p.parent,
          }))}
          recentExams={overviewData[3].map((r) => ({
            id: r.id,
            title: r.title,
            net: r.net !== null && r.net !== undefined ? Number(r.net) : null,
            takenAt: r.takenAt,
          }))}
          enrollments={overviewData[2].map((e) => ({ id: e.id, package: e.package }))}
        />
      ) : null}

      {tab === "overview" ? (
        <div style={{ marginTop: 16 }}>
          <StudentAcademicSummaryCard
            studentId={student.id}
            studentUserId={student.userId}
          />
        </div>
      ) : null}

      {tab === "education" && educationData ? (
        <StudentEducationTab
          classrooms={educationData[0].map((c) => ({
            classroomId: c.classroomId,
            joinedAt: c.joinedAt,
            classroom: c.classroom,
          }))}
          upcomingLessons={educationData[1].map((l) => ({
            id: l.id,
            scheduledAt: l.scheduledAt,
            duration: l.duration,
            title: l.title,
            subject: l.subject,
            status: l.status,
            teacher: l.teacher,
            course: l.course,
          }))}
          recentLessons={educationData[2].map((l) => ({
            id: l.id,
            scheduledAt: l.scheduledAt,
            duration: l.duration,
            title: l.title,
            subject: l.subject,
            status: l.status,
            teacher: l.teacher,
            course: l.course,
          }))}
        />
      ) : null}

      {tab === "attendance" ? (
        <StudentAttendanceTab
          studentId={student.id}
          rows={attendanceRows.map((a) => ({
            id: a.id,
            sessionDate: a.sessionDate,
            status: a.status,
            minutesLate: a.minutesLate,
            context: a.context,
            notes: a.notes,
          }))}
          stats={attendanceStats}
        />
      ) : null}

      {tab === "homework" && homeworkData ? (
        <StudentHomeworkTab
          submissions={homeworkData[0].map((s) => ({
            id: s.id,
            status: s.status,
            submittedAt: s.submittedAt,
            score: s.score,
            assignment: s.assignment,
          }))}
          counts={submissionCounts}
        />
      ) : null}

      {tab === "odk" ? (
        <StudentOdkTab
          userId={student.userId}
          attempts={(odkData?.[0] ?? []).map((a) => ({
            id: a.id,
            status: a.status,
            score: a.score,
            correctCount: a.correctCount,
            wrongCount: a.wrongCount,
            blankCount: a.blankCount,
            submittedAt: a.submittedAt,
            startedAt: a.startedAt,
            autoSubmitted: a.autoSubmitted,
            exam: a.exam,
          }))}
          accessTags={(odkData?.[1] ?? []).map((t) => ({
            id: t.id,
            tag: { id: t.accessTag.id, key: t.accessTag.key, label: t.accessTag.title },
          }))}
        />
      ) : null}

      {tab === "finance" && financeData ? (
        <StudentFinanceTab
          enrollments={financeData[0].map((e) => ({
            id: e.id,
            status: e.status,
            startsAt: e.startsAt,
            package: e.package,
          }))}
          entries={financeData[1].map((e) => ({
            id: e.id,
            occurredAt: e.occurredAt,
            type: e.type,
            service: e.service,
            category: e.category,
            amount: e.amount,
            description: e.description,
          }))}
        />
      ) : null}

      {tab === "notes" && notesData ? (
        <StudentNotesTab
          notes={notesData[0].map((n) => ({
            id: n.id,
            content: n.content,
            isPrivate: n.isPrivate,
            createdAt: n.createdAt,
            author: n.author,
          }))}
          teacherComments={notesData[1].map((c) => ({
            id: c.id,
            content: c.content,
            rating: c.rating,
            visibleToParent: c.visibleToParent,
            createdAt: c.createdAt,
            teacher: c.teacher,
          }))}
          notifications={notesData[2].map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            createdAt: n.createdAt,
            readAt: n.readAt,
          }))}
          hasUserAccount={!!student.userId}
        />
      ) : null}

      {tab === "logs" ? (
        <StudentLogsTab
          logs={auditLogs.map((a) => ({
            id: a.id,
            createdAt: a.createdAt,
            action: a.action,
            summary: a.summary,
            actor: a.actor,
          }))}
        />
      ) : null}
    </>
  );
}
