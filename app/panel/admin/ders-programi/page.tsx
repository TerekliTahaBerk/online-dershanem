import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Badge } from "@/components/panel/ui/badge";
import { LessonQuickPlanButton } from "@/components/panel/lessons/lesson-quick-plan-modal";
import {
  WeeklyScheduleGrid,
  startOfIsoWeek,
  weekRangeLabel,
} from "@/components/panel/lessons/weekly-schedule-grid";
import { createLessonAction } from "./_actions";

export const dynamic = "force-dynamic";

type SP = {
  range?: "today" | "week" | "next14" | "month";
  teacherId?: string;
  classroomId?: string;
  courseId?: string;
};

function getRange(range: SP["range"]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  let days = 14;
  if (range === "today") days = 1;
  else if (range === "week") days = 7;
  else if (range === "month") days = 30;
  const end = new Date(start.getTime() + days * 86400000);
  return { start, end, days };
}

export default async function AdminSchedule({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const { start, end, days } = getRange(sp.range);

  // Operational range (existing behavior preserved for the detailed list).
  const where: Record<string, unknown> = { scheduledAt: { gte: start, lte: end } };
  if (sp.teacherId) where.teacherId = sp.teacherId;
  if (sp.classroomId) where.classroomId = sp.classroomId;
  if (sp.courseId) where.courseId = sp.courseId;

  // Visible week for the grid — always Monday..Sunday of the current week.
  const weekStart = startOfIsoWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekWhere: Record<string, unknown> = { scheduledAt: { gte: weekStart, lt: weekEnd } };
  if (sp.teacherId) weekWhere.teacherId = sp.teacherId;
  if (sp.classroomId) weekWhere.classroomId = sp.classroomId;
  if (sp.courseId) weekWhere.courseId = sp.courseId;

  const [lessons, weekLessons, teachers, classrooms, courses] = await Promise.all([
    prisma.lesson.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: {
        teacher: { select: { fullName: true } },
        student: { select: { fullName: true } },
        classroom: { select: { name: true } },
        course: { select: { title: true } },
      },
      take: 500,
    }),
    prisma.lesson.findMany({
      where: weekWhere,
      orderBy: { scheduledAt: "asc" },
      include: {
        teacher: { select: { fullName: true } },
        student: { select: { fullName: true } },
        classroom: { select: { name: true } },
        course: { select: { title: true } },
      },
      take: 500,
    }),
    prisma.teacher.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    prisma.classroom.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.course.findMany({ where: { isActive: true }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  const grouped = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = l.sessionGroupId ?? "solo:" + l.id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(l);
  }
  const rows = Array.from(grouped.values()).map((arr) => ({ head: arr[0], studentCount: arr.length }));

  const fmt = new Intl.DateTimeFormat("tr-TR", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  const rangeLink = (r: NonNullable<SP["range"]>) => {
    const params = new URLSearchParams();
    params.set("range", r);
    if (sp.teacherId) params.set("teacherId", sp.teacherId);
    if (sp.classroomId) params.set("classroomId", sp.classroomId);
    if (sp.courseId) params.set("courseId", sp.courseId);
    return "?" + params.toString();
  };
  const active = sp.range ?? "next14";
  const filtersActive = !!(sp.teacherId || sp.classroomId || sp.courseId);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Ders Programı" },
        ]}
        title={weekRangeLabel(weekStart)}
        subtitle="Dersleri, canlı bağlantıları ve yoklama durumlarını haftalık görünümde yönetin."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <LessonQuickPlanButton action={createLessonAction} />
            <Link href="/panel/admin/ders-programi/yeni" className="od-btn dark sm">
              + Yeni planlama
            </Link>
          </div>
        }
      />

      {/* Compact toolbar: segmented range + filter form */}
      <div className="od-week-toolbar">
        <div className="od-segmented" role="tablist" aria-label="Aralık">
          {(["today", "week", "next14", "month"] as const).map((r) => (
            <Link
              key={r}
              href={rangeLink(r)}
              className={"od-segmented-item" + (active === r ? " is-active" : "")}
              role="tab"
              aria-selected={active === r}
            >
              {r === "today" ? "Bugün" : r === "week" ? "Bu hafta" : r === "next14" ? "14 gün" : "30 gün"}
            </Link>
          ))}
        </div>
        <span className="od-week-toolbar-spacer" />
        <form
          method="GET"
          style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
        >
          <input type="hidden" name="range" value={active} />
          <select name="teacherId" defaultValue={sp.teacherId ?? ""} className="od-select" aria-label="Öğretmen">
            <option value="">Tüm öğretmenler</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
          <select name="classroomId" defaultValue={sp.classroomId ?? ""} className="od-select" aria-label="Sınıf">
            <option value="">Tüm sınıflar</option>
            {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="courseId" defaultValue={sp.courseId ?? ""} className="od-select" aria-label="Ders">
            <option value="">Tüm dersler</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button type="submit" className="od-btn sm">Filtrele</button>
          {filtersActive ? (
            <Link href={"?range=" + active} className="od-btn ghost sm">Temizle</Link>
          ) : null}
        </form>
      </div>

      <WeeklyScheduleGrid
        lessons={weekLessons.map((l) => ({
          id: l.id,
          scheduledAt: l.scheduledAt,
          duration: l.duration,
          title: l.title,
          subject: l.subject,
          status: l.status,
          course: l.course,
          teacher: l.teacher,
          student: l.student,
          classroom: l.classroom,
        }))}
        weekStart={weekStart}
        hrefForLesson={(l) => `/panel/admin/ders-programi/${l.id}`}
        emptyCta={
          <Link href="/panel/admin/ders-programi/yeni" className="od-btn dark sm">
            + Yeni ders planla
          </Link>
        }
      />

      {/* Detailed list — preserves all original information & actions. */}
      <details className="od-week-list-disclosure">
        <summary>
          Detaylı liste — {days} gün · {lessons.length} ders satırı · {rows.length} seans
        </summary>
        {rows.length === 0 ? (
          <div style={{ padding: 24, color: "var(--pd-muted)", fontSize: 13 }}>
            Bu aralıkta planlanmış ders yok.
          </div>
        ) : (
          <table className="od-table">
            <thead>
              <tr>
                <th>Tarih/Saat</th>
                <th>Ders</th>
                <th>Öğretmen</th>
                <th>Hedef</th>
                <th>Süre</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ head, studentCount }) => (
                <tr key={head.id}>
                  <td className="od-mono">{fmt.format(head.scheduledAt)}</td>
                  <td>{head.course?.title ?? head.title ?? head.subject ?? "—"}</td>
                  <td>{head.teacher?.fullName ?? "—"}</td>
                  <td>
                    {head.classroom?.name ? (
                      <>
                        {head.classroom.name}{" "}
                        <Badge tone="teal">{studentCount} öğr.</Badge>
                      </>
                    ) : (
                      head.student?.fullName ?? "—"
                    )}
                  </td>
                  <td className="od-mono">{head.duration} dk</td>
                  <td>
                    <Badge tone={head.status === "COMPLETED" ? "ok" : head.status === "CANCELLED" ? "bad" : "teal"}>
                      {head.status}
                    </Badge>
                  </td>
                  <td>
                    <Link href={"/panel/admin/ders-programi/" + head.id} className="od-btn sm">
                      Aç
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </>
  );
}
