import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { AccessService } from "@prisma/client";
import { deleteEntryAction } from "./_actions";

export const dynamic = "force-dynamic";

const fmt = (kurus: number) =>
  "₺" + (kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 });

type ServiceFilter = "OD" | "ODK" | "ALL";

function parseService(raw: string | undefined): ServiceFilter {
  if (raw === "OD" || raw === "ODK" || raw === "ALL") return raw;
  return "ALL";
}

function serviceLabel(s: ServiceFilter): string {
  if (s === "OD") return "OnlineDershanem";
  if (s === "ODK") return "OnlineDenemeKulübü";
  return "Tüm ürünler";
}

function serviceTone(s: AccessService): "teal" | "purple" {
  return s === "ODK" ? "purple" : "teal";
}

export default async function AdminAccounting({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; service?: string; type?: string }>;
}) {
  // Yetki: SADECE admin (öğretmen/öğrenci/veli erişemez)
  await requirePanelRole("admin");

  const sp = await searchParams;
  const service = parseService(sp.service);
  const typeFilter = sp.type === "INCOME" || sp.type === "EXPENSE" ? sp.type : null;
  const q = sp.q?.trim() || "";

  const since = new Date(Date.now() - 30 * 86400000);

  // Service filtre — ALL ise koşul ekleme. Where alanlarını dinamik birleştiriyoruz.
  // Not: Prisma'nın AccountingEntryWhereInput tipi `service` alanı için generate
  // edilmiş olmalı (migration 0020). Pylance cache stale olabilir; tsc temizdir.
  const baseWhere: Record<string, unknown> = {};
  if (service !== "ALL") baseWhere.service = service;
  if (typeFilter) baseWhere.type = typeFilter;
  if (q) baseWhere.description = { contains: q, mode: "insensitive" };

  const periodWhere: Record<string, unknown> = { occurredAt: { gte: since } };
  if (service !== "ALL") periodWhere.service = service;

  // Bekleyen / gecikmiş — ODK için OdkOrder.totalCents kullanılır.
  // OD tarafında PurchaseIntent'te tutar yok → sadece adet sayılır.
  const [
    income,
    expense,
    odkPendingTotal,
    odkOverdueCount,
    odPendingCount,
    entries,
  ] = await Promise.all([
    prisma.accountingEntry.aggregate({
      _sum: { amount: true },
      where: { ...periodWhere, type: "INCOME" },
    }),
    prisma.accountingEntry.aggregate({
      _sum: { amount: true },
      where: { ...periodWhere, type: "EXPENSE" },
    }),
    service === "OD"
      ? Promise.resolve({ _sum: { totalCents: 0 as number | null } })
      : prisma.odkOrder.aggregate({
          _sum: { totalCents: true },
          where: { status: "PENDING" },
        }),
    service === "OD"
      ? Promise.resolve(0)
      : prisma.odkOrder.count({
          // "Gecikmiş" = 30+ gün önce oluşturulup hâlâ PENDING
          where: {
            status: "PENDING",
            createdAt: { lt: new Date(Date.now() - 30 * 86400000) },
          },
        }),
    service === "ODK"
      ? Promise.resolve(0)
      : prisma.purchaseIntent.count({ where: { status: "PENDING" } }),
    prisma.accountingEntry.findMany({
      where: baseWhere,
      orderBy: { occurredAt: "desc" },
      take: 200,
      include: {
        student: { select: { fullName: true } },
        teacher: { select: { fullName: true } },
        package: { select: { name: true } },
      },
    }),
  ]);

  const inc = income._sum.amount ?? 0;
  const exp = expense._sum.amount ?? 0;
  const odkPending = odkPendingTotal._sum.totalCents ?? 0;

  // Filter switcher linkleri (mevcut q/type parametrelerini koru)
  const filterHref = (s: ServiceFilter) => {
    const p = new URLSearchParams();
    p.set("service", s);
    if (q) p.set("q", q);
    if (typeFilter) p.set("type", typeFilter);
    return "?" + p.toString();
  };
  const typeHref = (t: "ALL" | "INCOME" | "EXPENSE") => {
    const p = new URLSearchParams();
    p.set("service", service);
    if (q) p.set("q", q);
    if (t !== "ALL") p.set("type", t);
    return "?" + p.toString();
  };
  const activeType = typeFilter ?? "ALL";

  return (
    <>
      <PageHeader
        title="Muhasebe"
        subtitle={serviceLabel(service) + " · Son 30 gün KPI"}
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SearchInput placeholder="Açıklama ara…" />
            <ExportButton entity="muhasebe" />
            <Link
              href={"/panel/admin/muhasebe/yeni?service=" + (service === "ALL" ? "OD" : service)}
              className="od-btn od-btn-primary od-btn-sm"
            >
              + Yeni kayıt
            </Link>
          </div>
        }
      />

      {/* Service + tip filter switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {(["OD", "ODK", "ALL"] as const).map((s) => (
          <Link
            key={s}
            href={filterHref(s)}
            className={"od-btn od-btn-sm " + (service === s ? "od-btn-primary" : "od-btn-ghost")}
          >
            {s === "OD" ? "OnlineDershanem" : s === "ODK" ? "OnlineDenemeKulübü" : "Tümü"}
          </Link>
        ))}
        <span style={{ width: 1, height: 22, background: "var(--pd-line)", margin: "0 4px" }} />
        {(["ALL", "INCOME", "EXPENSE"] as const).map((t) => (
          <Link
            key={t}
            href={typeHref(t)}
            className={"od-btn od-btn-sm " + (activeType === t ? "od-btn-primary" : "od-btn-ghost")}
          >
            {t === "ALL" ? "Tüm tipler" : t === "INCOME" ? "Sadece gelir" : "Sadece gider"}
          </Link>
        ))}
      </div>

      <div className="od-grid g-3" style={{ marginBottom: 12 }}>
        <KpiCard label="Gelir (30 gün)" value={fmt(inc)} meta="INCOME" />
        <KpiCard label="Gider (30 gün)" value={fmt(exp)} meta="EXPENSE" />
        <KpiCard label="Net" value={fmt(inc - exp)} meta="Gelir − Gider" />
      </div>
      <div className="od-grid g-3" style={{ marginBottom: 16 }}>
        <KpiCard
          label="Bekleyen ödeme (ODK)"
          value={fmt(odkPending)}
          meta="OdkOrder PENDING"
        />
        <KpiCard
          label="Gecikmiş sipariş (ODK)"
          value={String(odkOverdueCount)}
          meta="30+ gündür PENDING"
        />
        <KpiCard
          label="Bekleyen başvuru (OD)"
          value={String(odPendingCount)}
          meta="PurchaseIntent PENDING"
        />
      </div>

      <Card>
        {entries.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              title="Bu filtreye uygun kayıt yok"
              description={
                service === "ALL"
                  ? "Henüz hiç muhasebe kaydı yok. + Yeni kayıt ile başlayın."
                  : "Bu ürün için bu aralıkta kayıt yok. Filtreyi değiştirin veya yeni kayıt ekleyin."
              }
            />
          </div>
        ) : (
          <table className="od-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Ürün</th>
                <th>Tip</th>
                <th>Kategori</th>
                <th>Tutar</th>
                <th>Açıklama</th>
                <th>İlgili</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                // Pylance stale cache: AccountingEntry.service mevcut ama tip cache'i eski.
                // Runtime'da hep dolu (default OD). Güvenli erişim için narrow cast.
                const row = e as typeof e & { service: AccessService };
                return (
                  <tr key={e.id}>
                    <td className="od-mono od-muted">
                      {new Intl.DateTimeFormat("tr-TR").format(e.occurredAt)}
                    </td>
                    <td>
                      <Badge tone={serviceTone(row.service)}>{row.service}</Badge>
                    </td>
                    <td>
                      <Badge tone={e.type === "INCOME" ? "ok" : "bad"}>{e.type}</Badge>
                    </td>
                    <td className="od-muted">{e.category}</td>
                    <td className="od-mono">{fmt(e.amount)}</td>
                    <td>{e.description ?? "—"}</td>
                    <td className="od-muted">
                      {e.student?.fullName ?? e.teacher?.fullName ?? e.package?.name ?? "—"}
                    </td>
                    <td>
                      <form action={deleteEntryAction.bind(null, e.id)} style={{ display: "inline" }}>
                        <button
                          type="submit"
                          className="od-btn od-btn-ghost od-btn-sm"
                          style={{ color: "var(--pd-bad)" }}
                        >
                          Sil
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
