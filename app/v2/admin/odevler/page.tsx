import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ClipboardList, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import {
  AdminAssignmentsTable,
  type AdminAssignmentRow,
} from "@/components/od/domain/admin/admin-assignments-table";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const STATUSES = new Set(["DRAFT", "PUBLISHED", "CLOSED"]);

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requirePagePermission("assignments.read");
  const sp = await searchParams;
  const session = await getServerAuthSession();
  const currentUserId = session?.user?.id;
  const status = asArray(sp.status).filter((s) => STATUSES.has(s)) as any[];

  const where: Prisma.AssignmentWhereInput = {};
  if (status.length) where.status = { in: status };

  const [assignments, savedViews] = await Promise.all([
    prisma.assignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        teacher: { select: { id: true, fullName: true } },
        classroom: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true } },
        _count: { select: { submissions: true } },
      },
    }),
    loadSavedViews("assignments", currentUserId),
  ]);

  if (assignments.length === 0 && status.length === 0) {
    return (
      <div className="space-y-od-5">
        <PageHeader
          title="Ödevler"
          description="Henüz ödev yok"
          actions={
            <Link href="/v2/admin/odevler/yeni">
              <Button variant="primary" size="sm">
                <Plus className="mr-1 h-4 w-4" /> Yeni Ödev
              </Button>
            </Link>
          }
        />
        <EmptyState tone="blush" icon={ClipboardList} title="Henüz ödev yok" />
      </div>
    );
  }

  const rows: AdminAssignmentRow[] = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    subject: a.subject,
    teacherName: a.teacher?.fullName ?? "—",
    targetLabel: a.classroom
      ? a.classroom.name
      : a.student
      ? a.student.fullName
      : "Tüm öğrenciler",
    targetTone: a.classroom ? "lavender" : a.student ? "mint" : "sky",
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    submissionCount: a._count.submissions,
    status: a.status,
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Ödevler"
        description={rows.length + " ödev · seç, filtrele veya dışa aktar"}
        actions={
          <Link href="/v2/admin/odevler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Ödev
            </Button>
          </Link>
        }
      />
      <AdminAssignmentsTable data={rows} savedViews={savedViews} currentUserId={currentUserId} />
    </div>
  );
}
