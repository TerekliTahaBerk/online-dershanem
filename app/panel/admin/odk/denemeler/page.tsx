import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { getOdkAdminExamList } from "@/lib/panel/odk-admin";
import {
  getOdkCadenceLabel,
  getReadinessLabel,
} from "@/lib/panel/odk-admin-display";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { ExportButton } from "@/components/panel/ui/export-button";
import { OdkAdminExamStatusBadge } from "@/components/panel/odk/admin/odk-admin-exam-status-badge";
import {
  ExamBoardCard,
  adminStatusLabel,
  adminStatusTone,
  cadenceTone,
  readinessTone,
} from "@/components/panel/odk/exam-board-card";
import type { OdkExamCadenceFamily, OdkExamStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "ODK Denemeler · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: Array<{ value: "ALL" | OdkExamStatus; label: string }> = [
  { value: "ALL", label: "Tümü" },
  { value: "PUBLISHED", label: "Yayında" },
  { value: "DRAFT", label: "Taslak" },
  { value: "ARCHIVED", label: "Arşiv" },
];

const CADENCES: Array<"ALL" | OdkExamCadenceFamily> = [
  "ALL", "TYT", "AYT", "LGS", "KPSS", "ALES",
];

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

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

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

  const link = (next: Partial<{ status: typeof status; cadence: typeof cadence; q: string }>): string => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const c = next.cadence ?? cadence;
    const q = next.q ?? search;
    if (s !== "ALL") params.set("status", s);
    if (c !== "ALL") params.set("cadence", c);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `?${qs}` : "/panel/admin/odk/denemeler";
  };

  const grouped: Record<OdkExamStatus, typeof exams> = {
    PUBLISHED: [],
    DRAFT: [],
    ARCHIVED: [],
  };
  for (const e of exams) grouped[e.status].push(e);
  const showGroups = status === "ALL";
  const groupOrder: OdkExamStatus[] = ["PUBLISHED", "DRAFT", "ARCHIVED"];

  function renderCard(e: typeof exams[number]) {
    const meta: Array<{ icon?: string; label: string }> = [
      { icon: "⏱", label: `${e.durationMinutes} dk` },
      { icon: "📚", label: `${e.sectionCount} bölüm` },
      { icon: "✏️", label: `${e.totalQuestionCount} soru` },
      { icon: "🏷", label: `${e.accessTagCount} erişim` },
    ];
    if (e.classLevel != null) meta.unshift({ icon: "��", label: `${e.classLevel}. sınıf` });
    return (
      <ExamBoardCard
        key={e.id}
        href={`/panel/admin/odk/denemeler/${e.id}`}
        eyebrow={
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span
              className={`soft-pill is-${cadenceTone(e.cadenceFamily)}`}
              style={{ fontSize: 10, padding: "1px 7px" }}
            >
              {getOdkCadenceLabel(e.cadenceFamily)}
            </span>
          </span>
        }
        title={e.title}
        slug={e.slug}
        statusLabel={adminStatusLabel(e.status)}
        tone={adminStatusTone(e.status)}
        readiness={{
          label: getReadinessLabel(e.readiness.overall),
          tone: readinessTone(e.readiness.overall),
        }}
        meta={meta}
        footnote={
          e.publishedAt
            ? `Yayın: ${dateFmt.format(e.publishedAt)} · ${e.attemptCount} deneme`
            : `Oluşturulma: ${dateFmt.format(e.createdAt)} · ${e.attemptCount} deneme`
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "ODK", href: "/panel/admin/odk" },
          { label: "Denemeler" },
        ]}
        title="ODK Denemeleri"
        subtitle="TYT / AYT / LGS dijital denemelerinizi yönetin, hazırlık durumunu izleyin ve yayınlayın."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ExportButton entity="odk-denemeler" label="Excel" />
            <Link href="/panel/admin/odk/denemeler/yeni" className="od-btn dark sm">
              + Yeni deneme
            </Link>
          </div>
        }
      />

      <div className="od-exam-toolbar">
        <div className="od-segmented" role="tablist" aria-label="Durum">
          {STATUS_OPTIONS.map((o) => (
            <Link
              key={o.value}
              href={link({ status: o.value })}
              className={"od-segmented-item" + (status === o.value ? " is-active" : "")}
              role="tab"
              aria-selected={status === o.value}
            >
              {o.label}
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="group" aria-label="Tür">
          {CADENCES.map((c) => (
            <Link
              key={c}
              href={link({ cadence: c })}
              className={"od-qchip" + (cadence === c ? " is-active" : "")}
            >
              {c === "ALL" ? "Tüm türler" : c}
            </Link>
          ))}
        </div>
        <span className="od-exam-toolbar-spacer" />
        <form method="GET" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {status !== "ALL" ? <input type="hidden" name="status" value={status} /> : null}
          {cadence !== "ALL" ? <input type="hidden" name="cadence" value={cadence} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Başlık veya slug ara…"
            className="od-input"
            style={{ width: 220 }}
          />
          <button type="submit" className="od-btn sm">Filtrele</button>
          {filtersActive ? (
            <Link href="/panel/admin/odk/denemeler" className="od-btn ghost sm">Temizle</Link>
          ) : null}
        </form>
      </div>

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
      ) : showGroups ? (
        <>
          {groupOrder.map((g) =>
            grouped[g].length === 0 ? null : (
              <section key={g}>
                <h2 className="od-exam-board-title">
                  {adminStatusLabel(g)}
                  <span className="od-exam-board-title-count">{grouped[g].length}</span>
                </h2>
                <div className="od-exam-grid">{grouped[g].map(renderCard)}</div>
              </section>
            )
          )}
        </>
      ) : (
        <div className="od-exam-grid">{exams.map(renderCard)}</div>
      )}

      <details className="od-week-list-disclosure" style={{ marginTop: 18 }}>
        <summary>Detaylı liste — {exams.length} deneme</summary>
        {exams.length === 0 ? (
          <div style={{ padding: 24, color: "var(--pd-muted)", fontSize: 13 }}>—</div>
        ) : (
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
                    <Badge tone="neutral">{getOdkCadenceLabel(e.cadenceFamily)}</Badge>
                  </td>
                  <td>{e.classLevel ?? "—"}</td>
                  <td>{e.durationMinutes} dk</td>
                  <td>{e.sectionCount}</td>
                  <td>{e.attemptCount}</td>
                  <td>
                    <Badge tone={e.readiness.overall === "ok" ? "ok" : e.readiness.overall === "warn" ? "warn" : "bad"}>
                      {getReadinessLabel(e.readiness.overall)}
                    </Badge>
                  </td>
                  <td><OdkAdminExamStatusBadge status={e.status} /></td>
                  <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                    {dateFmt.format(e.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </>
  );
}
