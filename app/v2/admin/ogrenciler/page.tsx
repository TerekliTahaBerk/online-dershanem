import { Users, Plus } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { Button } from "@/components/od/ui/button";
import { StudentsTable, type StudentRow } from "@/components/od/domain/students/students-table";

export const dynamic = "force-dynamic";

async function loadStudents(): Promise<StudentRow[]> {
  const rows = await prisma.student.findMany({
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      classLevel: true,
      examType: true,
      city: true,
      status: true,
      activePackage: true,
      updatedAt: true,
      tags: {
        select: {
          tag: { select: { id: true, key: true, label: true, color: true } }
        }
      },
      _count: { select: { lessons: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 200
  });

  return rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString()
  }));
}

export default async function AdminStudentsPage() {
  const [students, tags] = await Promise.all([
    loadStudents(),
    prisma.tag.findMany({
      where: { scope: "STUDENT" },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Öğrenciler"
        description={
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-od-mute" />
            Toplam {students.length} öğrenci · CRM görünümü
          </span>
        }
        actions={
          <Link href="/v2/admin/ogrenciler/yeni">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Yeni Öğrenci
            </Button>
          </Link>
        }
      />
      <StudentsTable data={students} tags={tags} />
    </div>
  );
}
