/**
 * Homework board — classroom-grouped kanban view of assignments with real
 * submission stats (server-rendered).
 *
 * Data contract: the *page* is responsible for fetching assignments +
 * submission aggregates and passing them in. This component is a pure
 * server-renderable presentation layer (no "use client").
 *
 * Why server-rendered: assignments don't need optimistic UI; counts come
 * from Prisma aggregates and don't change while the admin reads. Drag-and-
 * drop status movement is intentionally NOT implemented yet (Phase 1.5+).
 *
 * Submission stats (5 buckets, see SubmissionStatus enum):
 *   PENDING   — assigned but not yet submitted
 *   SUBMITTED — submitted, awaiting grading
 *   GRADED    — graded
 *   LATE      — submitted after dueAt
 *   MISSED    — past due, never submitted
 *
 * "Expected" denominator = roster size at fetch time:
 *   - classroom assignment → active classroom students
 *   - direct (studentId)   → 1
 *   - global (no target)   → teacher's active student count (best-effort)
 *
 * `getAssignmentSubmissionStats` lives next to the page (see _stats.ts).
 */

import Link from "next/link";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getAssignmentOperationalStatus,
  getAssignmentStatusLabel,
  getAssignmentStatusTone,
} from "@/lib/homework";
import type { AssignmentStatus, SubmissionStatus } from "@prisma/client";

export type SubmissionStats = {
  expected: number;
  pending: number;
  submitted: number;
  graded: number;
  late: number;
  missed: number;
};

export type BoardAssignment = {
  id: string;
  title: string;
  subject: string | null;
  status: AssignmentStatus;
  dueAt: Date | null;
  createdAt: Date;
  classroom: { id: string; name: string; branch: string | null } | null;
  student: { id: string; fullName: string } | null;
  teacher: { id: string; fullName: string } | null;
  stats: SubmissionStats;
};

export type BoardColumn = {
  /** "classroom:<id>" | "direct" | "global" */
  key: string;
  /** Human label */
  label: string;
  /** Optional sublabel ("Şube · 24 öğrenci") */
  sublabel?: string;
  /** Optional href to a filtered classroom view */
  href?: string;
  assignments: BoardAssignment[];
};

type Props = {
  columns: BoardColumn[];
  /** Total assignment count across all columns; used by empty state. */
  totalCount: number;
  /** Where "+ Ödev oluştur" should link. */
  createHref: string;
};

const fmtDate = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(d)
    : "—";

function dueTone(due: Date | null, status: AssignmentStatus): {
  tone: "ok" | "warn" | "bad" | "neutral";
  label: string;
} {
  if (!due) return { tone: "neutral", label: "—" };
  if (status === "CLOSED") return { tone: "neutral", label: fmtDate(due) };
  const now = Date.now();
  const diff = due.getTime() - now;
  const days = Math.round(diff / 86400000);
  if (diff < 0) return { tone: "bad", label: `${Math.abs(days)}g gecikti` };
  if (days <= 1) return { tone: "warn", label: days === 0 ? "Bugün" : "Yarın" };
  if (days <= 3) return { tone: "warn", label: `${days}g kaldı` };
  return { tone: "ok", label: `${days}g kaldı` };
}

export function HomeworkProgressBar({ stats }: { stats: SubmissionStats }) {
  const total = Math.max(stats.expected, 1);
  const done = stats.submitted + stats.graded + stats.late;
  const pct = Math.round((done / total) * 100);
  const gradedPct = Math.round((stats.graded / total) * 100);
  return (
    <div title={`${done}/${stats.expected} teslim · %${pct} · %${gradedPct} değerlendirildi`}>
      <div className="od-task-progress">
        <div className="pct" style={{ width: `${pct}%`, opacity: 0.45 }} />
        <div className="graded" style={{ width: `${gradedPct}%` }} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--pd-muted)",
          marginTop: 4,
        }}
      >
        <span>{done}/{stats.expected} teslim</span>
        <span>%{pct}</span>
      </div>
    </div>
  );
}

