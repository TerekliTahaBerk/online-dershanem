import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { ExportButton } from "@/components/panel/ui/export-button";

export const metadata: Metadata = {
  title: "ODK Raporlar · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FAMILY_TONE: Record<string, "accent" | "purple" | "teal" | "neutral"> = {
  TYT: "accent",
  AYT: "purple",
  LGS: "teal",
};

export default async function AdminOdkReportsPage() {
  await requireOdkPanel("admin");

  // Deneme bazlı agregeler
  const exams = await prisma.odkExam.findMany({
    where: { status: { in: ["PUBLISHED", "ARCHIVED"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      cadenceFamily: true,
      classLevel: true,
      status: true,
      durationMinutes: true,
      _count: { select: { sections: true } },
      attempts: {
        where: { status: "SUBMITTED" },
        select: {
          score: true,
          correctCount: true,
          wrongCount: true,
          blankCount: true,
          cheatViolationCount: true,
          durationSeconds: true,
        },
      },
    },
  });

  const rows = exams.map((e) => {
    const n = e.attempts.length;
    if (n === 0) {
      return {
        id: e.id,
        title: e.title,
        family: e.cadenceFamily,
        classLevel: e.classLevel,
        status: e.status,
        attempts: 0,
        avgNet: null as number | null,
        avgCorrect: null as number | null,
        avgWrong: null as number | null,
        avgBlank: null as number | null,
        avgDurationMin: null as number | null,
        cheatTotal: 0,
      };
    }
    const sumScore = e.attempts.reduce((s, a) => s + (a.score ? Number(a.score) : 0), 0);
    const sumCorrect = e.attempts.reduce((s, a) => s + a.correctCount, 0);
    const sumWrong = e.attempts.reduce((s, a) => s + a.wrongCount, 0);
    const sumBlank = e.attempts.reduce((s, a) => s + a.blankCount, 0);
    const sumDur = e.attempts.reduce((s, a) => s + (a.durationSeconds ?? 0), 0);
    const cheatTotal = e.attempts.reduce((s, a) => s + a.cheatViolationCount, 0);
    return {
      id: e.id,
      title: e.title,
      family: e.cadenceFamily,
      classLevel: e.classLevel,
      status: e.status,
      attempts: n,
      avgNet: Math.round((sumScore / n) * 100) / 100,
      avgCorrect: Math.round((sumCorrect / n) * 10) / 10,
      avgWrong: Math.round((sumWrong / n) * 10) / 10,
      avgBlank: Math.round((sumBlank / n) * 10) / 10,
      avgDurationMin: Math.round(sumDur / n / 60),
      cheatTotal,
    };
  });

  const withData = rows.filter((r) => r.attempts > 0);
  const totalAttempts = withData.reduce((s, r) => s + r.attempts, 0);
  const overallAvgNet =
    withData.length === 0
      ? null
      : Math.round(
          (withData.reduce((s, r) => s + (r.avgNet ?? 0) * r.attempts, 0) / Math.max(1, totalAttempts)) * 100,
        ) / 100;

  // Sınav türü bazlı dağılım
  const familyAgg = new Map<string, { attempts: number; sumNet: number }>();
  for (const r of withData) {
    const cur = familyAgg.get(r.family) ?? { attempts: 0, sumNet: 0 };
    cur.attempts += r.attempts;
    cur.sumNet += (r.avgNet ?? 0) * r.attempts;
    familyAgg.set(r.family, cur);
  }
  const familyRows = Array.from(familyAgg.entries())
    .map(([family, v]) => ({ family, attempts: v.attempts, avgNet: Math.round((v.sumNet / Math.max(1, v.attempts)) * 100) / 100 }))
    .sort((a, b) => b.attempts - a.attempts);

  return (
    <>
      <PageHeader
        title="ODK Raporlar"
        subtitle={`${exams.length} deneme · ${totalAttempts} çözüm · genel net ortalaması ${overallAvgNet ?? "—"}`}
        right={<ExportButton entity="odk-raporlar" label="Excel" />}
      />

      {familyRows.length > 0 && (
        <Card>
          <CardHeader title="Sınav türü dağılımı" subtitle="TYT / AYT / LGS bazlı" />
          <CardBody>
            <table className="od-table">
              <thead>
                <tr><th>Tür</th><th>Çözüm</th><th>Ortalama Net</th></tr>
              </thead>
              <tbody>
                {familyRows.map((f) => (
                  <tr key={f.family}>
                    <td><Badge tone={FAMILY_TONE[f.family] ?? "neutral"}>{f.family}</Badge></td>
                    <td className="od-mono">{f.attempts}</td>
                    <td className="od-mono">{f.avgNet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <div style={{ marginTop: 16 }}>
        <Card>
          <CardHeader title="Deneme bazlı rapor" subtitle="Son 50 yayın denemesi · ortalamalar" />
          <CardBody>
            {rows.length === 0 ? (
              <EmptyState icon="report" title="Yayında deneme yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Deneme</th>
                    <th>Tür</th>
                    <th>Sınıf</th>
                    <th>Çözüm</th>
                    <th>Ort. Net</th>
                    <th>Ort. D / Y / B</th>
                    <th>Ort. Süre</th>
                    <th>Cheat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/panel/admin/odk/denemeler/${r.id}`} style={{ fontWeight: 600 }}>
                          {r.title}
                        </Link>
                      </td>
                      <td><Badge tone={FAMILY_TONE[r.family] ?? "neutral"}>{r.family}</Badge></td>
                      <td>{r.classLevel ?? "—"}</td>
                      <td className="od-mono">{r.attempts}</td>
                      <td className="od-mono">{r.avgNet ?? "—"}</td>
                      <td style={{ fontSize: 12 }}>
                        {r.attempts > 0 ? (
                          <>
                            <span style={{ color: "#16a34a" }}>{r.avgCorrect}</span>
                            {" / "}<span style={{ color: "#dc2626" }}>{r.avgWrong}</span>
                            {" / "}<span className="od-muted">{r.avgBlank}</span>
                          </>
                        ) : (
                          <span className="od-muted">—</span>
                        )}
                      </td>
                      <td className="od-mono">{r.avgDurationMin ? `${r.avgDurationMin} dk` : "—"}</td>
                      <td>
                        {r.cheatTotal > 0 ? (
                          <Badge tone={r.cheatTotal >= 10 ? "bad" : "warn"}>{r.cheatTotal}</Badge>
                        ) : (
                          <span className="od-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
