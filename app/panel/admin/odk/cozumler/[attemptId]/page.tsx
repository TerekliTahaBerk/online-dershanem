import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";

export const metadata: Metadata = {
  title: "Çözüm Detayı · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SectionScore = {
  sectionId: string; title: string; questionCount: number;
  correct: number; wrong: number; blank: number; net: number;
};

type PerQuestion = {
  sectionId: string; questionNumber: number;
  selected: string | null; correct: string;
  isCorrect: boolean; isBlank: boolean;
};

const EVENT_LABEL: Record<string, string> = {
  TAB_BLUR: "Sekme bıraktı",
  TAB_FOCUS: "Sekmeye döndü",
  VISIBILITY_HIDDEN: "Sayfa gizlendi",
  VISIBILITY_VISIBLE: "Sayfa görünür",
  FULLSCREEN_ENTER: "Tam ekran",
  FULLSCREEN_EXIT: "Tam ekran çıkışı",
  RIGHT_CLICK: "Sağ tık",
  COPY: "Kopyalama",
  PASTE: "Yapıştırma",
  CUT: "Kesme",
  PRINT: "Yazdırma denemesi",
  KEY_DEVTOOLS: "Geliştirici araçları",
  ANSWER_CHANGE: "Cevap değişti",
  NAVIGATE: "Navigasyon",
  AUTOSAVE: "Otomatik kayıt",
  NETWORK_DROP: "Ağ koptu",
  NETWORK_RESUME: "Ağ döndü",
  WARNING_SHOWN: "Uyarı gösterildi",
};

const VIOLATION_TYPES = new Set([
  "TAB_BLUR", "VISIBILITY_HIDDEN", "FULLSCREEN_EXIT",
  "COPY", "PASTE", "CUT", "PRINT", "KEY_DEVTOOLS",
]);

