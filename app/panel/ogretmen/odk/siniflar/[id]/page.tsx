import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTeacherWithScope } from "@/lib/odk/teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "Sınıf Detay · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TeacherClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { classroomIds } = await requireTeacherWithScope();
  const { id } = await params;
  if (!classroomIds.includes(id)) notFound();

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      branch: true,
      level: true,
      students: {
        where: { leftAt: null },
        select: {
          student: {
            select: {
              id: true,
              userId: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });
  if (!classroom) notFound();

  const userIds = classroom.students
    .map((s) => s.student.user?.id)
    .filter((u): u is string => Boolean(u));

  const attempts = userIds.length === 0
    ? []
    : await prisma.odkExamAttempt.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          status: true,
          score: true,
          cheatViolationCount: true,
          startedAt: true,
          submittedAt: true,
        },
      });

  const byUser = new Map<string, { total: number; submitted: number; netSum: number; netCount: number; violations: number; lastAt: Date | null }>();
  for (const a of attempts) {
    const cur = byUser.get(a.userId) ?? { total: 0, submitted: 0, netSum: 0, netCount: 0, violations: 0, lastAt: null };
    cur.total += 1;
    cur.violations += a.cheatViolationCount;
    if (a.status === "SUBMITTED") {
      cur.submitted += 1;
      if (a.score !== null) { cur.netSum += Number(a.score); cur.netCount += 1; }
    }
    const t = a.submittedAt ?? a.startedAt;
    if (!cur.lastAt || t > cur.lastAt) cur.lastAt = t;
    byUser.set(a.userId, cur);
  }

  const totalNet = Array.from(byUser.values()).reduce((a, x) => a + x.netSum, 0);
  const totalNetCount = Array.from(byUser.values()).reduce((a, x) => a + x.netCount, 0);
  const classAvg = totalNetCount > 0 ? totalNet / totalNetCount : null;
  const totalAttempts = Array.from(byUser.values()).reduce((a, x) => a + x.total, 0);
  const totalViolations = Array.from(byUser.values()).reduce((a, x) => a + x.violations, 0);

  return (
    <>
      <PageHeader
        title={`${classroom.name}${classroom.branch ? ` · ${classroom.branch}` : ""}`}
        subtitle={`${classroom.students.length} öğrenci · ${classroom.level}`}
        right={<Link href="/panel/ogretmen/odk/siniflar" className="od-btn od-btn-ghost">Sınıflara dön</Link>}
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <Kpi label="Öğrenci" value={String(classroom.students.length)} />
        <Kpi label="Toplam çözüm" value={String(totalAttempts)} />
        <Kpi label="Sınıf ortalaması" value={classAvg === null ? "—" : classAvg.toFixed(2)} />
        <Kpi label="Toplam ihlal" value={String(totalViolations)} />
      </div>

      <Card>
        <CardHeader title="Öğrenci performansı" />
        <CardBody>
          {classroom.students.length === 0 ? (
            <EmptyState title="Sınıfta öğrenci yok" />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Çözüm</th>
                  <th>Ortalama net</th>
                  <th>İhlal</th>
                  <th>Son aktivite</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classroom.students.map((cs) => {
                  const u = cs.student.user;
                  const stat = u ? byUser.get(u.id) : undefined;
                  const avg = stat && stat.netCount > 0 ? stat.netSum / stat.netCount : null;
                  return (
                    <tr key={cs.student.id}>
                      <td>
                        <strong>{u?.name ?? "—"}</strong>
                        <div className="od-muted" style={{ fontSize: 11 }}>{u?.email}</div>
                      </td>
                      <td>{stat ? `${stat.submitted}/${stat.total}` : "0/0"}</td>
                      <td><strong>{avg === null ? "—" : avg.toFixed(2)}</strong></td>
                      <td>
                        {stat && stat.violations > 0
                          ? <Badge tone={stat.violations >= 10 ? "bad" : "warn"}>⚠ {stat.violations}</Badge>
                          : <span className="od-muted">—</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {stat?.lastAt
                          ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(stat.lastAt)
                          : <span className="od-muted">—</span>}
                      </td>
                      <td>{u ? <Link href={`/panel/ogretmen/odk/ogrencilerim/${u.id}`}>Detay</Link> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid var(--pd-line)" }}>
      <div className="od-muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
