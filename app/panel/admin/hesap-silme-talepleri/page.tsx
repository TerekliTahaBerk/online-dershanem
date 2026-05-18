import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  approveDeletionRequestAction,
  rejectDeletionRequestAction,
  processDeletionNowAction,
} from "@/app/panel/_shared/account-deletion-actions";

export const metadata: Metadata = {
  title: "Hesap silme talepleri · Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type SearchParams = { status?: string; page?: string };

const STATUS_FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "PENDING", label: "Bekleyen" },
  { key: "APPROVED", label: "Onaylı" },
  { key: "PROCESSED", label: "İşlenmiş" },
  { key: "REJECTED", label: "Reddedilen" },
  { key: "CANCELLED", label: "İptal" },
] as const;

const STATUS_TONE: Record<string, "warn" | "ok" | "bad" | "neutral"> = {
  PENDING: "warn",
  APPROVED: "warn",
  PROCESSED: "ok",
  REJECTED: "bad",
  CANCELLED: "neutral",
};

const fmt = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(d) : "—";

export default async function AdminAccountDeletionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requirePanelRole("admin");
  if (ctx.actualRole !== "ADMIN") {
    return <EmptyState title="Yetkisiz" />;
  }
  const sp = await searchParams;
  const status = sp.status && sp.status !== "all" ? sp.status : null;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;

  const where = status ? { status: status as any } : {};

  const [items, total, counts] = await Promise.all([
    prisma.accountDeletionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.accountDeletionRequest.count({ where }),
    prisma.accountDeletionRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByStatus = (s: string) =>
    counts.find((c) => c.status === s)?._count._all ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Hesap silme talepleri"
        subtitle="KVKK 11. madde — kullanıcı silme talepleri ve onay süreci"
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Bekleyen" value={String(countByStatus("PENDING"))} meta="onay bekliyor" />
        <KpiCard label="Onaylı" value={String(countByStatus("APPROVED"))} meta="cron işleyecek" />
        <KpiCard label="İşlenmiş" value={String(countByStatus("PROCESSED"))} meta="anonimleştirildi" />
        <KpiCard label="Red/İptal" value={String(countByStatus("REJECTED") + countByStatus("CANCELLED"))} meta="kapatıldı" />
      </div>

      <Card>
        <CardBody>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {STATUS_FILTERS.map((f) => {
              const active = (status ?? "all") === f.key;
              return (
                <Link
                  key={f.key}
                  href={`/panel/admin/hesap-silme-talepleri?status=${f.key}`}
                  className={`od-btn od-btn-sm ${active ? "od-btn-primary" : "od-btn-ghost"}`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="Talep yok"
              description="Filtrelere uygun talep bulunamadı."
              action={
                status ? (
                  <Link href="/panel/admin/hesap-silme-talepleri?status=all" className="od-btn od-btn-sm od-btn-ghost">
                    Tüm talepleri göster
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Sebep</th>
                  <th>Durum</th>
                  <th>Talep</th>
                  <th>Planlanan</th>
                  <th>İnceleyen</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const dueNow = r.scheduledFor.getTime() <= Date.now();
                  return (
                    <tr key={r.id}>
                      <td>
                        <div><strong>{r.user.name ?? "—"}</strong></div>
                        <div className="od-muted" style={{ fontSize: 12 }}>{r.user.email}</div>
                        <div className="od-muted" style={{ fontSize: 11 }}>{r.user.role}</div>
                      </td>
                      <td style={{ maxWidth: 240, fontSize: 12 }} className="od-muted">
                        {r.reason ?? "—"}
                      </td>
                      <td><Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge></td>
                      <td style={{ fontSize: 12 }}>{fmt(r.requestedAt)}</td>
                      <td style={{ fontSize: 12 }}>
                        {fmt(r.scheduledFor)}
                        {r.status === "APPROVED" && dueNow ? (
                          <div><Badge tone="warn">Süresi doldu</Badge></div>
                        ) : null}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {r.reviewedBy ? (
                          <>
                            <div>{r.reviewedBy.name ?? r.reviewedBy.email}</div>
                            <div className="od-muted" style={{ fontSize: 11 }}>{fmt(r.reviewedAt)}</div>
                            {r.reviewerNotes ? (
                              <div className="od-muted" style={{ fontSize: 11 }}>“{r.reviewerNotes}”</div>
                            ) : null}
                          </>
                        ) : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
                          {r.status === "PENDING" ? (
                            <>
                              <form action={approveDeletionRequestAction.bind(null, r.id)} style={{ display: "flex", gap: 4 }}>
                                <input name="notes" placeholder="Not (ops)" className="od-input" style={{ flex: 1, fontSize: 12 }} />
                                <button className="od-btn od-btn-sm od-btn-primary" type="submit">Onayla</button>
                              </form>
                              <form action={rejectDeletionRequestAction.bind(null, r.id)} style={{ display: "flex", gap: 4 }}>
                                <input name="notes" placeholder="Red sebebi" className="od-input" style={{ flex: 1, fontSize: 12 }} />
                                <button className="od-btn od-btn-sm" type="submit">Reddet</button>
                              </form>
                            </>
                          ) : null}
                          {r.status === "APPROVED" ? (
                            <form action={processDeletionNowAction.bind(null, r.id)}>
                              <button
                                className="od-btn od-btn-sm"
                                type="submit"
                                style={{ background: "#b91c1c", color: "white", borderColor: "#b91c1c" }}
                              >
                                {dueNow ? "Şimdi anonimleştir" : "Cooldown'u baypas et + sil"}
                              </button>
                            </form>
                          ) : null}
                          {r.status === "PROCESSED" || r.status === "REJECTED" || r.status === "CANCELLED" ? (
                            <span className="od-muted" style={{ fontSize: 12 }}>—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {totalPages > 1 ? (
            <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "center" }}>
              {Array.from({ length: Math.min(12, totalPages) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/panel/admin/hesap-silme-talepleri?status=${status ?? "all"}&page=${p}`}
                  className={`od-btn od-btn-sm ${p === page ? "od-btn-primary" : "od-btn-ghost"}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </>
  );
}
