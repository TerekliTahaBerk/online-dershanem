import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "ODK · Öğrenci",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudentOdkDashboard() {
  const ctx = await requireOdkPanel("ogrenci");

  const [recentAttempts, inProgress, eligibleCount] = await Promise.all([
    prisma.odkExamAttempt.findMany({
      where: { userId: ctx.userId, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: {
        id: true, score: true, submittedAt: true,
        correctCount: true, wrongCount: true, blankCount: true,
        exam: { select: { title: true, cadenceFamily: true } },
      },
    }),
    prisma.odkExamAttempt.findFirst({
      where: { userId: ctx.userId, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
      select: { id: true, exam: { select: { title: true } }, startedAt: true },
    }),
    countEligibleExams(ctx.userId, ctx.actualRole),
  ]);

  const avgNet = recentAttempts.length === 0
    ? null
    : recentAttempts.reduce((a, x) => a + Number(x.score ?? 0), 0) / recentAttempts.length;

  return (
    <>
      <PageHeader
        title="OnlineDenemeKulübü"
        subtitle="Denemelerini çöz, performansını takip et"
        right={
          <Link href="/panel/ogrenci/odk/denemeler" className="od-btn od-btn-primary">
            Denemeleri gör
          </Link>
        }
      />

      {inProgress ? (
        <Card>
          <CardBody>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <Badge tone="warn">Devam ediyor</Badge>
                <strong style={{ marginLeft: 10 }}>{inProgress.exam.title}</strong>
              </div>
              <Link href={`/panel/ogrenci/odk/cozum/${inProgress.id}`} className="od-btn od-btn-primary">
                Devam et
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="od-grid g-3" style={{ marginTop: 16 }}>
        <Kpi label="Erişebileceğin deneme" value={String(eligibleCount)} />
        <Kpi label="Tamamladığın deneme" value={String(recentAttempts.length)} />
        <Kpi label="Son 5 ortalama net" value={avgNet === null ? "—" : avgNet.toFixed(2)} />
      </div>

      <Card style={{ marginTop: 16 }}>
        <CardHeader title="Son denemeler" />
        <CardBody>
          {recentAttempts.length === 0 ? (
            <EmptyState title="Henüz tamamlanmış deneme yok" description="İlk denemeni çözünce burada görüneceksin." />
          ) : (
            <table className="od-table">
              <thead>
                <tr><th>Deneme</th><th>Tarih</th><th>D / Y / B</th><th>Net</th><th></th></tr>
              </thead>
              <tbody>
                {recentAttempts.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.exam.title}</strong></td>
                    <td>{a.submittedAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(a.submittedAt) : "—"}</td>
                    <td>{a.correctCount} / {a.wrongCount} / {a.blankCount}</td>
                    <td><strong>{a.score ? Number(a.score).toFixed(2) : "—"}</strong></td>
                    <td><Link href={`/panel/ogrenci/odk/sonuc/${a.id}`}>Detay</Link></td>
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

async function countEligibleExams(userId: string, role: string): Promise<number> {
  if (role === "ADMIN") {
    return prisma.odkExam.count({ where: { status: "PUBLISHED" } });
  }
  const tagIds = (await prisma.odkUserAccessTag.findMany({
    where: {
      userId, revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      accessTag: { isActive: true, service: "ODK" },
    },
    select: { accessTagId: true },
  })).map((t) => t.accessTagId);
  if (tagIds.length === 0) return 0;
  return prisma.odkExam.count({
    where: {
      status: "PUBLISHED",
      examAccessTags: { some: { accessTagId: { in: tagIds } } },
    },
  });
}