export default async function AdminAttemptDetail({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  await requireOdkPanel("admin");
  const { attemptId } = await params;

  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true, status: true, startedAt: true, submittedAt: true,
      durationSeconds: true, score: true,
      correctCount: true, wrongCount: true, blankCount: true,
      cheatViolationCount: true, autoSubmitted: true,
      sectionScores: true, resultPayload: true,
      user: { select: { id: true, name: true, email: true } },
      exam: { select: { id: true, title: true, cadenceFamily: true } },
      events: {
        orderBy: { occurredAt: "asc" },
        take: 500,
        select: { id: true, type: true, questionNumber: true, occurredAt: true },
      },
    },
  });
  if (!attempt) notFound();

  const sectionScores = (attempt.sectionScores as unknown as SectionScore[] | null) ?? [];
  const perQuestion = ((attempt.resultPayload as { perQuestion?: PerQuestion[] } | null)?.perQuestion) ?? [];
  const score = attempt.score ? Number(attempt.score).toFixed(2) : "—";
  const dur = attempt.durationSeconds ?? 0;

  return (
    <>
      <PageHeader
        title={`${attempt.user.name ?? "—"} · ${attempt.exam.title}`}
        subtitle={attempt.user.email}
        right={
          <Link href={`/panel/admin/odk/denemeler/${attempt.exam.id}/cozumler`} className="od-btn od-btn-ghost">
            Çözümlere dön
          </Link>
        }
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <Kpi label="Net" value={score} tone="primary" />
        <Kpi label="Doğru" value={String(attempt.correctCount)} tone="ok" />
        <Kpi label="Yanlış" value={String(attempt.wrongCount)} tone="bad" />
        <Kpi label="İhlal" value={String(attempt.cheatViolationCount)} tone={attempt.cheatViolationCount > 0 ? "warn" : "neutral"} />
      </div>

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Genel" />
          <CardBody>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 13, margin: 0 }}>
              <dt className="od-muted">Durum</dt>
              <dd>
                {attempt.status === "SUBMITTED" ? (
                  <Badge tone={attempt.autoSubmitted ? "warn" : "ok"}>
                    {attempt.autoSubmitted ? "Otomatik teslim" : "Tamamlandı"}
                  </Badge>
                ) : (
                  <Badge tone="accent">Devam ediyor</Badge>
                )}
              </dd>
              <dt className="od-muted">Başladı</dt>
              <dd>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(attempt.startedAt)}</dd>
              {attempt.submittedAt ? (
                <>
                  <dt className="od-muted">Teslim</dt>
                  <dd>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(attempt.submittedAt)}</dd>
                </>
              ) : null}
              <dt className="od-muted">Süre</dt>
              <dd>{dur > 0 ? `${Math.floor(dur / 60)}dk ${dur % 60}sn` : "—"}</dd>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Bölüm bazında" />
          <CardBody>
            {sectionScores.length === 0 ? (
              <p className="od-muted" style={{ fontSize: 13 }}>Henüz puanlanmadı.</p>
            ) : (
              <table className="od-table">
                <thead><tr><th>Bölüm</th><th>D</th><th>Y</th><th>B</th><th>Net</th></tr></thead>
                <tbody>
                  {sectionScores.map((s) => (
                    <tr key={s.sectionId}>
                      <td>{s.title}</td>
                      <td style={{ color: "#16a34a" }}>{s.correct}</td>
                      <td style={{ color: "#dc2626" }}>{s.wrong}</td>
                      <td className="od-muted">{s.blank}</td>
                      <td><strong>{s.net.toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      {perQuestion.length > 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Soru-soru cevap haritası" />
          <CardBody>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))", gap: 4 }}>
              {perQuestion.map((q) => {
                const bg = q.isBlank ? "#e2e8f0" : q.isCorrect ? "#bbf7d0" : "#fecaca";
                const fg = q.isBlank ? "#475569" : q.isCorrect ? "#166534" : "#991b1b";
                return (
                  <div key={`${q.sectionId}:${q.questionNumber}`} style={{
                    background: bg, color: fg, padding: "6px 4px", borderRadius: 4,
                    fontSize: 11, textAlign: "center", lineHeight: 1.2,
                  }}>
                    <div style={{ fontWeight: 700 }}>{q.questionNumber}</div>
                    <div>{q.isBlank ? "—" : q.selected} / {q.correct}</div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Olay zaman çizgisi" subtitle={`${attempt.events.length} olay`} />
        <CardBody>
          {attempt.events.length === 0 ? (
            <p className="od-muted" style={{ fontSize: 13 }}>Olay kaydı yok.</p>
          ) : (
            <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {attempt.events.map((e) => {
                const isViolation = VIOLATION_TYPES.has(e.type);
                return (
                  <div key={e.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "6px 10px", borderRadius: 6,
                    background: isViolation ? "#fef2f2" : "transparent",
                    fontSize: 12,
                  }}>
                    <span className="od-mono od-muted" style={{ minWidth: 80 }}>
                      {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(e.occurredAt)}
                    </span>
                    <span style={{ color: isViolation ? "#991b1b" : "var(--pd-ink-1)", fontWeight: isViolation ? 600 : 400 }}>
                      {isViolation ? "⚠ " : ""}{EVENT_LABEL[e.type] ?? e.type}
                    </span>
                    {e.questionNumber ? (
                      <span className="od-muted">soru {e.questionNumber}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "primary" | "ok" | "bad" | "warn" | "neutral" }) {
  const colors = {
    primary: { bg: "#eff6ff", color: "#1e40af" },
    ok: { bg: "#dcfce7", color: "#166534" },
    bad: { bg: "#fee2e2", color: "#991b1b" },
    warn: { bg: "#fef3c7", color: "#92400e" },
    neutral: { bg: "#f1f5f9", color: "#475569" },
  }[tone];
  return (
    <div style={{ background: colors.bg, color: colors.color, padding: 16, borderRadius: 12, textAlign: "center" }}>
      <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
