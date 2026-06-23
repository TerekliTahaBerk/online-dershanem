import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { OdkPaymentStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "ODK Ödemeleri · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtTRY = (c: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(c / 100);

type StatusFilter = OdkPaymentStatus | "ALL";
function parseStatus(raw: string | undefined): StatusFilter {
  if (raw === "PENDING" || raw === "SUCCEEDED" || raw === "FAILED" || raw === "REFUNDED")
    return raw;
  return "ALL";
}

const TONE: Record<OdkPaymentStatus, "ok" | "warn" | "bad" | "neutral"> = {
  SUCCEEDED: "ok",
  PENDING: "warn",
  FAILED: "bad",
  REFUNDED: "neutral",
};

export default async function OdkPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireOdkPanel("admin");
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const q = sp.q?.trim() || "";

  const where: Record<string, unknown> = {};
  if (status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { providerRef: { contains: q, mode: "insensitive" } },
      { order: { user: { name: { contains: q, mode: "insensitive" } } } },
      { order: { user: { email: { contains: q, mode: "insensitive" } } } },
      { order: { package: { title: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [payments, kpis] = await Promise.all([
    prisma.odkPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        order: {
          include: {
            user: { select: { name: true, email: true } },
            package: { select: { title: true } },
          },
        },
      },
    }),
    prisma.odkPayment.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
  ]);

  const cnt = (s: OdkPaymentStatus) =>
    kpis.find((k) => k.status === s)?._count._all ?? 0;
  const sum = (s: OdkPaymentStatus) =>
    kpis.find((k) => k.status === s)?._sum.amountCents ?? 0;

  const filterHref = (s: StatusFilter) => {
    const p = new URLSearchParams();
    if (s !== "ALL") p.set("status", s);
    if (q) p.set("q", q);
    return "?" + p.toString();
  };

  return (
    <>
      <PageHeader
        title="ODK Ödemeleri"
        subtitle="OnlineDenemeKulübü ödeme yönetimi"
        right={<Badge tone="purple">ODK</Badge>}
      />

      <div className="od-grid g-4" style={{ marginBottom: 12 }}>
        <KpiCard label="Bekleyen" value={String(cnt("PENDING"))} meta={fmtTRY(sum("PENDING"))} />
        <KpiCard label="Başarılı" value={String(cnt("SUCCEEDED"))} meta={fmtTRY(sum("SUCCEEDED"))} />
        <KpiCard label="Başarısız" value={String(cnt("FAILED"))} meta={fmtTRY(sum("FAILED"))} />
        <KpiCard label="İade" value={String(cnt("REFUNDED"))} meta={fmtTRY(sum("REFUNDED"))} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["ALL", "PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] as const).map((s) => (
          <Link
            key={s}
            href={filterHref(s)}
            className={"od-btn od-btn-sm " + (status === s ? "od-btn-primary" : "od-btn-ghost")}
          >
            {s === "ALL"
              ? "Tümü"
              : s === "PENDING"
              ? "Bekleyen"
              : s === "SUCCEEDED"
              ? "Başarılı"
              : s === "FAILED"
              ? "Başarısız"
              : "İade"}
          </Link>
        ))}
      </div>

      <Card>
        {payments.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="folder"
              title="Bu filtreye uygun ödeme yok"
              description="Filtreyi değiştirin veya ilk ödemenin gelmesini bekleyin."
            />
          </div>
        ) : (
          <table className="od-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Ödeme ID</th>
                <th>Kullanıcı</th>
                <th>Paket</th>
                <th>Tutar</th>
                <th>Provider</th>
                <th>Provider Ref</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="od-mono od-muted">
                    {new Intl.DateTimeFormat("tr-TR").format(p.createdAt)}
                  </td>
                  <td className="od-mono" style={{ fontSize: 11 }}>{p.id.slice(0, 10)}…</td>
                  <td>
                    <div>{p.order.user?.name ?? "(guest — hesap açılacak)"}</div>
                    <div className="od-muted" style={{ fontSize: 11 }}>
                      {p.order.user?.email ?? "—"}
                    </div>
                  </td>
                  <td>{p.order.package.title}</td>
                  <td className="od-mono">{fmtTRY(p.amountCents)}</td>
                  <td>{p.provider}</td>
                  <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                    {p.providerRef ?? "—"}
                  </td>
                  <td>
                    <Badge tone={TONE[p.status]}>{p.status}</Badge>
                  </td>
                  <td>
                    <Link
                      href={`/panel/admin/odk/odemeler/${p.id}`}
                      className="od-btn od-btn-ghost od-btn-sm"
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
