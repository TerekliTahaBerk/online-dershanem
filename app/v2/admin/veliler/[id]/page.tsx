import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/od/ui/card";
import { Button } from "@/components/od/ui/button";
import { ParentStudentsManager } from "@/components/od/domain/parents/parent-students-manager";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function ParentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("parents.read");
  const { id } = await params;

  const [p, allStudents] = await Promise.all([
    prisma.parent.findUnique({
      where: { id },
      include: {
        students: {
          include: { student: { select: { id: true, fullName: true, status: true } } },
        },
      },
    }),
    prisma.student.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: 1000,
    }),
  ]);
  if (!p) return notFound();

  const links = p.students.map((ps) => ({
    studentId: ps.studentId,
    studentName: ps.student.fullName,
    studentStatus: ps.student.status,
    relationship: ps.relationship,
    isPrimary: ps.isPrimary,
  }));

  return (
    <div className="space-y-od-5">
      <PageHeader
        title={p.fullName}
        description={`${p.students.length} öğrenci bağlı`}
        actions={
          <Link href={`/v2/admin/veliler/${p.id}/duzenle`}>
            <Button variant="primary" size="sm">
              <Pencil className="mr-1 h-4 w-4" /> Düzenle
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>İletişim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-od-2 text-od-body">
          <div className="flex items-center gap-od-2 text-od-mute">
            <Mail className="h-4 w-4" /> {p.email ?? "—"}
          </div>
          <div className="flex items-center gap-od-2 text-od-mute">
            <Phone className="h-4 w-4" /> {p.phone ?? "—"}
          </div>
          {p.notes && <p className="pt-od-2 text-od-tiny text-od-mute whitespace-pre-line">{p.notes}</p>}
        </CardContent>
      </Card>

      <ParentStudentsManager parentId={p.id} links={links} studentOptions={allStudents} />
    </div>
  );
}
