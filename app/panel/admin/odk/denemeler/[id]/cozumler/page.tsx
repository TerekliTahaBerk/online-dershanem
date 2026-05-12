import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Çözümler · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminExamAttemptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOdkPanel("admin");
  const { id: examId } = await params;

  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: { id: true, title: true, cadenceFamily: true },
  });
  if (!exam) notFound();

  const attempts = await prisma.odkExamAttempt.findMany({
    where: { examId },
    orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      durationSeconds: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      cheatViolationCount: true,
      autoSubmitted: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const submitted = attempts.filter((a) => a.status === "SUBMITTED");
  const inProgress = attempts.filter((a) => a.status === "IN_PROGRESS");
  const avgNet = submitted.length === 0
    ? null
    : submitted.reduce((a, x) => a + Number(x.score ?? 0), 0) / submitted.length;
  const avgViolations = submitted.length === 0
    ? null
    : submitted.reduce((a, x) => a + x.cheatViolationCount, 0) / submitted.length;

  return (
    <>
      <PageHeader
        title={`${exam.title} · Çözümler`}
        subtitle={exam.cadenceFamily}
        right={
          <Link href={`/panel/admin/odk/denemeler/${examId}`} className="od-btn od-btn-ghost">
            Denemeye dön
          </Link>
        }
      />

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <Kpi label="Tamamlanan" value={String(submitted.length)} />
        <Kpi label="Devam eden" value={String(inProgress.length)} />
        <Kpi label="Ortalama net" value={avgNet === null ? "—" : avgNet.toFixed(2)} />
        <Kpi label="Ort. ihlal" value={avgViolations === null ? "—" : avgViolations.toFixed(1)} />
      </div>

      <Card>
        <CardHeader title="Tüm çözümler" subtitle={`${attempts.length} kayıt`} />
        <CardBody>
          {attempts.length === 0 ? (
            <EmptyState title="Henüz çözüm yok" description="Öğrenciler bu denemeyi çözmeye başladığında burada görünecek." />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Durum</th>
                  <th>Başladı</th>
                  <th>Süre</th>
                  <th>D / Y / B</th>
                  <th>Net</th>
                  <th>İhlal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.user.name ?? "—"}</strong>
                      <div className="od-muted" style={{ fontSize: 11 }}>{a.user.email}</div>
                    </td>
                    <td>
                      {a.status === "SUBMITTED" ? (
                        <Badge tone={a.autoSubmitted ? "warn" : "ok"}>
                          {a.autoSubmitted ? "Otomatik" : "Tamamlandı"}
                        </Badge>
                      ) : (
                        <Badge tone="accent">Devam ediyor</Badge>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(a.startedAt)}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {a.durationSeconds ? `${Math.floor(a.durationSeconds / 60)}dk ${a.durationSeconds % 60}sn` : "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <span style={{ color: "#16a34a" }}>{a.correctCount}</span>
                      {" / "}<span style={{ color: "#dc2626" }}>{a.wrongCount}</span>
                      {" / "}<span className="od-muted">{a.blankCount}</span>
                    </td>
                    <td><strong>{a.score ? Number(a.score).toFixed(2) : "—"}</strong></td>
                    <td>
                      {a.cheatViolationCount > 0 ? (
                        <Badge tone={a.cheatViolationCount >= 5 ? "bad" : "warn"}>
                          ⚠ {a.cheatViolationCount}
                        </Badge>
                      ) : (
                        <span className="od-muted">—</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/panel/admin/odk/cozumler/${a.id}`}>Detay</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid var(--pd-line)" }}>
      <div className="od-muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
