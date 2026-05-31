/**
 * Phase 3 / Session 7 - Admin Classroom detail cockpit.
 *
 * Server component. Operational read-only overview of a single classroom:
 * KPIs, teacher/student rosters with account & parent indicators, 14-day
 * lesson schedule, active homework, materials, 30-day attendance summary,
 * linked courses and recent audit log.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date): string {
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ClassroomDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;

  const now = new Date();
  const in14d = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const c = await prisma.classroom.findUnique({
    where: { id },
    include: {
      students: {
        where: { leftAt: null },
        orderBy: { joinedAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              classLevel: true,
              userId: true,
              parents: { select: { parentId: true }, take: 1 },
            },
          },
        },
      },
      teachers: {
        include: {
          teacher: {
            select: {
              id: true,
              fullName: true,
              subjects: true,
              status: true,
              userId: true,
            },
          },
        },
      },
      defaultForCourses: {
        select: { id: true, title: true, subject: true, status: true },
      },
      _count: {
        select: {
          students: true,
          teachers: true,
          lessons: true,
          assignments: true,
          materials: true,
          attendances: true,
        },
      },
    },
  });
  if (!c) notFound();

  const [
    upcomingLessons,
    activeAssignments,
    recentMaterials,
    attendanceSummary,
    recentAudit,
  ] = await Promise.all([
    prisma.lesson.findMany({
      where: { classroomId: id, scheduledAt: { gte: now, lte: in14d } },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        subject: true,
        scheduledAt: true,
        duration: true,
        status: true,
        teacher: { select: { fullName: true } },
      },
    }),
    prisma.assignment.findMany({
      where: { classroomId: id, status: "PUBLISHED" },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        title: true,
        subject: true,
        dueAt: true,
        teacher: { select: { fullName: true } },
        _count: { select: { submissions: true } },
      },
    }),
    prisma.material.findMany({
      where: { classroomId: id, isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        type: true,
        isPublished: true,
        createdAt: true,
      },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { classroomId: id, sessionDate: { gte: last30 } },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "Classroom", entityId: id },
          { entityType: "ClassroomStudent", entityId: { startsWith: id } },
          { entityType: "ClassroomTeacher", entityId: { startsWith: id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        createdAt: true,
        action: true,
        summary: true,
        entityType: true,
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  const attCounts = Object.fromEntries(
    attendanceSummary.map((r) => [r.status, r._count._all]),
  );
  const attTotal = attendanceSummary.reduce((s, r) => s + r._count._all, 0);

  const isFull = c._count.students >= c.capacity;
  const noTeacher = c._count.teachers === 0;

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={`${c.level}${c.branch ? ` · ${c.branch}` : ""}`}
        meta={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            {c.isActive ? (
              <Badge tone="ok">Aktif</Badge>
            ) : (
              <Badge tone="neutral">Pasif</Badge>
            )}
            {noTeacher ? <Badge tone="warn">Öğretmensiz</Badge> : null}
            {isFull ? <Badge tone="bad">Dolu</Badge> : null}
          </span>
        }
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/panel/admin/siniflar" className="od-btn od-btn-ghost od-btn-sm">
              Liste
            </Link>
            <Link
              href={`/panel/admin/siniflar/${id}/duzenle`}
              className="od-btn od-btn-primary od-btn-sm"
            >
              Düzenle / Atama
            </Link>
            <Link
              href={`/panel/ogretmen/siniflarim/${id}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Öğretmen kokpiti
            </Link>
            <Link
              href={`/panel/admin/ders-programi/yeni?classroomId=${id}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              + Ders planla
            </Link>
            <Link
              href={`/panel/admin/odevler?classroomId=${id}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Ödevler
            </Link>
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          marginBottom: 16,
        }}
      >
        <Card>
          <CardBody>
            <div className="od-muted" style={{ fontSize: 12 }}>Öğrenci</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {c._count.students}
              <span className="od-muted" style={{ fontSize: 13, fontWeight: 400 }}>
                {" "}/ {c.capacity}
              </span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="od-muted" style={{ fontSize: 12 }}>Öğretmen</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{c._count.teachers}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="od-muted" style={{ fontSize: 12 }}>14g Ders</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{upcomingLessons.length}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="od-muted" style={{ fontSize: 12 }}>Aktif Ödev</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{activeAssignments.length}</div>
          </CardBody>
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        }}
      >
        <Card>
          <CardHeader
            title={`Öğretmenler (${c._count.teachers})`}
            right={
              <Link
                href={`/panel/admin/siniflar/${id}/duzenle#ogretmen`}
                className="od-btn od-btn-ghost od-btn-sm"
              >
                + Ata
              </Link>
            }
          />
          <CardBody>
            {c.teachers.length === 0 ? (
              <EmptyState title="Öğretmen yok" description="Düzenle sayfasından atayabilirsiniz." />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Ad</th>
                    <th>Branş</th>
                    <th>Ders</th>
                    <th>Lead</th>
                    <th>Hesap</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {c.teachers.map((ct) => (
                    <tr key={ct.teacher.id}>
                      <td style={{ fontWeight: 600 }}>{ct.teacher.fullName}</td>
                      <td className="od-muted">{ct.teacher.subjects}</td>
                      <td className="od-muted">{ct.subject ?? "—"}</td>
                      <td>
                        {ct.isLead ? <Badge tone="ok">Lead</Badge> : <span className="od-muted">—</span>}
                      </td>
                      <td>
                        {ct.teacher.userId ? (
                          <Badge tone="ok">var</Badge>
                        ) : (
                          <Badge tone="warn">yok</Badge>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/panel/admin/ogretmenler/${ct.teacher.id}/duzenle`}
                          className="od-btn od-btn-ghost od-btn-sm"
                        >
                          Profil
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
            title={`Öğrenciler (${c._count.students})`}
            right={
              <Link
                href={`/panel/admin/siniflar/${id}/duzenle#ogrenci`}
                className="od-btn od-btn-ghost od-btn-sm"
              >
                + Ata
              </Link>
            }
          />
          <CardBody>
            {c.students.length === 0 ? (
              <EmptyState title="Öğrenci yok" description="Düzenle sayfasından ekleyebilirsiniz." />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Ad</th>
                    <th>Sınıf</th>
                    <th>Veli</th>
                    <th>Hesap</th>
                    <th>Katıldı</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {c.students.map((cs) => (
                    <tr key={cs.student.id}>
                      <td style={{ fontWeight: 600 }}>{cs.student.fullName}</td>
                      <td className="od-muted">{cs.student.classLevel ?? "—"}</td>
                      <td>
                        {cs.student.parents.length > 0 ? (
                          <Badge tone="ok">var</Badge>
                        ) : (
                          <Badge tone="warn">yok</Badge>
                        )}
                      </td>
                      <td>
                        {cs.student.userId ? (
                          <Badge tone="ok">var</Badge>
                        ) : (
                          <Badge tone="neutral">yok</Badge>
                        )}
                      </td>
                      <td className="od-muted od-mono">
                        {cs.joinedAt.toLocaleDateString("tr-TR")}
                      </td>
                      <td>
                        <Link
                          href={`/panel/admin/ogrenciler/${cs.student.id}`}
                          className="od-btn od-btn-ghost od-btn-sm"
                        >
                          Profil
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

      <Card style={{ marginTop: 16 }}>
        <CardHeader
          title={`Yaklaşan dersler (14 gün) — ${upcomingLessons.length}`}
          right={
            <Link
              href={`/panel/admin/ders-programi/yeni?classroomId=${id}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              + Ders planla
            </Link>
          }
        />
        <CardBody>
          {upcomingLessons.length === 0 ? (
            <EmptyState title="14 gün içinde planlı ders yok" />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Süre</th>
                  <th>Konu / Ders</th>
                  <th>Öğretmen</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {upcomingLessons.map((l) => (
                  <tr key={l.id}>
                    <td className="od-mono">{fmtDateTime(l.scheduledAt)}</td>
                    <td className="od-mono">{l.duration} dk</td>
                    <td>
                      {l.title ?? "—"}
                      {l.subject ? <span className="od-muted"> · {l.subject}</span> : null}
                    </td>
                    <td className="od-muted">{l.teacher.fullName}</td>
                    <td>
                      <Badge
                        tone={
                          l.status === "COMPLETED"
                            ? "ok"
                            : l.status === "CANCELLED"
                              ? "bad"
                              : "teal"
                        }
                      >
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

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        }}
      >
        <Card>
          <CardHeader
            title={`Aktif ödevler (${activeAssignments.length})`}
            right={
              <Link
                href={`/panel/admin/odevler?classroomId=${id}`}
                className="od-btn od-btn-ghost od-btn-sm"
              >
                Tümü
              </Link>
            }
          />
          <CardBody>
            {activeAssignments.length === 0 ? (
              <EmptyState title="Aktif yayında ödev yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Başlık</th>
                    <th>Öğretmen</th>
                    <th>Son tarih</th>
                    <th>Teslim</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssignments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link
                          href={`/panel/admin/odevler/${a.id}/duzenle`}
                          className="od-link"
                        >
                          {a.title}
                        </Link>
                        {a.subject ? <span className="od-muted"> · {a.subject}</span> : null}
                      </td>
                      <td className="od-muted">{a.teacher.fullName}</td>
                      <td className="od-mono">
                        {a.dueAt ? a.dueAt.toLocaleDateString("tr-TR") : "—"}
                      </td>
                      <td className="od-mono">{a._count.submissions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Materyaller (${c._count.materials})`} />
          <CardBody>
            {recentMaterials.length === 0 ? (
              <EmptyState title="Bu sınıfa atanmış materyal yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Başlık</th>
                    <th>Tip</th>
                    <th>Yayın</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMaterials.map((m) => (
                    <tr key={m.id}>
                      <td>{m.title}</td>
                      <td className="od-muted">{m.type}</td>
                      <td>
                        {m.isPublished ? (
                          <Badge tone="ok">Yayında</Badge>
                        ) : (
                          <Badge tone="neutral">Taslak</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        }}
      >
        <Card>
          <CardHeader title="Devam (son 30 gün)" />
          <CardBody>
            {attTotal === 0 ? (
              <EmptyState title="Son 30 günde devam kaydı yok" />
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((s) => (
                  <div key={s}>
                    <div className="od-muted" style={{ fontSize: 12 }}>{s}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {attCounts[s] ?? 0}
                    </div>
                  </div>
                ))}
                <div>
                  <div className="od-muted" style={{ fontSize: 12 }}>TOPLAM</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{attTotal}</div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Bağlı kurslar (${c.defaultForCourses.length})`} />
          <CardBody>
            {c.defaultForCourses.length === 0 ? (
              <EmptyState title="Varsayılan sınıf olarak atanmış kurs yok" />
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                {c.defaultForCourses.map((co) => (
                  <li key={co.id} style={{ marginBottom: 4 }}>
                    <Link href={`/panel/admin/dersler/${co.id}`} className="od-link">
                      {co.title}
                    </Link>
                    <span className="od-muted"> · {co.subject} · {co.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <CardHeader title="Son işlemler" />
        <CardBody>
          {recentAudit.length === 0 ? (
            <EmptyState title="Bu sınıfa ait audit kaydı yok" />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>İşlem</th>
                  <th>Tip</th>
                  <th>Kullanıcı</th>
                  <th>Özet</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.map((a) => (
                  <tr key={a.id}>
                    <td className="od-mono">{fmtDateTime(a.createdAt)}</td>
                    <td className="od-mono">{a.action}</td>
                    <td className="od-muted">{a.entityType}</td>
                    <td className="od-muted">
                      {a.actor?.name ?? a.actor?.email ?? "—"}
                    </td>
                    <td className="od-muted">{a.summary ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 8 }}>
            <span className="od-muted" style={{ fontSize: 12 }}>
              Toplam: {c._count.lessons} ders · {c._count.assignments} ödev ·{" "}
              {c._count.materials} materyal · {c._count.attendances} devam kaydı
            </span>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