function HomeworkCard({ a }: { a: BoardAssignment }) {
  const due = dueTone(a.dueAt, a.status);
  const op = getAssignmentOperationalStatus(
    { status: a.status, dueAt: a.dueAt },
    a.stats,
  );
  const target =
    a.classroom?.name ??
    (a.student ? `🎯 ${a.student.fullName}` : "Tüm öğrenciler");
  return (
    <article className="od-task-card">
      <header style={{ display: "flex", gap: 6, alignItems: "flex-start", justifyContent: "space-between" }}>
        <Link
          href={`/panel/admin/odevler/${a.id}/duzenle`}
          className="od-task-title"
        >
          {a.title}
        </Link>
        <Badge tone={getAssignmentStatusTone(op)}>{getAssignmentStatusLabel(op)}</Badge>
      </header>

      <div className="od-content-meta">
        {a.subject ? <span>{a.subject}</span> : null}
        {a.subject && a.teacher ? <span aria-hidden="true">·</span> : null}
        {a.teacher ? <span>{a.teacher.fullName}</span> : null}
        <span style={{ marginLeft: "auto" }} className={due.tone === "bad" ? "od-text-bad" : due.tone === "warn" ? "od-text-warn" : ""}>
          {due.label}
        </span>
      </div>

      <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>{target}</div>

      <HomeworkProgressBar stats={a.stats} />

      <footer className="od-content-action-row" style={{ fontSize: 11, gap: 4 }}>
        {a.stats.pending > 0 ? <span className="soft-pill" title="Beklemede">{a.stats.pending} bekliyor</span> : null}
        {a.stats.submitted > 0 ? <span className="soft-pill is-yellow" title="Kontrol bekliyor">{a.stats.submitted} kontrol</span> : null}
        {a.stats.late > 0 ? <span className="soft-pill is-yellow" title="Geç teslim">{a.stats.late} geç</span> : null}
        {a.stats.missed > 0 ? <span className="soft-pill is-blush" title="Teslim edilmedi">{a.stats.missed} eksik</span> : null}
        {a.stats.graded > 0 ? <span className="soft-pill is-mint" title="Değerlendirildi">✓ {a.stats.graded}</span> : null}
        <Link
          href={`/panel/admin/odevler/${a.id}/duzenle`}
          className="od-btn ghost sm"
          style={{ marginLeft: "auto" }}
        >
          Aç →
        </Link>
      </footer>
    </article>
  );
}

function HomeworkBoardColumn({ col }: { col: BoardColumn }) {
  return (
    <section className="od-task-column">
      <header className="od-task-column-header">
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          {col.href ? (
            <Link href={col.href} style={{ color: "var(--pd-ink)", textDecoration: "none" }}>
              <strong>{col.label}</strong>
            </Link>
          ) : (
            <strong>{col.label}</strong>
          )}
          <span style={{ fontSize: 11, color: "var(--pd-muted)" }}>{col.assignments.length}</span>
        </div>
        {col.sublabel ? (
          <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>{col.sublabel}</div>
        ) : null}
      </header>

      {col.assignments.length === 0 ? (
        <div className="od-task-empty">Bu sınıfa atanmış ödev yok.</div>
      ) : (
        col.assignments.map((a) => <HomeworkCard key={a.id} a={a} />)
      )}
    </section>
  );
}

export function HomeworkBoard({ columns, totalCount, createHref }: Props) {
  if (totalCount === 0) {
    return (
      <EmptyState
        title="Henüz ödev yok"
        description="İlk ödevini oluştur. Sınıfa veya tek öğrenciye atayabilirsin."
        action={
          <Link href={createHref} className="od-btn dark sm">
            + Ödev oluştur
          </Link>
        }
      />
    );
  }

  return (
    <div className="od-task-board">
      {columns.map((col) => (
        <HomeworkBoardColumn key={col.key} col={col} />
      ))}
    </div>
  );
}
