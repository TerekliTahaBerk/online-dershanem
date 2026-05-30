import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getAssignmentStatusLabel,
  getAssignmentStatusTone,
} from "@/lib/homework";
import type {
  ParentHomeworkSummary,
  ParentHomeworkRow,
} from "@/lib/panel/parent-dashboard";

const TONE_MAP: Record<string, "ok" | "warn" | "bad" | "neutral" | "teal"> = {
  ok: "ok", warn: "warn", bad: "bad", neutral: "neutral", teal: "teal",
};

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

type Props = { summary: ParentHomeworkSummary };

export function ParentHomeworkSummaryCard({ summary }: Props) {
  const empty =
    summary.activeCount === 0 &&
    summary.gradedCount === 0 &&
    summary.recentGraded.length === 0 &&
    !summary.nextDue;

  return (
    <Card>
      <CardHeader
        title="Ödevler"
        subtitle={summary.activeCount > 0 ? `${summary.activeCount} aktif ödev` : undefined}
        right={
          <Link href="/panel/veli/odev-takibi" className="od-btn od-btn-ghost od-btn-sm">
            Ödevleri gör →
          </Link>
        }
      />
      <CardBody>
        {empty ? (
          <EmptyState
            icon="assignment"
            title="Aktif ödev yok."
            description="Yeni ödev geldiğinde burada listelenecek."
          />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 10 }}>
              <Stat label="Aktif" value={summary.activeCount} />
              <Stat label="Eksik" value={summary.missingCount} tone={summary.missingCount > 0 ? "bad" : undefined} />
              <Stat label="Geciken" value={summary.overdueCount} tone={summary.overdueCount > 0 ? "bad" : undefined} />
              <Stat label="Kontrolde" value={summary.ungradedCount} tone={summary.ungradedCount > 0 ? "warn" : undefined} />
              <Stat label="Puanlandı" value={summary.gradedCount} tone={summary.gradedCount > 0 ? "ok" : undefined} />
            </div>

            {summary.nextDue ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6, margin: "6px 0" }}>
                  En yakın teslim
                </div>
                <HomeworkRow row={summary.nextDue} />
              </>
            ) : null}

            {summary.recentGraded.length > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6, margin: "10px 0 6px" }}>
                  Son puanlananlar
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {summary.recentGraded.map((r) => <HomeworkRow key={r.assignmentId} row={r} />)}
                </div>
              </>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function HomeworkRow({ row: r }: { row: ParentHomeworkRow }) {
  const tone = TONE_MAP[getAssignmentStatusTone(r.operationalStatus)] ?? "neutral";
  const max = r.maxScore ?? 100;
  const scoreLabel = r.score != null ? `${r.score}/${max}` : null;
  const scoreTone =
    r.score == null ? "neutral"
      : r.score / max >= 0.7 ? "ok"
      : r.score / max >= 0.5 ? "warn"
      : "bad";
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto", gap: 8,
      padding: "8px 10px", borderRadius: 6, background: "var(--pd-soft)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.title}
        </div>
        <div className="od-muted" style={{ fontSize: 11, display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          {r.dueAt ? <span>son {DATE_FMT.format(r.dueAt)}</span> : <span>tarih yok</span>}
          {scoreLabel ? <span>· puan {scoreLabel}</span> : null}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {scoreLabel ? <Badge tone={scoreTone}>{scoreLabel}</Badge> : null}
        <Badge tone={tone}>{getAssignmentStatusLabel(r.operationalStatus)}</Badge>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" | "ok" }) {
  const color =
    tone === "bad" ? "var(--pd-bad)"
      : tone === "warn" ? "var(--pd-warn)"
      : tone === "ok" ? "var(--pd-good)"
      : "inherit";
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 8, background: "var(--pd-soft)",
      display: "flex", flexDirection: "column", gap: 2,
    }}>
      <span className="od-muted" style={{ fontSize: 11 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
