import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacherWithScope } from "@/lib/odk/teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "Öğrenci Sonuçları · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TeacherOdkStudentsPage() {
  const { teacherId, studentIds, userIds } = await requireTeacherWithScope();

  if (!teacherId) {
    return (
      <>
        <PageHeader title="Öğrenci Sonuçları" />
        <Card><CardBody><EmptyState title="Öğretmen kaydı bulunamadı" /></CardBody></Card>
      </>
    );
  }

  const students = studentIds.length === 0
    ? []
    : await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { user: { name: "asc" } },
      });

  // toplu attempt verisini bir defada çekelim
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
      if (a.score !== null) {
        cur.netSum += Number(a.score);
        cur.netCount += 1;
      }
    }
    const t = a.submittedAt ?? a.startedAt;
    if (!cur.lastAt || t > cur.lastAt) cur.lastAt = t;
    byUser.set(a.userId, cur);
  }

  return (
    <>
      <PageHeader
        title="Öğrenci Sonuçları"
        subtitle={`${students.length} öğrenci · sınıflarının toplamı`}
        right={<Link href="/panel/ogretmen/odk" className="od-btn od-btn-ghost">ODK Ana Sayfa</Link>}
      />
      <Card>
        <CardHeader title="Öğrenciler" />
        <CardBody>
          {students.length === 0 ? (
            <EmptyState title="Henüz öğrencin yok" description="Sınıflarına atanan öğrenciler burada listelenir." />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Çözüm</th>
                  <th>Ortalama net</th>
                  <th>Toplam ihlal</th>
                  <th>Son aktivite</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const stat = s.user ? byUser.get(s.user.id) : undefined;
                  const avg = stat && stat.netCount > 0 ? stat.netSum / stat.netCount : null;
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.user?.name ?? "—"}</strong>
                        <div className="od-muted" style={{ fontSize: 11 }}>{s.user?.email}</div>
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
                      <td>
                        {s.user ? (
                          <Link href={`/panel/ogretmen/odk/ogrencilerim/${s.user.id}`}>Detay</Link>
                        ) : null}
                      </td>
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
