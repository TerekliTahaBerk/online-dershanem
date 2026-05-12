import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacherWithScope } from "@/lib/odk/teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "Cheat Logları · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TeacherOdkCheatLogPage() {
  const { teacherId, userIds } = await requireTeacherWithScope();
  if (!teacherId) {
    return (
      <>
        <PageHeader title="Cheat Logları" />
        <Card><CardBody><EmptyState title="Öğretmen kaydı bulunamadı" /></CardBody></Card>
      </>
    );
  }

  const attempts = userIds.length === 0
    ? []
    : await prisma.odkExamAttempt.findMany({
        where: { userId: { in: userIds }, cheatViolationCount: { gt: 0 } },
        orderBy: [{ cheatViolationCount: "desc" }, { lastEventAt: "desc" }],
        take: 100,
        select: {
          id: true,
          status: true,
          cheatViolationCount: true,
          autoSubmitted: true,
          lastEventAt: true,
          startedAt: true,
          submittedAt: true,
          user: { select: { id: true, name: true, email: true } },
          exam: { select: { id: true, title: true } },
        },
      });

  return (
    <>
      <PageHeader
        title="Cheat Logları"
        subtitle="Öğrencilerinin ihlal kayıtları (en yüksekten düşüğe)"
      />
      <Card>
        <CardHeader title={`${attempts.length} kayıt`} />
        <CardBody>
          {attempts.length === 0 ? (
            <EmptyState title="İhlal kaydı yok" description="Öğrencilerin temiz çözüyor 🎉" />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Deneme</th>
                  <th>İhlal</th>
                  <th>Otomatik?</th>
                  <th>Son olay</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.user.name ?? "—"}</strong>
                      <div className="od-muted" style={{ fontSize: 11 }}>{a.user.email}</div>
                    </td>
                    <td>{a.exam.title}</td>
                    <td>
                      <Badge tone={a.cheatViolationCount >= 5 ? "bad" : "warn"}>⚠ {a.cheatViolationCount}</Badge>
                    </td>
                    <td>
                      {a.autoSubmitted ? <Badge tone="bad">Evet</Badge> : <span className="od-muted">—</span>}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {a.lastEventAt
                        ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(a.lastEventAt)
                        : <span className="od-muted">—</span>}
                    </td>
                    <td>
                      {a.status === "SUBMITTED"
                        ? <Link href={`/panel/ogretmen/odk/cozum/${a.id}`}>Detay</Link>
                        : null}
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
