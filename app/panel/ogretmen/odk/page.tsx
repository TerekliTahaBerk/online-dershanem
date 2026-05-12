import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacherWithScope } from "@/lib/odk/teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "ODK · Öğretmen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TeacherOdkDashboard() {
  const { teacherId, classroomIds, studentIds, userIds } = await requireTeacherWithScope();

  if (!teacherId) {
    return (
      <>
        <PageHeader title="OnlineDenemeKulübü" subtitle="Öğretmen profili eksik" />
        <Card><CardBody><EmptyState title="Öğretmen kaydı bulunamadı" description="Lütfen yöneticinizle iletişime geçin." /></CardBody></Card>
      </>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const hasStudents = userIds.length > 0;
  const totalAttempts = hasStudents
    ? await prisma.odkExamAttempt.count({ where: { userId: { in: userIds } } })
    : 0;
  const weekAttempts = hasStudents
    ? await prisma.odkExamAttempt.count({ where: { userId: { in: userIds }, startedAt: { gte: since } } })
    : 0;
  const recent = hasStudents
    ? await prisma.odkExamAttempt.findMany({
        where: { userId: { in: userIds } },
        orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
        take: 10,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          startedAt: true,
          score: true,
          cheatViolationCount: true,
          user: { select: { name: true, email: true } },
          exam: { select: { id: true, title: true } },
        },
      })
    : [];

  const submitted = hasStudents
    ? await prisma.odkExamAttempt.findMany({
        where: { userId: { in: userIds }, status: "SUBMITTED" },
        select: { score: true },
      })
    : [];
  const avgNet = submitted.length === 0
    ? null
    : submitted.reduce((a, x) => a + Number(x.score ?? 0), 0) / submitted.length;

  return (
    <>
      <PageHeader
        title="OnlineDenemeKulübü"
        subtitle="Öğrencilerinin sınav performansı ve sınıf analizi"
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <Kpi label="Sınıflarım" value={String(classroomIds.length)} />
        <Kpi label="Öğrencim" value={String(studentIds.length)} />
        <Kpi label="Toplam çözüm" value={String(totalAttempts)} hint={`Son 7 gün: ${weekAttempts}`} />
        <Kpi label="Ortalama net" value={avgNet === null ? "—" : avgNet.toFixed(2)} />
      </div>

      <Card>
        <CardHeader title="Son çözümler" subtitle="Öğrencilerinin son ODK aktiviteleri" />
        <CardBody>
          {recent.length === 0 ? (
            <EmptyState title="Henüz çözüm yok" description="Öğrencilerin deneme çözmeye başladığında burada görünecek." />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Deneme</th>
                  <th>Durum</th>
                  <th>Net</th>
                  <th>İhlal</th>
                  <th>Tarih</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.user.name ?? "—"}</strong>
                      <div className="od-muted" style={{ fontSize: 11 }}>{a.user.email}</div>
                    </td>
                    <td>{a.exam.title}</td>
                    <td>
                      {a.status === "SUBMITTED"
                        ? <Badge tone="ok">Tamamlandı</Badge>
                        : <Badge tone="accent">Devam</Badge>}
                    </td>
                    <td><strong>{a.score ? Number(a.score).toFixed(2) : "—"}</strong></td>
                    <td>
                      {a.cheatViolationCount > 0
                        ? <Badge tone={a.cheatViolationCount >= 5 ? "bad" : "warn"}>⚠ {a.cheatViolationCount}</Badge>
                        : <span className="od-muted">—</span>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(a.submittedAt ?? a.startedAt)}
                    </td>
                    <td>
                      {a.status === "SUBMITTED" ? (
                        <Link href={`/panel/ogretmen/odk/cozum/${a.id}`}>Detay</Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid var(--pd-line)" }}>
      <div className="od-muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {hint ? <div className="od-muted" style={{ fontSize: 11, marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}
