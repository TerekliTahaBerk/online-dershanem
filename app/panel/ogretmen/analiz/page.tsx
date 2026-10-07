import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  List,
  ListRow,
  PanelEmpty,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PropertyList,
  PropertyRow,
  Section,
  StatusBadge,
  buttonClass,
} from "@/components/panel/ui";
import { GidisatHero } from "@/components/panel/analiz";
import {
  loadTeacherGidisatOverview,
  formatPeriodRangeLabel,
} from "@/lib/progress-insights/server";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";

export const dynamic = "force-dynamic";

/**
 * ÖĞRETMEN · ANALİZ — grup gidişat özeti + düşen gidişat listesi.
 */
export default async function TeacherAnalizPage() {
  const session = await requireRole("TEACHER");
  const flags = getPanelFeatureFlags();
  if (!flags.progressInsights) notFound();

  const overview = await loadTeacherGidisatOverview({
    teacherUserId: session.userId,
    includeExams: true,
  });

  const fmtPct = (value: number | null) => (value === null ? "—" : `%${value}`);
  const fmtDelta = (value: number | null) => {
    if (value === null) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toLocaleString("tr-TR")}`;
  };

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle={PANEL_DOMAIN.analiz}
    >
      <div className="max-w-[1100px]">
        <GidisatHero
          title="Grup gidişatı"
          periodLabel={formatPeriodRangeLabel(overview.period)}
          sentences={overview.narrative}
        />

        {overview.studentCount === 0 ? (
          <PanelEmpty
            title="Kapsamda öğrenci yok."
            body="Aktif gruplarınıza öğrenci kaydı olduğunda gidişat özeti burada açılır."
          />
        ) : (
          <>
            {/* Sayı kutuları yerine özellik satırları (roadmap §5.4). */}
            <Section id="ortalamalar" title="Grup ortalamaları" description={`${overview.studentCount} öğrenci`}>
              <PropertyList>
                <PropertyRow label="Ortalama katılım">{fmtPct(overview.averages.attendancePercent)}</PropertyRow>
                <PropertyRow label="Ortalama çalışma">
                  {fmtPct(overview.averages.assignmentPercent)}
                  <span className="text-pn-text-muted"> · Aktif ödevler</span>
                </PropertyRow>
                <PropertyRow label="Ortalama plan">
                  {fmtPct(overview.averages.planPercent)}
                  <span className="text-pn-text-muted"> · Son haftalık plan</span>
                </PropertyRow>
                <PropertyRow label="Medyan net değişim">
                  {fmtDelta(overview.averages.medianNetDelta)}
                  <span className="text-pn-text-muted"> · Son deneme penceresi</span>
                </PropertyRow>
              </PropertyList>
            </Section>

            <Section
              id="dusen-gidisat"
              title="Düşen gidişat"
              description="Net gerileme veya düşük katılım / çalışma / plan sinyali olan öğrenciler."
            >
              {overview.declining.length === 0 ? (
                <p className="text-[14px] text-pn-text-muted">
                  Şu an düşen gidişat listesinde öğrenci yok.
                </p>
              ) : (
                <List label="Düşen gidişat">
                  {overview.declining.map((row) => (
                    <ListRow
                      key={row.studentId}
                      title={row.studentName}
                      description={[
                        row.classLevel,
                        row.attendancePercent !== null ? `katılım %${row.attendancePercent}` : null,
                        row.assignmentPercent !== null ? `çalışma %${row.assignmentPercent}` : null,
                        row.netDelta !== null ? `net ${fmtDelta(row.netDelta)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      status={row.riskHint ? <StatusBadge label={row.riskHint} tone="warning" /> : undefined}
                      action={
                        <Link href={row.href} className={buttonClass("secondary", "sm")}>
                          Öğrenci profili
                        </Link>
                      }
                    />
                  ))}
                </List>
              )}
            </Section>

            <Section id="tum-ogrenciler" title="Tüm öğrenciler">
              <PanelTable caption="Tüm öğrenciler" columns={["Öğrenci", "Katılım", "Çalışma", "Plan", "Net Δ", ""]}>
                {overview.rows.map((row) => (
                  <PanelTableRow key={row.studentId}>
                    <PanelTableCell>
                      <span className="font-medium text-pn-text">{row.studentName}</span>
                      {row.declining ? (
                        <span className="ml-2 inline-block align-middle">
                          <StatusBadge label="düşüş" tone="warning" />
                        </span>
                      ) : null}
                    </PanelTableCell>
                    <PanelTableCell>{fmtPct(row.attendancePercent)}</PanelTableCell>
                    <PanelTableCell>{fmtPct(row.assignmentPercent)}</PanelTableCell>
                    <PanelTableCell>{fmtPct(row.planPercent)}</PanelTableCell>
                    <PanelTableCell>{fmtDelta(row.netDelta)}</PanelTableCell>
                    <PanelTableCell>
                      <Link href={row.href} className={buttonClass("ghost", "sm")}>
                        Aç<span className="sr-only"> · {row.studentName}</span>
                      </Link>
                    </PanelTableCell>
                  </PanelTableRow>
                ))}
              </PanelTable>
            </Section>
          </>
        )}
      </div>
    </PanelShell>
  );
}
