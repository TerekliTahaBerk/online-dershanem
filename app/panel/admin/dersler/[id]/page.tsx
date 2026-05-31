import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

type KpiTone = "ok" | "warn" | "bad" | "teal" | "purple" | "neutral";

function KpiCard({ label, value, hint, tone = "neutral" }: { label: string; value: number; hint?: string; tone?: KpiTone }) {
  return (
    <div
      style={{
        border: "1px solid var(--od-border, #e5e7eb)",
        borderRadius: 8,
        padding: "12px 14px",
        background: "var(--od-card, #fff)",
      }}
    >
      <div className="od-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
        <Badge tone={tone}>{value.toLocaleString("tr-TR")}</Badge>
      </div>
      {hint ? (
        <div className="od-muted" style={{ fontSize: 11, marginTop: 4 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

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
      defaultTeacher: { select: { id: true, fullName: true, email: true } },
      defaultClassroom: { select: { id: true, name: true, branch: true, isActive: true } },
      _count: {
        select: {
          lessons: true,
          modules: true,
          packageCourses: true,
          materials: true,
          studentProgress: true,
        },
      },
    },
  });
  if (!course) notFound();

  const now = new Date();
  const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60_000);

  const [
    upcomingLessons,
    upcomingCount,
    activeHomeworkCount,
    recentHomework,
    recentMaterials,
    activeMaterialCount,
    packageCourses,
    affectedStudentCount,
    classroomTeachers,
    auditRows,
  ] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        courseId: course.id,
        scheduledAt: { gte: now, lte: fourteenDays },
        status: { not: "CANCELLED" },
      },
      orderBy: { scheduledAt: "asc" },
      take: 30,
      select: {
        id: true,
        title: true,
        subject: true,
        scheduledAt: true,
        status: true,
        teacher: { select: { fullName: true } },
        classroom: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true } },
      },
    }),
    prisma.lesson.count({
      where: { courseId: course.id, scheduledAt: { gte: now }, status: { not: "CANCELLED" } },
    }),
    prisma.assignment.count({
      where: { subject: course.subject, status: "PUBLISHED" },
    }),
    prisma.assignment.findMany({
      where: { subject: course.subject, status: { not: "DRAFT" } },
      orderBy: [{ dueAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        teacher: { select: { fullName: true } },
        classroom: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    }),
    prisma.material.findMany({
      where: { courseId: course.id, isArchived: false },
      orderBy: [{ isPublished: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        type: true,
        url: true,
        fileUrl: true,
        isPublished: true,
        publishedAt: true,
        updatedAt: true,
        teacher: { select: { fullName: true } },
      },
    }),
    prisma.material.count({
      where: { courseId: course.id, isArchived: false, isPublished: true },
    }),
    prisma.packageCourse.findMany({
      where: { courseId: course.id },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
      take: 20,
    }),
    prisma.lesson
      .findMany({
        where: { courseId: course.id },
        distinct: ["studentId"],
        select: { studentId: true },
        take: 1000,
      })
      .then((rows) => rows.filter((r) => r.studentId).length),
    course.defaultClassroomId
      ? prisma.classroomTeacher.findMany({
          where: { classroomId: course.defaultClassroomId },
          include: { teacher: { select: { id: true, fullName: true, subjects: true } } },
          take: 20,
        })
      : Promise.resolve([] as Array<{ teacher: { id: string; fullName: string; subjects: string } }>),
    prisma.auditLog.findMany({
      where: { entityType: "Course", entityId: course.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, summary: true, createdAt: true, actorUserId: true },
    }),
  ]);

  const hasClassroom = !!course.defaultClassroomId;
  const hasTeacher = !!course.defaultTeacherId;
  const hasUpcoming = upcomingCount > 0;
  const hasMaterial = activeMaterialCount > 0;
  const hasHomework = activeHomeworkCount > 0;

  const planQs = new URLSearchParams({ courseId: course.id });
  if (course.defaultTeacherId) planQs.set("teacherId", course.defaultTeacherId);
  if (course.defaultClassroomId) planQs.set("classroomId", course.defaultClassroomId);

  return (
    <>
      <PageHeader
        title={course.title}
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Dersler", href: "/panel/admin/dersler" },
          { label: course.title },
        ]}
        meta={
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Badge tone="neutral">{course.subject}</Badge>
            {course.examType ? <Badge tone="teal">{course.examType}</Badge> : null}
            {course.levelLabel ? <span className="od-muted">{course.levelLabel}</span> : null}
            {course.isActive ? (
              <Badge
                tone={course.status === "PUBLISHED" ? "ok" : course.status === "DRAFT" ? "warn" : "neutral"}
              >
                {course.status}
              </Badge>
            ) : (
              <Badge tone="neutral">Pasif</Badge>
            )}
          </span>
        }
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/panel/admin/dersler" className="od-btn od-btn-ghost od-btn-sm">
              ← Listeye
            </Link>
            <Link href={`/panel/admin/ders-programi/yeni?${planQs.toString()}`} className="od-btn od-btn-ghost od-btn-sm">
              + Ders planla
            </Link>
            <Link
              href={`/panel/admin/odevler/yeni?subject=${encodeURIComponent(course.subject)}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              + Ödev oluştur
            </Link>
            <Link
              href={`/panel/ogretmen/materyaller/yeni?courseId=${course.id}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              + Materyal ekle
            </Link>
            <Link href={`/panel/admin/dersler/${course.id}/duzenle`} className="od-btn od-btn-primary od-btn-sm">
              Düzenle
            </Link>
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <KpiCard label="Toplam ders" value={course._count.lessons} hint="Tüm zamanlar" />
        <KpiCard
          label="Yakın 14 gün"
          value={upcomingLessons.length}
          hint={`${upcomingCount} planlanan`}
          tone={hasUpcoming ? "ok" : "warn"}
        />
        <KpiCard
          label="Aktif ödev"
          value={activeHomeworkCount}
          hint={`Konu: ${course.subject}`}
          tone={hasHomework ? "teal" : "neutral"}
        />
        <KpiCard
          label="Materyal"
          value={activeMaterialCount}
          hint={hasMaterial ? "Yayında" : "Yok"}
          tone={hasMaterial ? "purple" : "neutral"}
        />
        <KpiCard
          label="Pakette"
          value={course._count.packageCourses}
          hint={`${course._count.modules} modül`}
        />
        <KpiCard
          label="Etkilenen öğrenci"
          value={affectedStudentCount}
          hint={`${course._count.studentProgress} ilerleme`}
        />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <CardHeader title="Yakın 14 gün — planlanan dersler" subtitle={`${upcomingLessons.length} kayıt`} />
            <CardBody>
              {upcomingLessons.length === 0 ? (
                <EmptyState
                  title="Yakın zamanda planlanmış ders yok"
                  description="Yukarıdaki + Ders planla ile ilk planlamayı yapabilirsiniz."
                />
              ) : (
                <table className="od-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Konu</th>
                      <th>Öğretmen</th>
                      <th>Sınıf / Öğrenci</th>
                      <th>Durum</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingLessons.map((l) => (
                      <tr key={l.id}>
                        <td className="od-mono">{dateFmt.format(l.scheduledAt)}</td>
                        <td>{l.title ?? l.subject ?? "—"}</td>
                        <td>{l.teacher?.fullName ?? "—"}</td>
                        <td>
                          {l.classroom ? (
                            <Link href={`/panel/admin/siniflar/${l.classroom.id}`} className="od-link">
                              {l.classroom.name}
                            </Link>
                          ) : l.student ? (
                            <Link href={`/panel/admin/ogrenciler?drawer=student&id=${l.student.id}`} className="od-link">
                              {l.student.fullName}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
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

          <Card>
            <CardHeader
              title="Son ödevler"
              subtitle={`Konu eşleşmesi: ${course.subject} · ${activeHomeworkCount} aktif`}
            />
            <CardBody>
              {recentHomework.length === 0 ? (
                <EmptyState
                  title="Bu konuya ait ödev yok"
                  description="Üstteki + Ödev oluştur ile yeni bir ödev tanımlayabilirsiniz."
                />
              ) : (
                <table className="od-table">
                  <thead>
                    <tr>
                      <th>Başlık</th>
                      <th>Öğretmen</th>
                      <th>Sınıf</th>
                      <th>Son teslim</th>
                      <th>Gönderim</th>
                      <th>Durum</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentHomework.map((a) => (
                      <tr key={a.id}>
                        <td>{a.title}</td>
                        <td>{a.teacher.fullName}</td>
                        <td>
                          {a.classroom ? (
                            <Link href={`/panel/admin/siniflar/${a.classroom.id}`} className="od-link">
                              {a.classroom.name}
                            </Link>
                          ) : (
                            <span className="od-muted">—</span>
                          )}
                        </td>
                        <td className="od-mono">{a.dueAt ? dayFmt.format(a.dueAt) : "—"}</td>
                        <td className="od-mono">{a._count.submissions}</td>
                        <td>
                          <Badge tone={a.status === "PUBLISHED" ? "ok" : a.status === "CLOSED" ? "neutral" : "warn"}>
                            {a.status}
                          </Badge>
                        </td>
                        <td>
                          <Link href={`/panel/admin/odevler/${a.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">
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

          <Card>
            <CardHeader title="Son materyaller" subtitle={`${activeMaterialCount} yayınlanmış · arşiv hariç`} />
            <CardBody>
              {recentMaterials.length === 0 ? (
                <EmptyState
                  title="Bu derse ait materyal yok"
                  description="Yukarıdaki + Materyal ekle ile ilk materyali ekleyin."
                />
              ) : (
                <table className="od-table">
                  <thead>
                    <tr>
                      <th>Başlık</th>
                      <th>Tür</th>
                      <th>Öğretmen</th>
                      <th>Yayın</th>
                      <th>Güncellendi</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMaterials.map((m) => {
                      const href = m.url || m.fileUrl || null;
                      return (
                        <tr key={m.id}>
                          <td>{m.title}</td>
                          <td>
                            <Badge tone="neutral">{m.type}</Badge>
                          </td>
                          <td>{m.teacher?.fullName ?? <span className="od-muted">—</span>}</td>
                          <td>
                            {m.isPublished ? (
                              <Badge tone="ok">Yayında</Badge>
                            ) : (
                              <Badge tone="warn">Taslak</Badge>
                            )}
                          </td>
                          <td className="od-mono od-muted">{dayFmt.format(m.updatedAt)}</td>
                          <td>
                            {href ? (
                              <a href={href} target="_blank" rel="noreferrer" className="od-btn od-btn-ghost od-btn-sm">
                                Aç
                              </a>
                            ) : (
                              <span className="od-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card>
            <CardHeader title="Varsayılanlar" />
            <CardBody>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div>
                  <span className="od-muted">Default sınıf</span>
                  <div style={{ marginTop: 4 }}>
                    {course.defaultClassroom ? (
                      <Link href={`/panel/admin/siniflar/${course.defaultClassroom.id}`} className="od-link">
                        {course.defaultClassroom.name}
                        {course.defaultClassroom.branch ? ` · ${course.defaultClassroom.branch}` : ""}
                        {course.defaultClassroom.isActive ? "" : " (pasif)"}
                      </Link>
                    ) : (
                      <Badge tone="warn">Atanmadı</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="od-muted">Default öğretmen</span>
                  <div style={{ marginTop: 4 }}>
                    {course.defaultTeacher ? (
                      <Link
                        href={`/panel/admin/ogretmenler/${course.defaultTeacher.id}/duzenle`}
                        className="od-link"
                      >
                        {course.defaultTeacher.fullName}
                      </Link>
                    ) : (
                      <Badge tone="warn">Atanmadı</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="od-muted">Slug</span>
                  <div className="od-mono" style={{ marginTop: 4 }}>
                    {course.slug}
                  </div>
                </div>
                {course.estimatedMinutes ? (
                  <div>
                    <span className="od-muted">Tahmini süre</span>
                    <div style={{ marginTop: 4 }}>{course.estimatedMinutes} dk</div>
                  </div>
                ) : null}
              </div>

              {!hasClassroom || !hasTeacher ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 6,
                    background: "rgba(234, 179, 8, 0.08)",
                    border: "1px solid rgba(234, 179, 8, 0.3)",
                    fontSize: 12,
                  }}
                >
                  <strong>Operasyonel uyarı</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                    {!hasClassroom ? (
                      <li>Default sınıf atanmadı; ders planlama adımı her seferinde sınıf seçmeyi gerektiriyor.</li>
                    ) : null}
                    {!hasTeacher ? <li>Default öğretmen atanmadı; planlama varsayılanı yok.</li> : null}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {classroomTeachers.length > 0 ? (
            <Card>
              <CardHeader title="Sınıf öğretmenleri" subtitle="Default sınıfa bağlı" />
              <CardBody>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                  {classroomTeachers.map((ct) => (
                    <li key={ct.teacher.id}>
                      <Link href={`/panel/admin/ogretmenler/${ct.teacher.id}/duzenle`} className="od-link">
                        {ct.teacher.fullName}
                      </Link>{" "}
                      <span className="od-muted">— {ct.teacher.subjects}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Dahil olduğu paketler" subtitle={`${packageCourses.length} paket`} />
            <CardBody>
              {packageCourses.length === 0 ? (
                <p className="od-muted" style={{ fontSize: 13, margin: 0 }}>
                  Bu ders henüz hiçbir pakete eklenmemiş.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, display: "grid", gap: 4 }}>
                  {packageCourses.map((pc) => (
                    <li key={pc.packageId}>
                      <Link href={`/panel/admin/paketler/${pc.package.id}`} className="od-link">
                        {pc.package.name}
                      </Link>{" "}
                      <Badge tone={pc.package.isActive ? "ok" : "neutral"}>
                        {pc.package.isActive ? "Aktif" : "Pasif"}
                      </Badge>{" "}
                      <span className="od-muted">
                        · {pc.package._count.enrollments} kayıt
                        {pc.isRequired ? " · zorunlu" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Son işlemler" subtitle="AuditLog (son 10)" />
            <CardBody>
              {auditRows.length === 0 ? (
                <p className="od-muted" style={{ fontSize: 13, margin: 0 }}>
                  Bu ders için kayıt yok.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 12 }}>
                  {auditRows.map((a) => (
                    <li key={a.id} style={{ display: "grid", gap: 2 }}>
                      <div>
                        <Badge tone="neutral">{a.action}</Badge>{" "}
                        <span className="od-mono od-muted" style={{ fontSize: 11 }}>
                          {dateFmt.format(a.createdAt)}
                        </span>
                      </div>
                      {a.summary ? <div>{a.summary}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
