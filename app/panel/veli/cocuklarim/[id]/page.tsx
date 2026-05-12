import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireParent } from "@/lib/panel-parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function ParentChildDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { parent } = await requireParent();
  if (!parent) notFound();
  const link = parent.students.find((x) => x.studentId === id);
  if (!link) notFound();

  const student = link.student;
  const since30 = new Date(Date.now() - 30 * 86400000);

  const [submissions, attendance, exams, comments] = await Promise.all([
    prisma.assignmentSubmission.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { assignment: { select: { title: true, dueAt: true } } },
    }),
    prisma.attendance.findMany({
      where: { studentId: id, sessionDate: { gte: since30 } },
      orderBy: { sessionDate: "desc" },
      take: 30,
    }),
    prisma.studentExamResult.findMany({
      where: { studentId: id },
      orderBy: { takenAt: "desc" },
      take: 10,
    }),
    prisma.teacherComment.findMany({
      where: { studentId: id, visibleToParent: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { teacher: { select: { fullName: true } } },
    }),
  ]);

  const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
  const absentCount = attendance.filter((a) => a.status === "ABSENT").length;
  const lateCount = attendance.filter((a) => a.status === "LATE").length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;
  const lastNet = exams[0]?.net?.toString() ?? "—";
  const gradedCount = submissions.filter((s) => s.status === "GRADED").length;
  const pendingCount = submissions.filter((s) => s.status === "PENDING").length;

  return (
    <>
      <PageHeader title={student.fullName} subtitle={`${student.classLevel ?? "—"} · ${student.examType ?? "—"}`} />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="30 gün devam" value={attendancePct != null ? `%${attendancePct}` : "—"} meta={`${attendance.length} kayıt`} />
        <KpiCard label="Devamsız / Geç" value={`${absentCount} / ${lateCount}`} meta="Son 30 gün" />
        <KpiCard label="Son net" value={lastNet} meta={exams[0]?.title ?? "Deneme yok"} />
        <KpiCard label="Ödev" value={`${gradedCount} ✓ / ${pendingCount} ⏳`} meta={`Son ${submissions.length} ödev`} />
      </div>

      <Card>
        <CardHeader title="Genel bilgiler" />
        <CardBody>
          <div className="od-grid g-2" style={{ gap: 12, fontSize: 13 }}>
            <div><span className="od-muted">Telefon: </span><span className="od-mono">{student.phone}</span></div>
            <div><span className="od-muted">Şehir / İlçe: </span>{student.city ?? "—"} / {student.district ?? "—"}</div>
            <div><span className="od-muted">Okul: </span>{student.schoolName ?? "—"}</div>
            <div><span className="od-muted">Hedef: </span>{student.targetGoal ?? "—"}</div>
            <div><span className="od-muted">Hedef okul: </span>{student.targetSchool ?? "—"}</div>
            <div><span className="od-muted">Yakınlık: </span>{link.relationship ?? "—"} {link.isPrimary ? <Badge tone="accent">Birincil</Badge> : null}</div>
          </div>
        </CardBody>
      </Card>

      <CardHeader title="Son denemeler" />
      <Card>
        {exams.length === 0 ? (
          <EmptyState icon="trending-up" title="Deneme kaydı yok" />
        ) : (
          <table className="od-table">
            <thead><tr><th>Tarih</th><th>Sınav</th><th>Net</th><th>Doğru/Yanlış/Boş</th></tr></thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.takenAt).toLocaleDateString("tr-TR")}</td>
                  <td>{e.title}</td>
                  <td className="od-mono">{e.net?.toString() ?? "—"}</td>
                  <td className="od-mono">{e.correctCount} / {e.wrongCount} / {e.blankCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CardHeader title="Son ödevler" />
      <Card>
        {submissions.length === 0 ? (
          <EmptyState icon="clipboard-list" title="Ödev kaydı yok" />
        ) : (
          <table className="od-table">
            <thead><tr><th>Ödev</th><th>Durum</th><th>Puan</th><th>Geri bildirim</th></tr></thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>{s.assignment.title}</td>
                  <td><Badge tone={s.status === "GRADED" ? "ok" : s.status === "PENDING" ? "warn" : "accent"}>{s.status}</Badge></td>
                  <td className="od-mono">{s.score?.toString() ?? "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.feedback ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CardHeader title="Devam (son 30 gün)" />
      <Card>
        {attendance.length === 0 ? (
          <EmptyState icon="calendar-check" title="Devam kaydı yok" />
        ) : (
          <div style={{ padding: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {attendance.map((a) => (
              <span key={a.id} title={`${new Date(a.sessionDate).toLocaleDateString("tr-TR")} · ${a.status}`}>
                <Badge tone={a.status === "PRESENT" ? "ok" : a.status === "ABSENT" ? "bad" : a.status === "LATE" ? "warn" : "accent"}>
                  {new Date(a.sessionDate).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                </Badge>
              </span>
            ))}
          </div>
        )}
      </Card>

      <CardHeader title="Öğretmen yorumları" />
      <Card>
        {comments.length === 0 ? (
          <EmptyState icon="message-circle" title="Veliye açık yorum yok" />
        ) : (
          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ borderLeft: "3px solid var(--brand)", paddingLeft: 10 }}>
                <div style={{ fontSize: 13 }}>{c.content}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {c.teacher?.fullName ?? "—"} · {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
