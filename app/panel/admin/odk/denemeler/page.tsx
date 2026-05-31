import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { getOdkAdminExamList } from "@/lib/panel/odk-admin";
import {
  getOdkCadenceLabel,
  getReadinessLabel,
  getReadinessTone,
} from "@/lib/panel/odk-admin-display";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { ExportButton } from "@/components/panel/ui/export-button";
import { OdkAdminExamStatusBadge } from "@/components/panel/odk/admin/odk-admin-exam-status-badge";
import type { OdkExamCadenceFamily, OdkExamStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "ODK Denemeler · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: Array<{ value: "ALL" | OdkExamStatus; label: string }> = [
  { value: "ALL", label: "Tümü" },
  { value: "DRAFT", label: "Taslak" },
  { value: "PUBLISHED", label: "Yayında" },
  { value: "ARCHIVED", label: "Arşiv" },
];

const FAMILY_TONE: Record<string, "accent" | "purple" | "teal" | "neutral"> = {
  TYT: "accent",
  AYT: "purple",
  LGS: "teal",
  KPSS: "neutral",
  ALES: "neutral",
};

function parseStatus(raw: string | undefined): "ALL" | OdkExamStatus {
  if (raw === "DRAFT" || raw === "PUBLISHED" || raw === "ARCHIVED") return raw;
  return "ALL";
}

function parseCadence(raw: string | undefined): "ALL" | OdkExamCadenceFamily {
  if (raw === "TYT" || raw === "AYT" || raw === "LGS" || raw === "KPSS" || raw === "ALES") {
    return raw;
  }
  return "ALL";
}

export default async function AdminOdkExamsList({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOdkPanel("admin");

  const sp = (await searchParams) ?? {};
  const status = parseStatus(typeof sp.status === "string" ? sp.status : undefined);
  const cadence = parseCadence(typeof sp.cadence === "string" ? sp.cadence : undefined);
  const search = typeof sp.q === "string" ? sp.q.trim() : "";

  const exams = await getOdkAdminExamList({
    status,
    cadence,
    search: search || null,
    limit: 200,
  });

  const filtersActive = status !== "ALL" || cadence !== "ALL" || search.length > 0;

  return (
    <>
      <PageHeader
        title="ODK Denemeler"
        subtitle={`Toplam ${exams.length} deneme${filtersActive ? " (filtreli)" : ""} · TYT / AYT / LGS dijital sınav yönetimi`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <ExportButton entity="odk-denemeler" label="Excel" />
            <Link href="/panel/admin/odk/denemeler/yeni" className="od-btn od-btn-primary">
              Yeni deneme
            </Link>
          </div>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <CardBody>
          <form
            method="GET"
            style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
          >
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Başlık veya slug ara…"
              className="od-input"
              style={{ flex: "1 1 220px", minWidth: 180 }}
            />
            <select name="status" defaultValue={status} className="od-input" style={{ flex: "0 0 auto" }}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select name="cadence" defaultValue={cadence} className="od-input" style={{ flex: "0 0 auto" }}>
              <option value="ALL">Tüm türler</option>
              <option value="TYT">TYT</option>
              <option value="AYT">AYT</option>
              <option value="LGS">LGS</option>
              <option value="KPSS">KPSS</option>
              <option value="ALES">ALES</option>
            </select>
            <button type="submit" className="od-btn od-btn-ghost">Filtrele</button>
            {filtersActive ? (
              <Link href="/panel/admin/odk/denemeler" className="od-btn od-btn-ghost">
                Temizle
              </Link>
            ) : null}
          </form>
        </CardBody>
      </Card>

      {exams.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="report"
              title={filtersActive ? "Filtreyle eşleşen deneme yok" : "Henüz deneme yok"}
              description={
                filtersActive
                  ? "Aramayı genişletin veya filtreleri temizleyin."
                  : "Sağ üstteki “Yeni deneme” butonuyla ilk denemenizi oluşturun."
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <table className="od-table">
            <thead>
              <tr>
                <th>Deneme</th>
                <th>Tür</th>
                <th>Sınıf</th>
                <th>Süre</th>
                <th>Bölüm</th>
                <th>Çözüm</th>
                <th>Hazırlık</th>
                <th>Durum</th>
                <th>Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/panel/admin/odk/denemeler/${e.id}`} style={{ fontWeight: 600 }}>
                      {e.title}
                    </Link>
                    <div className="od-mono od-muted" style={{ fontSize: 11 }}>{e.slug}</div>
                  </td>
                  <td>
                    <Badge tone={FAMILY_TONE[e.cadenceFamily] ?? "neutral"}>
                      {getOdkCadenceLabel(e.cadenceFamily)}
                    </Badge>
                  </td>
                  <td>{e.classLevel ?? "—"}</td>
                  <td>{e.durationMinutes} dk</td>
                  <td>{e.sectionCount}</td>
                  <td>{e.attemptCount}</td>
                  <td>
                    <Badge tone={getReadinessTone(e.readiness.overall)}>
                      {getReadinessLabel(e.readiness.overall)}
                    </Badge>
                  </td>
                  <td><OdkAdminExamStatusBadge status={e.status} /></td>
                  <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                    {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(e.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
