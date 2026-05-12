import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireParentWithChildren } from "@/lib/odk/parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Net Gelişimi · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ParentChildProgress({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userIds, children } = await requireParentWithChildren();
  const { userId } = await params;
  if (!userIds.includes(userId)) notFound();
  const child = children.find((c) => c.userId === userId);

  const attempts = await prisma.odkExamAttempt.findMany({
    where: { userId, status: "SUBMITTED" },
    orderBy: { submittedAt: "asc" },
    take: 30,
    select: {
      id: true,
      submittedAt: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      exam: { select: { title: true, cadenceFamily: true } },
    },
  });

  const max = attempts.reduce((m, a) => Math.max(m, Number(a.score ?? 0)), 0);

  return (
    <>
      <PageHeader
        title={`${child?.name ?? "Çocuk"} · Net Gelişimi`}
        subtitle="Tamamlanmış denemelerin kronolojik trendi (en fazla 30)"
        right={<Link href={`/panel/veli/odk/cocuklarim/${userId}`} className="od-btn od-btn-ghost">Çocuğa dön</Link>}
      />

      <Card>
        <CardHeader title="Net trendi" />
        <CardBody>
          {attempts.length === 0 ? (
            <EmptyState title="Tamamlanmış denemesi yok" />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 200, padding: "16px 0", borderBottom: "1px solid var(--pd-line)", marginBottom: 16 }}>
                {attempts.map((a) => {
                  const score = Number(a.score ?? 0);
                  const h = max > 0 ? Math.max(4, (score / max) * 180) : 4;
                  return (
                    <div
                      key={a.id}
                      title={`${a.exam.title}: ${score.toFixed(2)}`}
                      style={{
                        flex: 1,
                        height: h,
                        background: "linear-gradient(to top, var(--pd-accent), var(--pd-accent-strong))",
                        borderRadius: "3px 3px 0 0",
                        minWidth: 8,
                      }}
                    />
                  );
                })}
              </div>
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Deneme</th>
                    <th>D / Y / B</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {[...attempts].reverse().map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontSize: 12 }}>
                        {a.submittedAt
                          ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(a.submittedAt)
                          : "—"}
                      </td>
                      <td>
                        <strong>{a.exam.title}</strong>
                        <div className="od-muted" style={{ fontSize: 11 }}>{a.exam.cadenceFamily}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span style={{ color: "#16a34a" }}>{a.correctCount}</span>
                        {" / "}<span style={{ color: "#dc2626" }}>{a.wrongCount}</span>
                        {" / "}<span className="od-muted">{a.blankCount}</span>
                      </td>
                      <td><strong>{Number(a.score ?? 0).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}
