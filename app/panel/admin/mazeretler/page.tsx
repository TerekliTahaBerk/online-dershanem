import Link from "next/link";

import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { requirePanelRole } from "@/lib/panel-access";
import { getExcusesForAdmin } from "@/lib/panel/absence-excuses";
import { AdminAbsenceExcusesTable } from "@/components/panel/absence-excuses/admin-absence-excuses-table";
import type { AbsenceExcuseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_VALUES: AbsenceExcuseStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const STATUS_LABEL: Record<AbsenceExcuseStatus, string> = {
  PENDING: "Beklemede",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal",
};

type SearchParams = {
  status?: string;
  from?: string;
  to?: string;
};

function parseStatus(value: string | undefined): AbsenceExcuseStatus | null {
  if (!value) return null;
  return (STATUS_VALUES as string[]).includes(value)
    ? (value as AbsenceExcuseStatus)
    : null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function AdminAbsenceExcusesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;

  const status = parseStatus(sp.status);
  const from = parseDate(sp.from);
  const to = parseDate(sp.to);

  const excuses = await getExcusesForAdmin({
    status,
    from,
    to,
    take: 200,
  });

  const counts = {
    pending: excuses.filter((e) => e.status === "PENDING").length,
    approved: excuses.filter((e) => e.status === "APPROVED").length,
    rejected: excuses.filter((e) => e.status === "REJECTED").length,
    cancelled: excuses.filter((e) => e.status === "CANCELLED").length,
  };

  return (
    <>
      <PageHeader
        title="Mazeretler"
        subtitle="Veli mazeret bildirimlerini incele ve karara bağla"
        breadcrumbs={[
          { label: "Yönetici Paneli", href: "/panel/admin" },
          { label: "Mazeretler" },
        ]}
        meta={
          <div className="od-row" style={{ gap: 6, flexWrap: "wrap" }}>
            <Badge tone="warn">{counts.pending} bekleyen</Badge>
            <Badge tone="ok">{counts.approved} onaylı</Badge>
            <Badge tone="bad">{counts.rejected} reddedilmiş</Badge>
            {counts.cancelled > 0 ? (
              <Badge tone="neutral">{counts.cancelled} iptal</Badge>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader title="Filtreler" />
        <CardBody>
          <form
            method="get"
            className="od-row"
            style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}
          >
            <label style={{ display: "grid", gap: 4, minWidth: 160 }}>
              <span className="od-muted" style={{ fontSize: 12 }}>
                Durum
              </span>
              <select
                name="status"
                defaultValue={sp.status ?? ""}
                className="od-input"
              >
                <option value="">Tümü</option>
                {STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span className="od-muted" style={{ fontSize: 12 }}>
                Başlangıç ≥
              </span>
              <input
                type="date"
                name="from"
                defaultValue={sp.from ?? ""}
                className="od-input"
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span className="od-muted" style={{ fontSize: 12 }}>
                Başlangıç ≤
              </span>
              <input
                type="date"
                name="to"
                defaultValue={sp.to ?? ""}
                className="od-input"
              />
            </label>
            <button type="submit" className="od-btn od-btn-primary od-btn-sm">
              Uygula
            </button>
            <Link
              href="/panel/admin/mazeretler"
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Sıfırla
            </Link>
          </form>
        </CardBody>
      </Card>

      <div style={{ marginTop: 12 }}>
        <Card>
          <CardHeader
            title="Bildirimler"
            subtitle={`${excuses.length} kayıt`}
          />
          <CardBody>
            <AdminAbsenceExcusesTable excuses={excuses} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
