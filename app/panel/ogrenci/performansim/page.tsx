import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/panel-student";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Sparkline } from "@/components/panel/charts/sparkline";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function StudentPerformance() {
  const { student } = await requireStudent();
  if (!student) return <Card><EmptyState icon="user" title="Öğrenci profili yok" /></Card>;
  const results = await prisma.studentExamResult.findMany({
    where: { studentId: student.id }, orderBy: { takenAt: "desc" }, take: 50,
  });
  const nets = results.slice().reverse().map((r) => Number(r.net ?? 0));
  const last = results[0];
  const best = results.reduce((m, r) => (Number(r.net ?? 0) > Number(m?.net ?? 0) ? r : m), results[0]);
  return (
    <>
      <PageHeader title="Performansım" subtitle={`${results.length} deneme`} />
      <div className="od-grid g-3" style={{ marginBottom: 16 }}>
        <KpiCard label="Son net" value={last?.net?.toString() ?? "—"} meta={last?.title ?? "—"} spark={nets.length ? <Sparkline data={nets} /> : undefined} />
        <KpiCard label="En iyi net" value={best?.net?.toString() ?? "—"} meta={best?.title ?? "—"} />
        <KpiCard label="Toplam deneme" value={results.length} />
      </div>
      <Card>
        <table className="od-table">
          <thead><tr><th>Başlık</th><th>Tür</th><th>Net</th><th>Doğru/Yanlış/Boş</th><th>Tarih</th></tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.assessmentType}</td>
                <td className="od-mono">{r.net?.toString() ?? "—"}</td>
                <td className="od-mono">{r.correctCount}/{r.wrongCount}/{r.blankCount}</td>
                <td className="od-mono od-muted">{new Intl.DateTimeFormat("tr-TR").format(r.takenAt)}</td>
              </tr>
            ))}
            {results.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: "center" }} className="od-muted">Henüz deneme sonucu yok.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
