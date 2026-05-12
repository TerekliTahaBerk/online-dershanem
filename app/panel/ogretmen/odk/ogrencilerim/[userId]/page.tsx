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
  title: "Öğrenci Detay · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userIds } = await requireTeacherWithScope();
  const { userId } = await params;
  if (!userIds.includes(userId)) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) notFound();

  const attempts = await prisma.odkExamAttempt.findMany({
    where: { userId },
    orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      durationSeconds: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      cheatViolationCount: true,
      autoSubmitted: true,
      exam: { select: { id: true, title: true, cadenceFamily: true } },
    },
  });

  const submitted = attempts.filter((a) => a.status === "SUBMITTED");
  const avgNet = submitted.length === 0
    ? null
    : submitted.reduce((a, x) => a + Number(x.score ?? 0), 0) / submitted.length;
  const totalViol = attempts.reduce((a, x) => a + x.cheatViolationCount, 0);

  return (
    <>
      <PageHeader
        title={user.name ?? user.email ?? "Öğrenci"}
        subtitle={user.email ?? ""}
        right={<Link href="/panel/ogretmen/odk/ogrencilerim" className="od-btn od-btn-ghost">Listeye dön</Link>}
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <Kpi label="Toplam çözüm" value={String(attempts.length)} />
        <Kpi label="Tamamlanan" value={String(submitted.length)} />
        <Kpi label="Ortalama net" value={avgNet === null ? "—" : avgNet.toFixed(2)} />
        <Kpi label="Toplam ihlal" value={String(totalViol)} />
      </div>

      <Card>
        <CardHeader title="Tüm denemeler" />
        <CardBody>
          {attempts.length === 0 ? (
            <EmptyState title="Henüz çözümü yok" />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Deneme</th>
                  <th>Durum</th>
                  <th>D / Y / B</th>
                  <th>Net</th>
                  <th>İhlal</th>
                  <th>Tarih</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.exam.title}</strong>
                      <div className="od-muted" style={{ fontSize: 11 }}>{a.exam.cadenceFamily}</div>
                    </td>
                    <td>
                      {a.status === "SUBMITTED" ? (
                        <Badge tone={a.autoSubmitted ? "warn" : "ok"}>{a.autoSubmitted ? "Otomatik" : "Tamamlandı"}</Badge>
                      ) : (
                        <Badge tone="accent">Devam</Badge>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <span style={{ color: "#16a34a" }}>{a.correctCount}</span>
                      {" / "}<span style={{ color: "#dc2626" }}>{a.wrongCount}</span>
                      {" / "}<span className="od-muted">{a.blankCount}</span>
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid var(--pd-line)" }}>
      <div className="od-muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
