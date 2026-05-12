import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "Deneme Sonucu · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SectionScore = {
  sectionId: string;
  title: string;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
};

type PerQuestion = {
  sectionId: string;
  questionNumber: number;
  selected: string | null;
  correct: string;
  isCorrect: boolean;
  isBlank: boolean;
};

export default async function StudentResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const ctx = await requireOdkPanel("ogrenci");
  const { attemptId } = await params;

  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      submittedAt: true,
      durationSeconds: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      sectionScores: true,
      resultPayload: true,
      autoSubmitted: true,
      cheatViolationCount: true,
      exam: { select: { id: true, title: true, cadenceFamily: true, durationMinutes: true } },
    },
  });
  if (!attempt) notFound();
  if (attempt.userId !== ctx.userId && ctx.actualRole !== "ADMIN") notFound();

  if (attempt.status === "IN_PROGRESS") {
    return (
      <>
        <PageHeader title="Deneme henüz tamamlanmadı" subtitle="Sonucu görmek için önce çözümü tamamlamalısın." />
        <Card><CardBody>
          <Link href={`/panel/ogrenci/odk/cozum/${attempt.id}`} className="od-btn od-btn-primary">Çözüme dön</Link>
        </CardBody></Card>
      </>
    );
  }

  const sectionScores = (attempt.sectionScores as unknown as SectionScore[] | null) ?? [];
  const perQuestion = ((attempt.resultPayload as { perQuestion?: PerQuestion[] } | null)?.perQuestion) ?? [];
  const score = attempt.score ? Number(attempt.score).toFixed(2) : "—";

  const dur = attempt.durationSeconds ?? 0;
  const durMin = Math.floor(dur / 60);
  const durSec = dur % 60;

  return (
    <>
      <PageHeader
        title={attempt.exam.title}
        subtitle={`${attempt.exam.cadenceFamily} · ${durMin}dk ${durSec}sn'de tamamlandı`}
        right={
          <>
            <Badge tone="ok">Tamamlandı</Badge>
            <Link href="/panel/ogrenci/odk/denemeler" className="od-btn od-btn-ghost">Denemelere dön</Link>
          </>
        }
      />

      {attempt.autoSubmitted ? (
        <Card>
          <CardBody>
            <Badge tone="warn">Otomatik teslim</Badge>
            <span style={{ marginLeft: 8, fontSize: 13 }}>
              Bu çözüm süre dolduğunda veya bir kural ihlali nedeniyle otomatik gönderildi.
            </span>
          </CardBody>
        </Card>
      ) : null}

      {attempt.cheatViolationCount > 0 ? (
        <Card>
          <CardBody>
            <Badge tone="bad">⚠ {attempt.cheatViolationCount} ihlal</Badge>
            <span style={{ marginLeft: 8, fontSize: 13 }}>
              Sınav süresince sekme değişimi, kopya-yapıştır veya benzer kural ihlalleri tespit edildi. Detayları öğretmenin görüntüleyebilir.
            </span>
          </CardBody>
        </Card>
      ) : null}

      <div className="od-grid g-4" style={{ marginTop: 16 }}>
        <KpiBox label="Net" value={score} tone="primary" />
        <KpiBox label="Doğru" value={String(attempt.correctCount)} tone="ok" />
        <KpiBox label="Yanlış" value={String(attempt.wrongCount)} tone="bad" />
        <KpiBox label="Boş" value={String(attempt.blankCount)} tone="neutral" />
      </div>

      <Card style={{ marginTop: 16 }}>
        <CardHeader title="Bölüm bazında" subtitle="Net = doğru − yanlış / 4" />
        <CardBody>
          <table className="od-table">
            <thead>
              <tr>
                <th>Bölüm</th>
                <th>Soru</th>
                <th>Doğru</th>
                <th>Yanlış</th>
                <th>Boş</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {sectionScores.map((s) => (
                <tr key={s.sectionId}>
                  <td>{s.title}</td>
                  <td>{s.questionCount}</td>
                  <td style={{ color: "#16a34a", fontWeight: 600 }}>{s.correct}</td>
                  <td style={{ color: "#dc2626" }}>{s.wrong}</td>
                  <td className="od-muted">{s.blank}</td>
                  <td style={{ fontWeight: 700 }}>{s.net.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardHeader title="Soru-soru analiz" />
        <CardBody>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 6 }}>
            {perQuestion.map((q) => {
              const bg = q.isBlank ? "#e2e8f0" : q.isCorrect ? "#bbf7d0" : "#fecaca";
              const fg = q.isBlank ? "#475569" : q.isCorrect ? "#166534" : "#991b1b";
              return (
                <div key={`${q.sectionId}:${q.questionNumber}`} style={{
                  background: bg, color: fg, padding: "8px 6px", borderRadius: 6,
                  fontSize: 11, textAlign: "center", lineHeight: 1.3,
                }}>
                  <div style={{ fontWeight: 700 }}>{q.questionNumber}</div>
                  <div>
                    {q.isBlank ? "—" : q.selected} → {q.correct}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function KpiBox({ label, value, tone }: { label: string; value: string; tone: "primary" | "ok" | "bad" | "neutral" }) {
  const colors = {
    primary: { bg: "#eff6ff", color: "#1e40af" },
    ok: { bg: "#dcfce7", color: "#166534" },
    bad: { bg: "#fee2e2", color: "#991b1b" },
    neutral: { bg: "#f1f5f9", color: "#475569" },
  }[tone];
  return (
    <div style={{
      background: colors.bg, color: colors.color, padding: 16,
      borderRadius: 12, textAlign: "center",
    }}>
      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
