import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireTeacherWithScope } from "@/lib/odk/teacher";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "Kazanım Zayıflıkları · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TeacherOdkOutcomesPage() {
  const { teacherId, userIds } = await requireTeacherWithScope();
  if (!teacherId) {
    return (
      <>
        <PageHeader title="Kazanım Zayıflıkları" />
        <Card><CardBody><EmptyState title="Öğretmen kaydı bulunamadı" /></CardBody></Card>
      </>
    );
  }

  if (userIds.length === 0) {
    return (
      <>
        <PageHeader title="Kazanım Zayıflıkları" />
        <Card><CardBody><EmptyState title="Henüz öğrencin yok" /></CardBody></Card>
      </>
    );
  }

  // Tüm tamamlanmış attempt'leri ve optical answer'ları çek
  const attempts = await prisma.odkExamAttempt.findMany({
    where: { userId: { in: userIds }, status: "SUBMITTED" },
    select: {
      id: true,
      examId: true,
      opticalAnswers: { select: { sectionId: true, questionNumber: true, selectedOption: true } },
    },
  });

  if (attempts.length === 0) {
    return (
      <>
        <PageHeader title="Kazanım Zayıflıkları" />
        <Card><CardBody><EmptyState title="Tamamlanmış çözüm yok" /></CardBody></Card>
      </>
    );
  }

  const examIds = Array.from(new Set(attempts.map((a) => a.examId)));
  const officials = await prisma.odkExamOfficialAnswer.findMany({
    where: { sectionId: { in: (await prisma.odkExamSection.findMany({ where: { examId: { in: examIds } }, select: { id: true } })).map((s) => s.id) } },
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

  type Agg = { lesson: string; code: string; outcome: string; total: number; wrong: number; blank: number };
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
        wrong: 0,
        blank: 0,
      };
      cur.total += 1;
      if (!o.selectedOption) cur.blank += 1;
      else if (o.selectedOption !== off.correct) cur.wrong += 1;
      aggMap.set(key, cur);
    }
  }

  const rows = Array.from(aggMap.values())
    .filter((r) => r.total >= 2)
    .map((r) => ({ ...r, errorRate: (r.wrong + r.blank) / r.total }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 50);

  return (
    <>
      <PageHeader
        title="Öğrencilerinin Zayıf Kazanımları"
        subtitle="Tüm sınıflarındaki tamamlanmış çözümlerden agrege"
      />
      <Card>
        <CardHeader title="En çok hata yapılan kazanımlar" subtitle={`${rows.length} kazanım`} />
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState title="Yeterli veri yok" description="En az 2 kez denenmiş kazanımlar listelenir." />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th>Kod</th>
                  <th>Kazanım</th>
                  <th>D / Y / B</th>
                  <th>Hata oranı</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const correct = r.total - r.wrong - r.blank;
                  const pct = Math.round(r.errorRate * 100);
                  return (
                    <tr key={`${r.lesson}-${r.code}`}>
                      <td><strong>{r.lesson}</strong></td>
                      <td><code style={{ fontSize: 11 }}>{r.code}</code></td>
                      <td style={{ fontSize: 12 }}>{r.outcome || "—"}</td>
                      <td style={{ fontSize: 12 }}>
                        <span style={{ color: "#16a34a" }}>{correct}</span>
                        {" / "}<span style={{ color: "#dc2626" }}>{r.wrong}</span>
                        {" / "}<span className="od-muted">{r.blank}</span>
                      </td>
                      <td>
                        <Badge tone={pct >= 60 ? "bad" : pct >= 35 ? "warn" : "ok"}>%{pct}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
