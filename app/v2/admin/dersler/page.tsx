import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarDays, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import {
  AdminLessonsTable,
  type AdminLessonRow,
} from "@/components/od/domain/admin/admin-lessons-table";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const STATUSES = new Set(["SCHEDULED", "COMPLETED", "CANCELLED"]);

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requirePagePermission("lessons.read");
  const sp = await searchParams;
  const session = await getServerAuthSession();
  const currentUserId = session?.user?.id;

  const status = asArray(sp.status).filter((s) => STATUSES.has(s)) as any[];
  const fromStr = typeof sp.from === "string" ? sp.from : undefined;
  const toStr = typeof sp.to === "string" ? sp.to : undefined;

  const where: Prisma.LessonWhereInput = {};
  if (status.length) where.status = { in: status };
  if (fromStr || toStr) {
    where.scheduledAt = {};
    if (fromStr) where.scheduledAt.gte = new Date(fromStr);
    if (toStr) {
      const end = new Date(toStr);
      end.setHours(23, 59, 59, 999);
      where.scheduledAt.lte = end;
    }
  }

  const lessons = await prisma.lesson.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    take: 500,
    include: {
      student: { select: { id: true, fullName: true } },
      teacher: { select: { id: true, fullName: true } },
    },
  });

  const savedViews = await loadSavedViews("lessons", currentUserId);

  if (lessons.length === 0 && status.length === 0 && !fromStr && !toStr) {
    return (
      <div className="space-y-od-5">
        <PageHeader
          title="Dersler"
          description="Henüz ders kaydı yok"
          actions={
            <Link href="/v2/admin/dersler/yeni">
              <Button variant="primary" size="sm">
                <Plus className="mr-1 h-4 w-4" /> Yeni Ders
              </Button>
            </Link>
          }
        />
        <EmptyState tone="sky" icon={CalendarDays} title="Henüz ders yok" />
      </div>
    );
  }

  const rows: AdminLessonRow[] = lessons.map((l) => ({
    id: l.id,
    scheduledAt: l.scheduledAt.toISOString(),
    studentName: l.student?.fullName ?? "—",
    teacherName: l.teacher?.fullName ?? "—",
    title: l.title,
    subject: l.subject,
    duration: l.duration,
    status: l.status,
    googleMeetLink: l.googleMeetLink,
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Dersler"
        description={rows.length + " ders · seç, filtrele veya dışa aktar"}
        actions={
          <Link href="/v2/admin/dersler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Ders
            </Button>
          </Link>
        }
      />
      <AdminLessonsTable data={rows} savedViews={savedViews} currentUserId={currentUserId} />
    </div>
  );
}
