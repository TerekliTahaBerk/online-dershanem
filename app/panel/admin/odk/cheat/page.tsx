import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { ExportButton } from "@/components/panel/ui/export-button";

export const metadata: Metadata = {
  title: "Cheat Logları · ODK Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminOdkCheatPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireOdkPanel("admin");
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [attempts, totals, eventCounts, totalCheatRows] = await Promise.all([
    prisma.odkExamAttempt.findMany({
      where: { cheatViolationCount: { gt: 0 } },
      orderBy: [{ cheatViolationCount: "desc" }, { lastEventAt: "desc" }],
      take: PAGE_SIZE,
      skip,
      select: {
        id: true,
        status: true,
        cheatViolationCount: true,
        tabSwitchCount: true,
        autoSubmitted: true,
        suspiciousScore: true,
        lastEventAt: true,
        startedAt: true,
        submittedAt: true,
        user: { select: { id: true, name: true, email: true } },
        exam: { select: { id: true, title: true, cadenceFamily: true } },
      },
    }),
    prisma.odkExamAttempt.aggregate({
      _sum: { cheatViolationCount: true, tabSwitchCount: true },
      _count: { _all: true },
      where: { cheatViolationCount: { gt: 0 } },
    }),
    prisma.odkExamAttemptEvent.groupBy({
      by: ["type"],
      _count: { _all: true },
      orderBy: { _count: { type: "desc" } },
      take: 10,
    }),
    prisma.odkExamAttempt.count({ where: { cheatViolationCount: { gt: 0 } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCheatRows / PAGE_SIZE));

  const fmt = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(d) : "—";

  return (
    <>
      <PageHeader
        title="Cheat Logları"
        subtitle="Sistem genelinde tüm denemelerdeki ihlal kayıtları"
        right={<ExportButton entity="odk-cheat" label="Excel" />}
      />

      <div className="od-kpi-grid">
        <KpiCard label="Şüpheli Oturum" value={totals._count._all} />
        <KpiCard label="Toplam İhlal" value={totals._sum.cheatViolationCount ?? 0} />
        <KpiCard label="Sekme Değişimi" value={totals._sum.tabSwitchCount ?? 0} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginTop: 16 }}>
        <Card>
          <CardHeader title="Olay türleri" subtitle="En yaygın 10 ihlal" />
          <CardBody>
            {eventCounts.length === 0 ? (
              <EmptyState title="Olay yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr><th>Tür</th><th>Sayı</th></tr>
                </thead>
                <tbody>
                  {eventCounts.map((e) => (
                    <tr key={e.type}>
                      <td><code style={{ fontSize: 11 }}>{e.type}</code></td>
                      <td className="od-mono">{e._count._all}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Şüpheli oturumlar" subtitle={`${attempts.length} kayıt — ihlal sayısına göre sıralı`} />
          <CardBody>
            {attempts.length === 0 ? (
              <EmptyState title="İhlal kaydı yok" description="Hiç sekme/fokus ihlali olmamış 🎉" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Deneme</th>
                    <th>İhlal</th>
                    <th>Sekme</th>
                    <th>Şüphe</th>
                    <th>Auto?</th>
                    <th>Son olay</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const sus = a.suspiciousScore ?? 0;
                    return (
                      <tr key={a.id}>
                        <td>
                          <strong style={{ fontSize: 12 }}>{a.user.name ?? "—"}</strong>
                          <div className="od-muted" style={{ fontSize: 11 }}>{a.user.email}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <Badge tone="neutral">{a.exam.cadenceFamily}</Badge> {a.exam.title}
                        </td>
                        <td>
                          <Badge tone={a.cheatViolationCount >= 5 ? "bad" : "warn"}>⚠ {a.cheatViolationCount}</Badge>
                        </td>
                        <td className="od-mono">{a.tabSwitchCount}</td>
                        <td>
                          <Badge tone={sus >= 0.7 ? "bad" : sus >= 0.4 ? "warn" : "neutral"}>
                            %{Math.round(sus * 100)}
                          </Badge>
                        </td>
                        <td>{a.autoSubmitted ? <Badge tone="bad">Evet</Badge> : <span className="od-muted">—</span>}</td>
                        <td className="od-muted" style={{ fontSize: 11 }}>{fmt(a.lastEventAt)}</td>
                        <td>
                          <Link href={`/panel/admin/odk/cozumler/${a.id}`} style={{ fontSize: 12 }}>Detay</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8 }}>
                <div className="od-muted" style={{ fontSize: 12 }}>
                  Sayfa {page} / {totalPages} · toplam {totalCheatRows} kayıt
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {page > 1 ? (
                    <Link className="od-btn od-btn-ghost od-btn-sm" href={`/panel/admin/odk/cheat?page=${page - 1}`}>
                      ← Önceki
                    </Link>
                  ) : null}
                  {page < totalPages ? (
                    <Link className="od-btn od-btn-ghost od-btn-sm" href={`/panel/admin/odk/cheat?page=${page + 1}`}>
                      Sonraki →
                    </Link>
                  ) : null}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
