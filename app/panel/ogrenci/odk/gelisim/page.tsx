import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Gelişim Grafiğim · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudentGelisimPage() {
  const ctx = await requireOdkPanel("ogrenci");

  const attempts = await prisma.odkExamAttempt.findMany({
    where: { userId: ctx.userId, status: "SUBMITTED" },
    orderBy: { submittedAt: "asc" },
    take: 30,
    select: {
      id: true, score: true, submittedAt: true,
      correctCount: true, wrongCount: true, blankCount: true,
      exam: { select: { title: true, cadenceFamily: true } },
    },
  });

  if (attempts.length === 0) {
    return (
      <>
        <PageHeader title="Gelişim Grafiğim" />
        <Card><CardBody>
          <EmptyState title="Henüz veri yok" description="İlk denemeni tamamladığında gelişim grafiği burada görünür." />
        </CardBody></Card>
      </>
    );
  }

  const points = attempts.map((a) => ({
    label: a.exam.title,
    family: a.exam.cadenceFamily,
    score: a.score ? Number(a.score) : 0,
    when: a.submittedAt,
  }));

  const max = Math.max(...points.map((p) => p.score), 10);
  const avg = points.reduce((a, p) => a + p.score, 0) / points.length;
  const last = points[points.length - 1].score;
  const first = points[0].score;
  const trend = points.length >= 2 ? last - first : 0;

  return (
    <>
      <PageHeader
        title="Gelişim Grafiğim"
        subtitle={`Son ${points.length} deneme net trendin`}
        right={<Link href="/panel/ogrenci/odk" className="od-btn od-btn-ghost">Geri</Link>}
      />

      <div className="od-grid g-3" style={{ marginBottom: 16 }}>
        <Kpi label="Ortalama net" value={avg.toFixed(2)} />
        <Kpi label="Son net" value={last.toFixed(2)} />
        <Kpi label="İlerleme" value={(trend >= 0 ? "+" : "") + trend.toFixed(2)} tone={trend >= 0 ? "ok" : "bad"} />
      </div>

      <Card>
        <CardHeader title="Net trendi" subtitle="Soldan sağa kronolojik" />
        <CardBody>
          <SparkChart points={points} max={max} />
        </CardBody>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardHeader title="Deneme tablosu" />
        <CardBody>
          <table className="od-table">
            <thead><tr><th>Tarih</th><th>Deneme</th><th>D/Y/B</th><th>Net</th></tr></thead>
            <tbody>
              {[...attempts].reverse().map((a) => (
                <tr key={a.id}>
                  <td style={{ fontSize: 12 }}>
                    {a.submittedAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(a.submittedAt) : "—"}
                  </td>
                  <td><strong>{a.exam.title}</strong> <span className="od-muted">· {a.exam.cadenceFamily}</span></td>
                  <td style={{ fontSize: 12 }}>{a.correctCount} / {a.wrongCount} / {a.blankCount}</td>
                  <td><strong>{a.score ? Number(a.score).toFixed(2) : "—"}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "ok" | "bad" | "neutral" }) {
  const colors = {
    ok: { bg: "#dcfce7", color: "#166534" },
    bad: { bg: "#fee2e2", color: "#991b1b" },
    neutral: { bg: "white", color: "var(--pd-ink-1)" },
  }[tone];
  return (
    <div style={{ background: colors.bg, color: colors.color, padding: 16, borderRadius: 12, border: tone === "neutral" ? "1px solid var(--pd-line)" : "none" }}>
      <div className="od-muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

/**
 * Pure SVG sparkline + bar chart, no deps.
 */
function SparkChart({ points, max }: { points: Array<{ label: string; family: string; score: number; when: Date | null }>; max: number }) {
  const W = 800;
  const H = 220;
  const PAD = 24;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const path = points
    .map((p, i) => {
      const x = PAD + i * stepX;
      const y = PAD + innerH - (p.score / max) * innerH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block", minWidth: 480 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g}
            x1={PAD} x2={W - PAD}
            y1={PAD + innerH * (1 - g)} y2={PAD + innerH * (1 - g)}
            stroke="#e2e8f0" strokeDasharray="2 4" />
        ))}
        {/* Y labels */}
        {[0, 0.5, 1].map((g) => (
          <text key={g}
            x={4} y={PAD + innerH * (1 - g) + 4}
            fontSize="10" fill="#94a3b8">
            {(max * g).toFixed(0)}
          </text>
        ))}
        {/* Path */}
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => {
          const x = PAD + i * stepX;
          const y = PAD + innerH - (p.score / max) * innerH;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={4} fill="#2563eb" />
              <text x={x} y={y - 8} fontSize="10" textAnchor="middle" fill="#1e40af" fontWeight={700}>
                {p.score.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
