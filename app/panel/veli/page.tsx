import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { getParentChildSummaries, summaryHasCriticalAlert, type ParentChildSummary } from "@/lib/parent-summary";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { Badge } from "@/components/panel/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const ctx = await requirePanelRole("veli");
  const parent = await prisma.parent.findFirst({
    where: { userId: ctx.userId },
    select: { id: true, fullName: true },
  });

  if (!parent) {
    return (
      <>
        <PageHeader title="Veli Paneli" />
        <Card>
          <EmptyState
            icon="users"
            title="Bağlı bir çocuk bulunmuyor"
            description="Yönetimle iletişime geçerek çocuklarınızın hesaplarını bağlatabilirsiniz."
          />
        </Card>
      </>
    );
  }

  const children = await getParentChildSummaries(parent.id);

  if (children.length === 0) {
    return (
      <>
        <PageHeader title={`Hoş geldin, ${parent.fullName}`} />
        <Card>
          <EmptyState
            icon="users"
            title="Bağlı bir çocuk bulunmuyor"
            description="Yönetimle iletişime geçerek çocuklarınızın hesaplarını bağlatabilirsiniz."
          />
        </Card>
      </>
    );
  }

  // Aggregated KPIs
  const totalPending = children.reduce((s, c) => s + c.pendingAssignments, 0);
  const totalOverdue = children.reduce((s, c) => s + c.overdueAssignments, 0);
  const totalUpcoming = children.reduce((s, c) => s + c.upcomingLessons7, 0);
  const att7Total = children.reduce((s, c) => s + c.attendance7.total, 0);
  const att7Present = children.reduce((s, c) => s + c.attendance7.present, 0);
  const attendanceRate = att7Total > 0 ? Math.round((att7Present / att7Total) * 100) : null;
  const criticalChildren = children.filter(summaryHasCriticalAlert);

  return (
    <>
      <PageHeader
        title={`Hoş geldin, ${parent.fullName}`}
        subtitle={`${children.length} çocuk${criticalChildren.length > 0 ? ` · ${criticalChildren.length} acil dikkat` : ""}`}
      />

      {criticalChildren.length > 0 ? (
        <Card style={{ marginBottom: 16, borderLeft: "4px solid var(--pd-bad, #dc2626)" }}>
          <CardBody>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--pd-bad, #dc2626)", marginBottom: 8 }}>
              🚨 Acil dikkat
            </div>
            {criticalChildren.map((c) => (
              <div key={c.studentId} style={{ fontSize: 13, marginBottom: 4 }}>
                <Link href={`/panel/veli/cocuklarim/${c.studentId}`} className="od-link" style={{ fontWeight: 600 }}>
                  {c.fullName}
                </Link>
                <span className="od-muted"> · </span>
                {c.alerts
                  .filter((a) => a.severity === "critical")
                  .map((a) => a.message)
                  .join(" · ")}
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="od-grid g-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Bekleyen ödev" value={totalPending} meta="Tüm çocukların" />
        <KpiCard label="Geciken ödev" value={totalOverdue} meta={totalOverdue > 0 ? "Eylem gerekebilir" : "Hepsi temiz"} />
        <KpiCard label="7 gün devam" value={attendanceRate != null ? `%${attendanceRate}` : "—"} meta={`${att7Total} kayıt`} />
        <KpiCard label="Önümüzdeki 7g ders" value={totalUpcoming} meta="Toplam" />
      </div>

      <CardHeader title="Çocuklar" />
      <div className="od-grid g-2">
        {children.map((c) => (
          <ChildCard key={c.studentId} child={c} />
        ))}
      </div>
    </>
  );
}

function ChildCard({ child: c }: { child: ParentChildSummary }) {
  const attRate = c.attendance7.total > 0 ? Math.round((c.attendance7.present / c.attendance7.total) * 100) : null;
  const attTone = attRate == null ? "neutral" : attRate >= 90 ? "ok" : attRate >= 70 ? "warn" : "bad";
  return (
    <Card>
      <CardHeader
        title={c.fullName}
        subtitle={`${c.classLevel ?? "—"}${c.examType ? ` · ${c.examType}` : ""}`}
        right={
          c.alerts.some((a) => a.severity === "critical") ? (
            <Badge tone="bad">⚠ acil</Badge>
          ) : c.alerts.some((a) => a.severity === "warning") ? (
            <Badge tone="warn">uyarı</Badge>
          ) : null
        }
      />
      <CardBody>
        <div className="od-grid g-3" style={{ gap: 8, fontSize: 12 }}>
          <Metric label="7g devam" value={attRate != null ? `%${attRate}` : "—"} tone={attTone} />
          <Metric label="Bekleyen ödev" value={String(c.pendingAssignments)} tone={c.pendingAssignments >= 3 ? "warn" : "neutral"} />
          <Metric label="Geciken" value={String(c.overdueAssignments)} tone={c.overdueAssignments >= 2 ? "bad" : c.overdueAssignments >= 1 ? "warn" : "ok"} />
          <Metric label="Bu hafta ders" value={String(c.upcomingLessons7)} tone="neutral" />
          {c.lastGradedScore != null ? (
            <Metric
              label="Son ödev"
              value={`${c.lastGradedScore}/100`}
              tone={c.lastGradedScore >= 70 ? "ok" : c.lastGradedScore >= 50 ? "warn" : "bad"}
              hint={c.lastGradedTitle ?? undefined}
            />
          ) : null}
          {c.lastOdkNet != null ? (
            <Metric label="Son ODK net" value={String(c.lastOdkNet)} tone="neutral" hint={c.lastOdkExam ?? undefined} />
          ) : null}
        </div>

        {c.alerts.length > 0 ? (
          <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
            {c.alerts.map((a) => (
              <li key={a.id} style={{ color: a.severity === "critical" ? "var(--pd-bad)" : a.severity === "warning" ? "var(--pd-warn)" : "var(--pd-muted)" }}>
                {a.severity === "critical" ? "🚨" : a.severity === "warning" ? "⚠" : "ℹ"} {a.message}
              </li>
            ))}
          </ul>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <Link href={`/panel/veli/cocuklarim/${c.studentId}`} className="od-btn od-btn-ghost od-btn-sm">
            Detayları gör →
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad" | "neutral";
  hint?: string;
}) {
  const color =
    tone === "bad"
      ? "var(--pd-bad, #dc2626)"
      : tone === "warn"
        ? "var(--pd-warn, #b45309)"
        : tone === "ok"
          ? "var(--pd-ok, #047857)"
          : "var(--pd-fg)";
  return (
    <div style={{ background: "var(--pd-bg-subtle, #f8f8f5)", padding: "8px 10px", borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
      {hint ? <div style={{ fontSize: 10, color: "var(--pd-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hint}</div> : null}
    </div>
  );
}
