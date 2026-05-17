import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { cancelLessonAction, deleteLessonAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, fullName: true } },
      student: { select: { id: true, fullName: true } },
      classroom: { select: { id: true, name: true, branch: true } },
      course: { select: { id: true, title: true, subject: true } },
    },
  });
  if (!lesson) notFound();

  // Aynı session_group'taki diğer satırlar (öğrenci listesi)
  const sessionPeers = lesson.sessionGroupId
    ? await prisma.lesson.findMany({
        where: { sessionGroupId: lesson.sessionGroupId },
        select: { id: true, studentId: true, status: true, student: { select: { fullName: true } } },
      })
    : [];

  const seriesPeersCount = lesson.seriesId
    ? await prisma.lesson.count({ where: { seriesId: lesson.seriesId } })
    : 0;

  const fmt = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <>
      <PageHeader
        title={lesson.course?.title ?? lesson.title ?? "Ders"}
        subtitle={fmt.format(lesson.scheduledAt)}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/admin/ders-programi" className="od-btn od-btn-ghost od-btn-sm">← Programa</Link>
            <Link href={`/panel/admin/ders-programi/${lesson.id}/duzenle`} className="od-btn od-btn-primary od-btn-sm">
              Düzenle
            </Link>
          </div>
        }
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <Card>
          <CardHeader title="Ders bilgileri" />
          <CardBody>
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 16px", fontSize: 13 }}>
              <dt className="od-muted">Ders tanımı</dt>
              <dd>
                {lesson.course ? (
                  <Link href={`/panel/admin/dersler/${lesson.course.id}`} className="od-link">
                    {lesson.course.title}
                  </Link>
                ) : "—"}
              </dd>
              <dt className="od-muted">Branş</dt>
              <dd>{lesson.subject ?? lesson.course?.subject ?? "—"}</dd>
              <dt className="od-muted">Öğretmen</dt>
              <dd>{lesson.teacher.fullName}</dd>
              <dt className="od-muted">Öğrenci</dt>
              <dd>{lesson.student.fullName}</dd>
              <dt className="od-muted">Sınıf</dt>
              <dd>
                {lesson.classroom ? (
                  <Link href={`/panel/admin/siniflar/${lesson.classroom.id}`} className="od-link">
                    {lesson.classroom.name}{lesson.classroom.branch ? ` · ${lesson.classroom.branch}` : ""}
                  </Link>
                ) : "Bireysel"}
              </dd>
              <dt className="od-muted">Tarih/saat</dt>
              <dd className="od-mono">{fmt.format(lesson.scheduledAt)}</dd>
              <dt className="od-muted">Süre</dt>
              <dd>{lesson.duration} dakika</dd>
              <dt className="od-muted">Online link</dt>
              <dd>
                {lesson.googleMeetLink ? (
                  <a href={lesson.googleMeetLink} target="_blank" rel="noreferrer">{lesson.googleMeetLink}</a>
                ) : "—"}
              </dd>
              <dt className="od-muted">Lokasyon</dt>
              <dd>{lesson.location ?? "—"}</dd>
              <dt className="od-muted">Notlar</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{lesson.notes ?? "—"}</dd>
            </dl>
          </CardBody>
        </Card>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card>
            <CardHeader title="Durum" />
            <CardBody>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="od-muted">Lesson status</span>
                  <Badge tone={lesson.status === "COMPLETED" ? "ok" : lesson.status === "CANCELLED" ? "bad" : "teal"}>
                    {lesson.status}
                  </Badge>
                </div>
                {lesson.sessionGroupId ? (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="od-muted">Aynı seans</span>
                    <strong>{sessionPeers.length} öğrenci satırı</strong>
                  </div>
                ) : null}
                {lesson.seriesId ? (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="od-muted">Serisi</span>
                    <strong>{seriesPeersCount} satır</strong>
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="İşlemler" />
            <CardBody>
              <div style={{ display: "grid", gap: 10 }}>
                <form action={cancelLessonAction.bind(null, lesson.id)} style={{ display: "grid", gap: 6 }}>
                  {lesson.sessionGroupId ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <input type="checkbox" name="applyAll" /> Aynı seanstaki tüm öğrencilere uygula
                    </label>
                  ) : null}
                  {lesson.seriesId ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <input type="checkbox" name="applyAllSeries" /> Tüm seriyi iptal et
                    </label>
                  ) : null}
                  <button type="submit" className="od-btn" style={{ width: "100%" }}>
                    İptal et (status=CANCELLED)
                  </button>
                </form>

                <form action={deleteLessonAction.bind(null, lesson.id)} style={{ display: "grid", gap: 6 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                    <span>Silme kapsamı:</span>
                    <select name="scope" defaultValue="single" className="od-select">
                      <option value="single">Sadece bu satır</option>
                      {lesson.sessionGroupId ? <option value="session">Bu seansın tüm satırları</option> : null}
                      {lesson.seriesId ? <option value="series">Tüm serideki dersler</option> : null}
                    </select>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pd-bad)" }}>
                    <input type="checkbox" name="purge" />
                    Veritabanından kalıcı sil (tehlikeli — test verisi için)
                  </label>
                  <button type="submit" className="od-btn">
                    Sil
                  </button>
                  <small className="od-muted" style={{ fontSize: 11 }}>
                    İşaretsiz tıklarsanız soft-delete: ders <strong>CANCELLED</strong> olur ve bildirim atılır.
                  </small>
                </form>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {sessionPeers.length > 1 ? (
        <div style={{ marginTop: 16 }}>
          <Card>
            <CardHeader title={`Bu seanstaki diğer öğrenciler (${sessionPeers.length})`} />
            <CardBody>
              <table className="od-table">
                <thead><tr><th>Öğrenci</th><th>Durum</th><th></th></tr></thead>
                <tbody>
                  {sessionPeers.map((p) => (
                    <tr key={p.id}>
                      <td>{p.student.fullName}</td>
                      <td>
                        <Badge tone={p.status === "COMPLETED" ? "ok" : p.status === "CANCELLED" ? "bad" : "teal"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td>
                        {p.id !== lesson.id ? (
                          <Link href={`/panel/admin/ders-programi/${p.id}`} className="od-btn od-btn-ghost od-btn-sm">Aç</Link>
                        ) : <span className="od-muted">(şu an)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </>
  );
}
