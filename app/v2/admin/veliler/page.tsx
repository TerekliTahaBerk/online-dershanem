import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { HeartHandshake, Plus } from "lucide-react";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent } from "@/components/od/ui/card";
import { Button } from "@/components/od/ui/button";
import { EmptyState } from "@/components/od/feedback/empty-state";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { getServerAuthSession } from "@/lib/auth";
import { loadSavedViews } from "@/lib/services/saved-views/loader";
import { AdminParentsTable, type AdminParentRow } from "@/components/od/domain/admin/admin-parents-table";

export const dynamic = "force-dynamic";

export default async function ParentsPage() {
  await requirePagePermission("parents.read");
  const session = await getServerAuthSession();
  const currentUserId = session?.user?.id;

  const [parents, savedViews] = await Promise.all([
    prisma.parent.findMany({
      orderBy: { updatedAt: "desc" },
      take: 500,
      include: {
        students: { include: { student: { select: { id: true, fullName: true } } } },
      },
    }),
    loadSavedViews("parents", currentUserId),
  ]);

  const rows: AdminParentRow[] = parents.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    userId: p.userId,
    studentCount: p.students.length,
    studentNames: p.students.map((ps) => ps.student.fullName),
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Veliler"
        description={`${rows.length} kayıt`}
        actions={
          <Link href="/v2/admin/veliler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Veli
            </Button>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState tone="yellow" icon={HeartHandshake} title="Veli kaydı yok" />
      ) : (
        <Card>
          <CardContent className="py-od-3">
            <AdminParentsTable
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
