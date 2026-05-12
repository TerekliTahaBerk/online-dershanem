import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { ExportButton } from "@/components/panel/ui/export-button";

export const metadata: Metadata = {
  title: "Kazanım Analizi · ODK Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Agg = {
  lesson: string;
  code: string;
  outcome: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

export default async function AdminOdkOutcomesPage() {
  await requireOdkPanel("admin");

  // Sistem genelinde tüm submitted attempt'lerden kazanım agregesi
  const [attempts, totalUsers, totalAttempts] = await Promise.all([
    prisma.odkExamAttempt.findMany({
      where: { status: "SUBMITTED" },
      take: 2000,
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        examId: true,
        opticalAnswers: { select: { sectionId: true, questionNumber: true, selectedOption: true } },
      },
    }),
    prisma.odkExamAttempt.findMany({
      where: { status: "SUBMITTED" },
      distinct: ["userId"],
      select: { userId: true },
      take: 5000,
    }),
    prisma.odkExamAttempt.count({ where: { status: "SUBMITTED" } }),
  ]);

  if (attempts.length === 0) {
    return (
      <>
        <PageHeader title="Kazanım Analizi" subtitle="Sistem geneli kazanım performansı" />
        <Card>
          <CardBody>
            <EmptyState
              icon="chart"
              title="Yeterli veri yok"
              description="Henüz tamamlanmış deneme bulunmuyor."
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const examIds = Array.from(new Set(attempts.map((a) => a.examId)));
  const sections = await prisma.odkExamSection.findMany({
    where: { examId: { in: examIds } },
    select: { id: true },
  });
  const officials = await prisma.odkExamOfficialAnswer.findMany({
    where: { sectionId: { in: sections.map((s) => s.id) } },
    select: {
      sectionId: true,
      questionNumber: true,
      correctOption: true,
      lesson: true,
      learningOutcomeCode: true,
      learningOutcome: true,
    },
  });

  const offMap = new Map<string, { correct: string; lesson: string | null; code: string | null; outcome: string | null }>();
  for (const o of officials) {
    offMap.set(`${o.sectionId}:${o.questionNumber}`, {
      correct: o.correctOption,
      lesson: o.lesson,
      code: o.learningOutcomeCode,
      outcome: o.learningOutcome,
    });
  }

  const aggMap = new Map<string, Agg>();
  for (const a of attempts) {
    for (const o of a.opticalAnswers) {
      const off = offMap.get(`${o.sectionId}:${o.questionNumber}`);
      if (!off || !off.code) continue;
      const key = `${off.lesson ?? "—"}::${off.code}`;
      const cur = aggMap.get(key) ?? {
        lesson: off.lesson ?? "—",
        code: off.code,
        outcome: off.outcome ?? "",
        total: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
      };
      cur.total += 1;
      if (!o.selectedOption) cur.blank += 1;
      else if (o.selectedOption === off.correct) cur.correct += 1;
      else cur.wrong += 1;
      aggMap.set(key, cur);
    }
  }

  const all = Array.from(aggMap.values()).filter((r) => r.total >= 3);
  const weak = [...all]
    .map((r) => ({ ...r, errorRate: (r.wrong + r.blank) / r.total }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 30);
  const strong = [...all]
    .map((r) => ({ ...r, successRate: r.correct / r.total }))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 30);

  return (
    <>
      <PageHeader
        title="Kazanım Analizi"
        subtitle="Sistem genelinde tüm denemelerden agrege kazanım performansı"
        right={<ExportButton entity="odk-kazanim" label="Excel" />}
      />

      <div className="od-kpi-grid">
        <KpiCard label="Toplam Çözüm" value={totalAttempts} meta="Submit edilen oturumlar" />
        <KpiCard label="Aktif Çözücü" value={totalUsers.length} meta="Distinct öğrenci" />
        <KpiCard label="Analiz Edilen Kazanım" value={all.length} meta="≥3 kez denenmiş" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Card>
          <CardHeader title="En problemli kazanımlar" subtitle="En yüksek hata oranı (yanlış+boş)/toplam" />
          <CardBody>
            {weak.length === 0 ? (
              <EmptyState title="Veri yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr><th>Ders</th><th>Kod</th><th>Kazanım</th><th>D/Y/B</th><th>Hata</th></tr>
                </thead>
                <tbody>
                  {weak.map((r) => {
                    const pct = Math.round(r.errorRate * 100);
                    return (
                      <tr key={`w-${r.lesson}-${r.code}`}>
                        <td><strong>{r.lesson}</strong></td>
                        <td><code style={{ fontSize: 11 }}>{r.code}</code></td>
                        <td style={{ fontSize: 12 }}>{r.outcome || "—"}</td>
                        <td style={{ fontSize: 12 }}>
                          <span style={{ color: "#16a34a" }}>{r.correct}</span>
                          {" / "}<span style={{ color: "#dc2626" }}>{r.wrong}</span>
                          {" / "}<span className="od-muted">{r.blank}</span>
                        </td>
                        <td><Badge tone={pct >= 60 ? "bad" : pct >= 35 ? "warn" : "ok"}>%{pct}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="En başarılı kazanımlar" subtitle="En yüksek doğru oranı" />
          <CardBody>
            {strong.length === 0 ? (
              <EmptyState title="Veri yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr><th>Ders</th><th>Kod</th><th>Kazanım</th><th>D/Y/B</th><th>Başarı</th></tr>
                </thead>
                <tbody>
                  {strong.map((r) => {
                    const pct = Math.round(r.successRate * 100);
                    return (
                      <tr key={`s-${r.lesson}-${r.code}`}>
                        <td><strong>{r.lesson}</strong></td>
                        <td><code style={{ fontSize: 11 }}>{r.code}</code></td>
                        <td style={{ fontSize: 12 }}>{r.outcome || "—"}</td>
                        <td style={{ fontSize: 12 }}>
                          <span style={{ color: "#16a34a" }}>{r.correct}</span>
                          {" / "}<span style={{ color: "#dc2626" }}>{r.wrong}</span>
                          {" / "}<span className="od-muted">{r.blank}</span>
                        </td>
                        <td><Badge tone={pct >= 75 ? "ok" : pct >= 50 ? "warn" : "bad"}>%{pct}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
