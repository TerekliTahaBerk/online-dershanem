/**
 * Homework page — server-rendered classroom-grouped board.
 *
 * Refactored from a flat assignments table into <HomeworkBoard>. We compute
 * submission stats with two cheap groupBy queries (one for status counts per
 * assignment, one for classroom roster sizes), then synthesize a "MISSED"
 * pseudo-status from `expected - submissions` for past-due rows.
 *
 * Filters preserved: ?q=...&status=...&classroomId=...
 *
 * Phase 1.5: status pills in the cards are derived via
 * `getAssignmentOperationalStatus` so the board, the student-360 homework
 * tab, and any future teacher view all read the same labels.
 */

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { SearchInput } from "@/components/panel/ui/search-input";
import { ExportButton } from "@/components/panel/ui/export-button";
import { SavedViewsBar } from "@/components/panel/ui/saved-views";
import {
  HomeworkBoard,
  type BoardAssignment,
  type BoardColumn,
  type SubmissionStats,
} from "@/components/panel/homework/homework-board";
import type { Prisma, AssignmentStatus, SubmissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_STATUSES: AssignmentStatus[] = ["DRAFT", "PUBLISHED", "CLOSED"];

type SP = {
  q?: string;
  status?: string;
  classroomId?: string;
};

const emptyStats = (): SubmissionStats => ({
  expected: 0,
  pending: 0,
  submitted: 0,
  graded: 0,
  late: 0,
  missed: 0,
});

export default async function AdminAssignments({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;

  const where: Prisma.AssignmentWhereInput = {};
  if (sp.q) {
    where.OR = [
      { title: { contains: sp.q, mode: "insensitive" } },
      { subject: { contains: sp.q, mode: "insensitive" } },
      { description: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.status && (VALID_STATUSES as string[]).includes(sp.status)) {
    where.status = sp.status as AssignmentStatus;
  }
  if (sp.classroomId) {
    where.classroomId = sp.classroomId;
  }

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: [{ classroomId: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      classroom: { select: { id: true, name: true, branch: true } },
      student: { select: { id: true, fullName: true } },
      teacher: { select: { id: true, fullName: true } },
    },
  });

  const assignmentIds = assignments.map((a) => a.id);
  const classroomIds = Array.from(
    new Set(assignments.map((a) => a.classroomId).filter((x): x is string => !!x)),
  );

  const [submissionGroups, classroomRosters, allClassrooms] = await Promise.all([
    assignmentIds.length === 0
      ? Promise.resolve([] as Array<{ assignmentId: string; status: SubmissionStatus; _count: { _all: number } }>)
      : prisma.assignmentSubmission.groupBy({
          by: ["assignmentId", "status"],
          where: { assignmentId: { in: assignmentIds } },
          _count: { _all: true },
        }),
    classroomIds.length === 0
      ? Promise.resolve([] as Array<{ classroomId: string; _count: { _all: number } }>)
      : prisma.classroomStudent.groupBy({
          by: ["classroomId"],
          where: { classroomId: { in: classroomIds }, leftAt: null },
          _count: { _all: true },
        }),
    prisma.classroom.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rosterByClassroom = new Map(
    classroomRosters.map((r) => [r.classroomId, r._count._all]),
  );
  const statsByAssignment = new Map<string, SubmissionStats>();
  for (const a of assignments) {
    statsByAssignment.set(a.id, emptyStats());
  }
  for (const g of submissionGroups) {
    const s = statsByAssignment.get(g.assignmentId);
    if (!s) continue;
    const n = g._count._all;
    if (g.status === "PENDING")        s.pending += n;
    else if (g.status === "SUBMITTED") s.submitted += n;
    else if (g.status === "GRADED")    s.graded += n;
    else if (g.status === "LATE")      s.late += n;
    else if (g.status === "MISSED")    s.missed += n;
  }

  const now = Date.now();
  for (const a of assignments) {
    const s = statsByAssignment.get(a.id)!;
    if (a.classroomId) {
      s.expected = rosterByClassroom.get(a.classroomId) ?? 0;
    } else if (a.studentId) {
      s.expected = 1;
    } else {
      s.expected = s.pending + s.submitted + s.graded + s.late + s.missed;
    }
    if (a.dueAt && a.dueAt.getTime() < now && s.missed === 0) {
      const accountedFor = s.pending + s.submitted + s.graded + s.late;
      const gap = Math.max(0, s.expected - accountedFor);
      s.missed = gap;
    }
  }

  const columnMap = new Map<string, BoardColumn>();
  const ensureColumn = (key: string, label: string, sublabel?: string, href?: string): BoardColumn => {
    let col = columnMap.get(key);
    if (!col) {
      col = { key, label, sublabel, href, assignments: [] };
      columnMap.set(key, col);
    }
    return col;
  };

  for (const a of assignments) {
    let col: BoardColumn;
    if (a.classroom) {
      const roster = rosterByClassroom.get(a.classroom.id) ?? 0;
      col = ensureColumn(
        `classroom:${a.classroom.id}`,
        a.classroom.name,
        `${roster} ogrenci${a.classroom.branch ? ` - ${a.classroom.branch}` : ""}`,
        `/panel/admin/siniflar/${a.classroom.id}`,
      );
    } else if (a.student) {
      col = ensureColumn("direct", "Bireysel odevler", "Tek ogrenciye atanmis");
    } else {
      col = ensureColumn("global", "Genis atama", "Hedef sinif/ogrenci yok");
    }
    const ba: BoardAssignment = {
      id: a.id,
      title: a.title,
      subject: a.subject,
      status: a.status,
      dueAt: a.dueAt,
      createdAt: a.createdAt,
      classroom: a.classroom,
      student: a.student,
      teacher: a.teacher,
      stats: statsByAssignment.get(a.id)!,
    };
    col.assignments.push(ba);
  }

  const columns = Array.from(columnMap.values()).sort((a, b) => {
    const aIsClass = a.key.startsWith("classroom:");
    const bIsClass = b.key.startsWith("classroom:");
    if (aIsClass && !bIsClass) return -1;
    if (!aIsClass && bIsClass) return 1;
    return a.label.localeCompare(b.label, "tr");
  });

  const weekFromNow = new Date(now + 7 * 86400000).toISOString().slice(0, 10);
  const todayIso = new Date(now).toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Odevler"
        subtitle={`${assignments.length} odev - ${columns.length} sutun${sp.q ? ` - "${sp.q}"` : ""}`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <SearchInput placeholder="Baslik, ders..." />
            <ExportButton entity="odevler" />
            <Link href="/panel/admin/odevler/yeni" className="od-btn od-btn-primary od-btn-sm">
              + Yeni odev
            </Link>
          </div>
        }
      />

      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <SavedViewsBar
          scope="homework"
          presets={[
            { name: "Tum odevler", filter: {} },
            { name: "Kontrol bekleyenler", filter: { status: "PUBLISHED", op: "AWAITING_GRADING" } },
            { name: "Gecikenler", filter: { status: "PUBLISHED", op: "OVERDUE" } },
            { name: "Bu hafta teslim", filter: { status: "PUBLISHED", dueFrom: todayIso, dueTo: weekFromNow } },
            { name: "Taslak", filter: { status: "DRAFT" } },
          ]}
        />
        <form method="GET" style={{ display: "inline-flex", gap: 6, marginLeft: "auto" }}>
          {sp.q ? <input type="hidden" name="q" value={sp.q} /> : null}
          {sp.status ? <input type="hidden" name="status" value={sp.status} /> : null}
          <select name="classroomId" defaultValue={sp.classroomId ?? ""} className="od-select">
            <option value="">Tum siniflar</option>
            {allClassrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit" className="od-btn od-btn-ghost od-btn-sm">Filtrele</button>
        </form>
      </div>

      <Card>
        <div style={{ padding: 12 }}>
          <HomeworkBoard
            columns={columns}
            totalCount={assignments.length}
            createHref="/panel/admin/odevler/yeni"
          />
        </div>
      </Card>
    </>
  );
}
