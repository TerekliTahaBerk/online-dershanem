import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  cellToneForCount,
  riskLevelTone,
  type ClassRiskRow,
  type CellTone,
} from "@/lib/teacher-dashboard";

const TONE_TO_BADGE: Record<CellTone, "ok" | "warn" | "bad" | "neutral"> = {
  good: "ok", warn: "warn", bad: "bad", neutral: "neutral",
};

const RISK_LABEL: Record<string, string> = {
  good: "İyi", watch: "İzlemede", risk: "Riskli", unknown: "Veri yok",
};

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

type Props = { rows: ClassRiskRow[] };

/**
 * Class risk heatmap — one row per active student, dense risk dimensions
 * across columns. Horizontally scrollable on small screens via the wrapper
 * `overflow-x: auto`.
 */
export function ClassRiskHeatmap({ rows }: Props) {
  const counts = rows.reduce<{ risk: number; watch: number; good: number; unknown: number }>(
    (a, r) => { a[r.riskLevel]++; return a; },
    { risk: 0, watch: 0, good: 0, unknown: 0 },
  );

  return (
    <Card>
      <CardHeader
        title="Risk haritası"
        subtitle="Son 30 gün — devamsızlık, geç/erken, ödev"
        right={
          <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
            {counts.risk    > 0 ? <Badge tone="bad">{counts.risk} riskli</Badge> : null}
            {counts.watch   > 0 ? <Badge tone="warn">{counts.watch} izlemede</Badge> : null}
            {counts.good    > 0 ? <Badge tone="ok">{counts.good} iyi</Badge> : null}
            {counts.unknown > 0 ? <Badge tone="neutral">{counts.unknown} veri yok</Badge> : null}
          </div>
        }
      />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState icon="users" title="Sınıfta öğrenci yok." description="Sınıfa öğrenci eklendiğinde harita burada görünecek." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="od-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Öğrenci</th>
                  <th style={{ width: 110 }}>Durum</th>
                  <th style={{ width: 100 }}>Devamsız</th>
                  <th style={{ width: 110 }}>Geç / Erken</th>
                  <th style={{ width: 110 }}>Eksik ödev</th>
                  <th style={{ width: 110 }}>Puanlanma</th>
                  <th style={{ width: 100 }}>Ortalama</th>
                  <th style={{ width: 110 }}>Son işaret</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const overall = TONE_TO_BADGE[riskLevelTone(r.riskLevel)];
                  return (
                    <tr key={r.studentId}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 600 }}>{r.fullName}</span>
                          <span className="od-muted" style={{ fontSize: 11, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {r.classLevel ? <span>{r.classLevel}</span> : null}
                            {r.hasParentLink ? <span>· veli ✓</span> : <span style={{ color: "var(--pd-warn)" }}>· veli yok</span>}
                            {r.tags.slice(0, 2).map((t) => (
                              <span key={t.key} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "var(--pd-soft)" }}>
                                {t.label}
                              </span>
                            ))}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge tone={overall}>{RISK_LABEL[r.riskLevel]}</Badge>
                      </td>
                      <Cell count={r.counts.absences} suffix={r.counts.absences > 0 ? "devamsız" : ""} />
                      <Cell count={r.counts.latesOrLeftEarly} suffix={r.counts.latesOrLeftEarly > 0 ? "geç/erken" : ""} />
                      <Cell count={r.counts.missingHomework} suffix={r.counts.missingHomework > 0 ? "eksik" : ""} />
                      <td>
                        {r.gradedPct == null
                          ? <span className="od-muted">—</span>
                          : <Badge tone={r.gradedPct >= 80 ? "ok" : r.gradedPct >= 50 ? "warn" : "bad"}>%{r.gradedPct}</Badge>}
                      </td>
                      <td className="od-mono">{r.avgScore == null ? <span className="od-muted">—</span> : r.avgScore}</td>
                      <td className="od-muted od-mono" style={{ fontSize: 12 }}>
                        {r.lastActivityAt ? DATE_FMT.format(r.lastActivityAt) : "—"}
                      </td>
                      <td>
                        <Link
                          href={`/panel/ogretmen/ogrencilerim?student=${r.studentId}`}
                          className="od-btn od-btn-ghost od-btn-sm"
                        >
                          Profil →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Cell({ count, suffix }: { count: number; suffix: string }) {
  const tone = TONE_TO_BADGE[cellToneForCount(count)];
  if (count === 0) {
    return <td><Badge tone="neutral">0</Badge></td>;
  }
  return (
    <td>
      <Badge tone={tone}>{count}{suffix ? ` ${suffix}` : ""}</Badge>
    </td>
  );
}
