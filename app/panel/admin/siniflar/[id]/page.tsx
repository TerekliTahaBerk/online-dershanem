import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const now = new Date();
  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      teachers: { include: { teacher: { select: { id: true, fullName: true, subjects: true } } } },
      students: {
        where: { leftAt: null },
        include: { student: { select: { id: true, fullName: true, classLevel: true } } },
      },
      defaultForCourses: { select: { id: true, title: true, subject: true } },
      lessons: {
        where: { scheduledAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
        orderBy: { scheduledAt: "asc" },
        take: 30,
        include: {
          teacher: { select: { fullName: true } },
          course: { select: { title: true } },
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { teacher: { select: { fullName: true } } },
      },
      _count: { select: { students: true, teachers: true, lessons: true, assignments: true } },
    },
  });
  if (!classroom) notFound();

  const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const planQs = new URLSearchParams({ classroomId: classroom.id });

  return (
    <>
      <PageHeader
        title={classroom.name}
        subtitle={`${classroom.branch ?? "—"} · ${classroom.level} · Kapasite ${classroom.capacity}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/admin/siniflar" className="od-btn od-btn-ghost od-btn-sm">← Listeye</Link>
            <Link href={`/panel/admin/ders-programi/yeni?${planQs.toString()}`} className="od-btn od-btn-ghost od-btn-sm">
              Bu sınıfa ders planla
            </Link>
            <Link href={`/panel/admin/siniflar/${classroom.id}/duzenle`} className="od-btn od-btn-primary od-btn-sm">
              Düzenle
            </Link>
          </div>
        }
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <Card>
          <CardHeader title={`Öğrenciler (${classroom._count.students})`} />
          <CardBody>
            {classroom.students.length === 0 ? (
              <EmptyState title="Öğrenci yok" description="Düzenle sayfasından ekleyebilirsiniz." />
            ) : (
              <table className="od-table">
                <thead><tr><th>Öğrenci</th><th>Seviye</th><th></th></tr></thead>
                <tbody>
                  {classroom.students.map((cs) => (
                    <tr key={cs.studentId}>
                      <td>{cs.student.fullName}</td>
                      <td className="od-muted">{cs.student.classLevel ?? "—"}</td>
                      <td>
                        <Link href={`/panel/admin/ogrenciler/${cs.student.id}/duzenle`} className="od-btn od-btn-ghost od-btn-sm">
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
          <CardHeader title={`Öğretmenler (${classroom._count.teachers})`} />
          <CardBody>
            {classroom.teachers.length === 0 ? (
              <EmptyState title="Öğretmen yok" />
            ) : (
              <table className="od-table">
                <thead><tr><th>Öğretmen</th><th>Branş</th><th>Lead</th></tr></thead>
                <tbody>
                  {classroom.teachers.map((ct) => (
                    <tr key={ct.teacherId}>
                      <td>{ct.teacher.fullName}</td>
                      <td className="od-muted">{ct.subject ?? ct.teacher.subjects ?? "—"}</td>
                      <td>{ct.isLead ? <Badge tone="ok">Lead</Badge> : <span className="od-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card>
          <CardHeader
            title={`Ders programı (${classroom.lessons.length})`}
            subtitle="Son 7 gün + ileri planlamalar"
          />
          <CardBody>
            {classroom.lessons.length === 0 ? (
              <EmptyState title="Planlanan ders yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Ders</th>
                    <th>Öğretmen</th>
                    <th>Süre</th>
                    <th>Link</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {classroom.lessons.map((l) => (
                    <tr key={l.id}>
                      <td className="od-mono">{dateFmt.format(l.scheduledAt)}</td>
                      <td>{l.course?.title ?? l.title ?? l.subject ?? "—"}</td>
                      <td>{l.teacher?.fullName ?? "—"}</td>
                      <td className="od-mono">{l.duration} dk</td>
                      <td>{l.googleMeetLink ? <a href={l.googleMeetLink} target="_blank" rel="noreferrer">Bağlan</a> : <span className="od-muted">—</span>}</td>
                      <td>
                        <Badge tone={l.status === "COMPLETED" ? "ok" : l.status === "CANCELLED" ? "bad" : "teal"}>
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <Card>
          <CardHeader title={`Ödevler (${classroom._count.assignments})`} />
          <CardBody>
            {classroom.assignments.length === 0 ? (
              <EmptyState title="Ödev yok" />
            ) : (
              <table className="od-table">
                <thead><tr><th>Başlık</th><th>Öğretmen</th><th>Son teslim</th><th>Durum</th></tr></thead>
                <tbody>
                  {classroom.assignments.map((a) => (
                    <tr key={a.id}>
                      <td><Link href={`/panel/admin/odevler/${a.id}/duzenle`} className="od-link">{a.title}</Link></td>
                      <td>{a.teacher?.fullName ?? "—"}</td>
                      <td className="od-mono od-muted">{a.dueAt ? new Intl.DateTimeFormat("tr-TR").format(a.dueAt) : "—"}</td>
                      <td><Badge tone={a.status === "PUBLISHED" ? "ok" : a.status === "CLOSED" ? "neutral" : "warn"}>{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Default ders tanımı (${classroom.defaultForCourses.length})`} />
          <CardBody>
            {classroom.defaultForCourses.length === 0 ? (
              <EmptyState title="Default ders yok" description="Bir ders tanımına bu sınıfı default olarak atayabilirsiniz." />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {classroom.defaultForCourses.map((c) => (
                  <li key={c.id} style={{ marginBottom: 6 }}>
                    <Link href={`/panel/admin/dersler/${c.id}`} className="od-link">{c.title}</Link>
                    <span className="od-muted" style={{ fontSize: 11 }}> · {c.subject}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
