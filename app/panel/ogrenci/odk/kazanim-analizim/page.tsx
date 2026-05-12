import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Kazanım Analizim · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PerQuestion = {
  sectionId: string;
  questionNumber: number;
  selected: string | null;
  correct: string;
  isCorrect: boolean;
  isBlank: boolean;
};

type LessonStat = {
  lesson: string;
  topic: string | null;
  learningOutcomeCode: string | null;
  learningOutcome: string | null;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

export default async function StudentKazanimPage() {
  const ctx = await requireOdkPanel("ogrenci");

  // Tamamlanmış attempt'leri al, her birinin perQuestion ve official answer kazanımlarını çapraz gez
  const attempts = await prisma.odkExamAttempt.findMany({
    where: { userId: ctx.userId, status: "SUBMITTED" },
    orderBy: { submittedAt: "desc" },
    take: 30,
    select: { id: true, examId: true, resultPayload: true },
  });

  if (attempts.length === 0) {
    return (
      <>
        <PageHeader title="Kazanım Analizim" />
        <Card><CardBody>
          <EmptyState title="Henüz veri yok" description="İlk denemeni tamamladığında kazanım dağılımın burada görünür." />
        </CardBody></Card>
      </>
    );
  }

  const examIds = Array.from(new Set(attempts.map((a) => a.examId)));
  const officials = await prisma.odkExamOfficialAnswer.findMany({
    where: { examId: { in: examIds } },
    select: {
      examId: true, sectionId: true, questionNumber: true,
      lesson: true, topic: true,
      learningOutcomeCode: true, learningOutcome: true,
    },
  });
  // Map: examId|sectionId|q -> meta
  const meta = new Map<string, typeof officials[number]>();
  for (const o of officials) {
    meta.set(`${o.examId}|${o.sectionId}|${o.questionNumber}`, o);
  }

  // Aggregate by (lesson|outcomeCode)
  const stats = new Map<string, LessonStat>();
  for (const a of attempts) {
    const pq = ((a.resultPayload as { perQuestion?: PerQuestion[] } | null)?.perQuestion) ?? [];
    for (const q of pq) {
      const m = meta.get(`${a.examId}|${q.sectionId}|${q.questionNumber}`);
      if (!m) continue;
      const lesson = m.lesson ?? "—";
      const code = m.learningOutcomeCode ?? "";
      const key = `${lesson}|${code}|${m.learningOutcome ?? ""}`;
      let bucket = stats.get(key);
      if (!bucket) {
        bucket = {
          lesson, topic: m.topic, learningOutcomeCode: m.learningOutcomeCode,
          learningOutcome: m.learningOutcome,
          total: 0, correct: 0, wrong: 0, blank: 0,
        };
        stats.set(key, bucket);
      }
      bucket.total += 1;
      if (q.isBlank) bucket.blank += 1;
      else if (q.isCorrect) bucket.correct += 1;
      else bucket.wrong += 1;
    }
  }

  const sorted = Array.from(stats.values()).sort((a, b) => {
    const ratioA = a.total > 0 ? a.correct / a.total : 0;
    const ratioB = b.total > 0 ? b.correct / b.total : 0;
    return ratioA - ratioB; // en zayıf önce
  });

  const weakest = sorted.slice(0, 10);
  const strongest = [...sorted].reverse().slice(0, 5);

  return (
    <>
      <PageHeader
        title="Kazanım Analizim"
        subtitle={`Son ${attempts.length} deneme baz alındı`}
        right={<Link href="/panel/ogrenci/odk" className="od-btn od-btn-ghost">Geri</Link>}
      />

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="🚨 Zayıf kazanımlar" subtitle="Çalışman gereken alanlar" />
          <CardBody>
            <KazanimList items={weakest} variant="weak" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="💪 Güçlü kazanımlar" subtitle="İyi yaptıkların" />
          <CardBody>
            <KazanimList items={strongest} variant="strong" />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Tüm kazanımlar" subtitle={`${sorted.length} kayıt`} />
        <CardBody>
          {sorted.length === 0 ? (
            <p className="od-muted">Kazanım verisi yok.</p>
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th>Kazanım</th>
                  <th>D / Y / B</th>
                  <th>Başarı</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const ratio = s.total > 0 ? s.correct / s.total : 0;
                  return (
                    <tr key={i}>
                      <td><strong>{s.lesson}</strong></td>
                      <td style={{ fontSize: 12 }}>
                        {s.learningOutcome ?? <span className="od-muted">—</span>}
                        {s.learningOutcomeCode ? (
                          <span className="od-mono od-muted" style={{ fontSize: 10, marginLeft: 6 }}>
                            ({s.learningOutcomeCode})
                          </span>
                        ) : null}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span style={{ color: "#16a34a" }}>{s.correct}</span>
                        {" / "}<span style={{ color: "#dc2626" }}>{s.wrong}</span>
                        {" / "}<span className="od-muted">{s.blank}</span>
                      </td>
                      <td>
                        <RatioBar ratio={ratio} />
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

function KazanimList({ items, variant }: { items: LessonStat[]; variant: "weak" | "strong" }) {
  if (items.length === 0) {
    return <p className="od-muted" style={{ fontSize: 13 }}>Yeterli veri yok.</p>;
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((s, i) => {
        const ratio = s.total > 0 ? s.correct / s.total : 0;
        return (
          <li key={i} style={{ borderBottom: "1px solid var(--pd-line)", paddingBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 13 }}>{s.lesson}</strong>
                <div className="od-muted" style={{ fontSize: 12 }}>
                  {s.learningOutcome ?? s.topic ?? "—"}
                </div>
              </div>
              <Badge tone={variant === "weak" ? "bad" : "ok"}>
                {Math.round(ratio * 100)}%
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RatioBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100);
  const color = pct < 40 ? "#dc2626" : pct < 70 ? "#d97706" : "#16a34a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );
}
