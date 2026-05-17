import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      defaultTeacher: { select: { id: true, fullName: true } },
      defaultClassroom: { select: { id: true, name: true, branch: true } },
      modules: { orderBy: { orderIndex: "asc" }, include: { _count: { select: { contents: true } } } },
      lessons: {
        orderBy: { scheduledAt: "desc" },
        take: 20,
        include: {
          teacher: { select: { fullName: true } },
          student: { select: { fullName: true } },
          classroom: { select: { name: true } },
        },
      },
      _count: { select: { lessons: true, modules: true, packageCourses: true } },
    },
  });
  if (!course) notFound();

  const dateFmt = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  // Yeni ders planlama URL'ine prefill için query string
  const planQs = new URLSearchParams({ courseId: course.id });
  if (course.defaultTeacherId) planQs.set("teacherId", course.defaultTeacherId);
  if (course.defaultClassroomId) planQs.set("classroomId", course.defaultClassroomId);

  return (
    <>
      <PageHeader
        title={course.title}
        subtitle={`${course.subject}${course.levelLabel ? ` · ${course.levelLabel}` : ""}${course.examType ? ` · ${course.examType}` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/admin/dersler" className="od-btn od-btn-ghost od-btn-sm">← Listeye</Link>
            <Link href={`/panel/admin/ders-programi/yeni?${planQs.toString()}`} className="od-btn od-btn-ghost od-btn-sm">
              Bu dersi planla
            </Link>
            <Link href={`/panel/admin/dersler/${course.id}/duzenle`} className="od-btn od-btn-primary od-btn-sm">
              Düzenle
            </Link>
          </div>
        }
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <Card>
          <CardHeader title="Genel bilgiler" />
          <CardBody>
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 16px", fontSize: 13 }}>
              <dt className="od-muted">Slug</dt>
              <dd className="od-mono">{course.slug}</dd>
              <dt className="od-muted">Branş</dt>
              <dd>{course.subject}</dd>
              <dt className="od-muted">Seviye</dt>
              <dd>{course.levelLabel ?? "—"}</dd>
              <dt className="od-muted">Sınav</dt>
              <dd>{course.examType ?? "—"}</dd>
              <dt className="od-muted">Default öğretmen</dt>
              <dd>{course.defaultTeacher?.fullName ?? "—"}</dd>
              <dt className="od-muted">Default sınıf</dt>
              <dd>
                {course.defaultClassroom
                  ? `${course.defaultClassroom.name}${course.defaultClassroom.branch ? ` · ${course.defaultClassroom.branch}` : ""}`
                  : "—"}
              </dd>
              <dt className="od-muted">Tahmini süre</dt>
              <dd>{course.estimatedMinutes ? `${course.estimatedMinutes} dk` : "—"}</dd>
              <dt className="od-muted">Açıklama</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{course.description ?? "—"}</dd>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Durum" />
          <CardBody>
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="od-muted">Aktif</span>
                {course.isActive ? <Badge tone="ok">Evet</Badge> : <Badge tone="neutral">Hayır</Badge>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="od-muted">Yayın</span>
                <Badge tone={course.status === "PUBLISHED" ? "ok" : course.status === "DRAFT" ? "warn" : "neutral"}>
                  {course.status}
                </Badge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="od-muted">Modül</span>
                <strong>{course._count.modules}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="od-muted">Planlanan ders</span>
                <strong>{course._count.lessons}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="od-muted">Pakette</span>
                <strong>{course._count.packageCourses}</strong>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card>
          <CardHeader title="Son planlanan dersler" subtitle={`Bu Course'a bağlı son 20 lesson`} />
          <CardBody>
            {course.lessons.length === 0 ? (
              <EmptyState
                title="Henüz planlanmadı"
                description="Üstteki 'Bu dersi planla' butonu ile ilk planlamayı yapabilirsiniz."
              />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Konu</th>
                    <th>Öğretmen</th>
                    <th>Öğrenci/Sınıf</th>
                    <th>Durum</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {course.lessons.map((l) => (
                    <tr key={l.id}>
                      <td className="od-mono">{dateFmt.format(l.scheduledAt)}</td>
                      <td>{l.title ?? l.subject ?? "—"}</td>
                      <td>{l.teacher?.fullName ?? "—"}</td>
                      <td>{l.classroom?.name ?? l.student?.fullName ?? "—"}</td>
                      <td>
                        <Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : "teal"}>
                          {l.status}
                        </Badge>
                      </td>
                      <td>
                        <Link href={`/panel/admin/ders-programi/${l.id}`} className="od-btn od-btn-ghost od-btn-sm">
                          Aç
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
