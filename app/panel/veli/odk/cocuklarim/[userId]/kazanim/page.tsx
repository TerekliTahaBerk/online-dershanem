import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireParentWithChildren } from "@/lib/odk/parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "Zayıf Kazanımlar · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ParentChildOutcomes({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userIds, children } = await requireParentWithChildren();
  const { userId } = await params;
  if (!userIds.includes(userId)) notFound();
  const child = children.find((c) => c.userId === userId);

  const attempts = await prisma.odkExamAttempt.findMany({
    where: { userId, status: "SUBMITTED" },
    select: {
      id: true,
      examId: true,
      opticalAnswers: { select: { sectionId: true, questionNumber: true, selectedOption: true } },
    },
  });

  if (attempts.length === 0) {
    return (
      <>
        <PageHeader
          title={`${child?.name ?? "Çocuk"} · Zayıf Kazanımlar`}
          right={<Link href={`/panel/veli/odk/cocuklarim/${userId}`} className="od-btn od-btn-ghost">Çocuğa dön</Link>}
        />
        <Card><CardBody><EmptyState title="Tamamlanmış denemesi yok" /></CardBody></Card>
      </>
    );
  }

  const examIds = Array.from(new Set(attempts.map((a) => a.examId)));
  const sectionIds = (await prisma.odkExamSection.findMany({
    where: { examId: { in: examIds } },
    select: { id: true },
  })).map((s) => s.id);
  const officials = await prisma.odkExamOfficialAnswer.findMany({
    where: { sectionId: { in: sectionIds } },
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
    .filter((r) => r.total >= 1)
    .map((r) => ({ ...r, errorRate: (r.wrong + r.blank) / r.total }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 30);

  return (
    <>
      <PageHeader
        title={`${child?.name ?? "Çocuk"} · Zayıf Kazanımlar`}
        subtitle="En çok hata yaptığı kazanımlar"
        right={<Link href={`/panel/veli/odk/cocuklarim/${userId}`} className="od-btn od-btn-ghost">Çocuğa dön</Link>}
      />
      <Card>
        <CardHeader title="Çalışılması gereken kazanımlar" subtitle={`${rows.length} kazanım`} />
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState title="Veri yok" />
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
