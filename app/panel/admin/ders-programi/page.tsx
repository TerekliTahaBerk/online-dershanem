import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

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

  const where: Record<string, unknown> = { scheduledAt: { gte: start, lte: end } };
  if (sp.teacherId) where.teacherId = sp.teacherId;
  if (sp.classroomId) where.classroomId = sp.classroomId;
  if (sp.courseId) where.courseId = sp.courseId;

  const [lessons, teachers, classrooms, courses] = await Promise.all([
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

  return (
    <>
      <PageHeader
        title="Ders programı"
        subtitle={days + " gün · " + lessons.length + " ders satırı · " + rows.length + " seans"}
        right={
          <Link href="/panel/admin/ders-programi/yeni" className="od-btn od-btn-primary od-btn-sm">
            + Yeni planlama
          </Link>
        }
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["today", "week", "next14", "month"] as const).map((r) => (
          <Link
            key={r}
            href={rangeLink(r)}
            className={"od-btn od-btn-sm " + (active === r ? "od-btn-primary" : "od-btn-ghost")}
          >
            {r === "today" ? "Bugün" : r === "week" ? "Bu hafta" : r === "next14" ? "14 gün" : "30 gün"}
          </Link>
        ))}
      </div>

      <Card>
        <form method="GET" style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12, borderBottom: "1px solid var(--pd-line)" }}>
          <input type="hidden" name="range" value={active} />
          <select name="teacherId" defaultValue={sp.teacherId ?? ""} className="od-select">
            <option value="">Tüm öğretmenler</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
          <select name="classroomId" defaultValue={sp.classroomId ?? ""} className="od-select">
            <option value="">Tüm sınıflar</option>
            {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="courseId" defaultValue={sp.courseId ?? ""} className="od-select">
            <option value="">Tüm dersler</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button type="submit" className="od-btn od-btn-sm">Filtrele</button>
          {(sp.teacherId || sp.classroomId || sp.courseId) ? (
            <Link href={"?range=" + active} className="od-btn od-btn-ghost od-btn-sm">Temizle</Link>
          ) : null}
        </form>

        {rows.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              title="Bu aralıkta planlanmış ders yok"
              description="Yeni bir ders planlamak için sağdaki butonu kullanın."
            />
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
                    <Link href={"/panel/admin/ders-programi/" + head.id} className="od-btn od-btn-ghost od-btn-sm">
                      Aç
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
