import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import { AdminTeachersTable, type AdminTeacherRow } from "@/components/od/domain/admin/admin-teachers-table";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  await requirePagePermission("teachers.read");
  const session = await getServerAuthSession();
  const currentUserId = session?.user?.id;

  const [teachers, savedViews] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: { updatedAt: "desc" },
      take: 500,
      include: {
        _count: { select: { lessons: true, classrooms: true } },
      },
    }),
    loadSavedViews("teachers", currentUserId),
  ]);

  const rows: AdminTeacherRow[] = teachers.map((t) => ({
    id: t.id,
    fullName: t.fullName,
    email: t.email,
    phone: t.phone,
    subjects: t.subjects,
    classroomCount: t._count.classrooms,
    lessonCount: t._count.lessons,
    status: t.status,
    userId: t.userId,
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Öğretmenler"
        description={`${rows.length} kayıt`}
        actions={
          <Link href="/v2/admin/ogretmenler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Öğretmen
            </Button>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState tone="sky" icon={GraduationCap} title="Henüz öğretmen yok" />
      ) : (
        <Card>
          <CardContent className="py-od-3">
            <AdminTeachersTable
              data={rows}
              savedViews={savedViews}
              currentUserId={currentUserId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
