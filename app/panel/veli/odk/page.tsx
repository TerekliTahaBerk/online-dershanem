import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireParentWithChildren } from "@/lib/odk/parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "ODK · Veli",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ParentOdkDashboard() {
  const { parentId, children, userIds } = await requireParentWithChildren();

  if (!parentId) {
    return (
      <>
        <PageHeader title="OnlineDenemeKulübü" subtitle="Veli profili eksik" />
        <Card><CardBody><EmptyState title="Veli kaydı bulunamadı" description="Lütfen okul yöneticinizle iletişime geçin." /></CardBody></Card>
      </>
    );
  }

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

  return (
    <>
      <PageHeader
        title="OnlineDenemeKulübü"
        subtitle="Çocuklarının deneme performansı"
      />

      {children.length === 0 ? (
        <Card><CardBody><EmptyState title="Bağlı çocuğun yok" description="Lütfen okul yöneticinizle iletişime geçin." /></CardBody></Card>
      ) : (
        <Card>
          <CardHeader title="Çocuklarım" subtitle={`${children.length} kayıt`} />
          <CardBody>
            <div className="od-grid g-2">
              {children.map((c) => {
                const stat = byUser.get(c.userId);
                const avg = stat && stat.netCount > 0 ? stat.netSum / stat.netCount : null;
                return (
                  <Link
                    key={c.studentId}
                    href={`/panel/veli/odk/cocuklarim/${c.userId}`}
                    style={{
                      display: "block",
                      padding: 16,
                      border: "1px solid var(--pd-line)",
                      borderRadius: 12,
                      background: "white",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <strong style={{ fontSize: 16 }}>{c.name ?? "—"}</strong>
                        <div className="od-muted" style={{ fontSize: 11 }}>{c.email}</div>
                      </div>
                      {c.relationship ? <Badge tone="neutral">{c.relationship}</Badge> : null}
                    </div>
                    <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 12px", fontSize: 12, margin: 0 }}>
                      <dt className="od-muted">Çözüm</dt>
                      <dd>{stat ? `${stat.submitted}/${stat.total}` : "0/0"}</dd>
                      <dt className="od-muted">Ortalama net</dt>
                      <dd><strong>{avg === null ? "—" : avg.toFixed(2)}</strong></dd>
                      <dt className="od-muted">İhlal</dt>
                      <dd>{stat?.violations ? `⚠ ${stat.violations}` : "—"}</dd>
                      <dt className="od-muted">Son</dt>
                      <dd>{stat?.lastAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(stat.lastAt) : "—"}</dd>
                    </dl>
                  </Link>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}
