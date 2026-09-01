import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmpty, PanelStatCard, PanelCard, PanelCardTitle } from "@/components/panel/ui";
import { GidisatHero } from "@/components/panel/analiz";
import { loadTeacherGidisatOverview, formatPeriodRangeLabel } from "@/lib/progress-insights/server";
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
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <PanelStatCard
                title="Ortalama katılım"
                value={fmtPct(overview.averages.attendancePercent)}
                note={`${overview.studentCount} öğrenci`}
              />
              <PanelStatCard
                title="Ortalama çalışma"
                value={fmtPct(overview.averages.assignmentPercent)}
                note="Aktif ödevler"
              />
              <PanelStatCard
                title="Ortalama plan"
                value={fmtPct(overview.averages.planPercent)}
                note="Son haftalık plan"
              />
              <PanelStatCard
                title="Medyan net değişim"
                value={fmtDelta(overview.averages.medianNetDelta)}
                note="Son deneme penceresi"
              />
            </section>

            <section className="mt-8" aria-labelledby="dusen-gidisat">
              <h2 id="dusen-gidisat" className="text-[15px] font-extrabold text-dc-ink">
                Düşen gidişat
              </h2>
              <p className="mt-1 text-[13px] text-dc-ink-muted">
                Net gerileme veya düşük katılım / çalışma / plan sinyali olan öğrenciler.
              </p>

              {overview.declining.length === 0 ? (
                <p className="mt-4 text-[14px] text-dc-ink-muted">
                  Şu an düşen gidişat listesinde öğrenci yok.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {overview.declining.map((row) => (
                    <li key={row.studentId}>
                      <PanelCard>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <PanelCardTitle>{row.studentName}</PanelCardTitle>
                            <p className="mt-1 text-[13px] text-dc-ink-muted">
                              {[
                                row.classLevel,
                                row.attendancePercent !== null
                                  ? `katılım %${row.attendancePercent}`
                                  : null,
                                row.assignmentPercent !== null
                                  ? `çalışma %${row.assignmentPercent}`
                                  : null,
                                row.netDelta !== null
                                  ? `net ${fmtDelta(row.netDelta)}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {row.riskHint ? (
                              <p className="mt-1 text-[12px] text-amber-800">{row.riskHint}</p>
                            ) : null}
                          </div>
                          <Link
                            href={row.href}
                            className="text-[13px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
                          >
                            Öğrenci 360 →
                          </Link>
                        </div>
                      </PanelCard>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-8" aria-labelledby="tum-ogrenciler">
              <h2 id="tum-ogrenciler" className="text-[15px] font-extrabold text-dc-ink">
                Tüm öğrenciler
              </h2>
              <div className="mt-4 overflow-x-auto rounded-[14px] border border-dc-line-soft bg-white">
                <table className="min-w-full text-left text-[13px]">
                  <thead className="border-b border-dc-line-soft text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">
                    <tr>
                      <th className="px-4 py-3">Öğrenci</th>
                      <th className="px-4 py-3">Katılım</th>
                      <th className="px-4 py-3">Çalışma</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Net Δ</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {overview.rows.map((row) => (
                      <tr key={row.studentId} className="border-b border-dc-line-soft last:border-0">
                        <td className="px-4 py-3 font-medium text-dc-ink">
                          {row.studentName}
                          {row.declining ? (
                            <span className="ml-2 text-[11px] font-bold text-amber-700">
                              düşüş
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-dc-ink-body">
                          {fmtPct(row.attendancePercent)}
                        </td>
                        <td className="px-4 py-3 text-dc-ink-body">
                          {fmtPct(row.assignmentPercent)}
                        </td>
                        <td className="px-4 py-3 text-dc-ink-body">{fmtPct(row.planPercent)}</td>
                        <td className="px-4 py-3 text-dc-ink-body">{fmtDelta(row.netDelta)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={row.href}
                            className="font-bold text-dc-brand-strong hover:text-dc-brand-hover"
                          >
                            Aç
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </PanelShell>
  );
}
