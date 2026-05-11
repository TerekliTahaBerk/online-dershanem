import { Users, Plus } from "lucide-react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { Button } from "@/components/od/ui/button";
import { StudentsTable, type StudentRow } from "@/components/od/domain/students/students-table";
import type { SavedViewItem } from "@/components/od/data/saved-views-menu";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const STATUSES = new Set([
  "NEW",
  "FOLLOW_UP",
  "ACTIVE",
  "AT_RISK",
  "COMPLETED",
  "INACTIVE",
]);

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function buildWhere(sp: SP): Prisma.StudentWhereInput {
  const status = asArray(sp.status).filter((s) => STATUSES.has(s)) as any[];
  const classLevel = asArray(sp.classLevel);
  const examType = asArray(sp.examType);
  const city = asArray(sp.city);
  const tag = asArray(sp.tag);

  const where: Prisma.StudentWhereInput = {};
  if (status.length) where.status = { in: status };
  if (classLevel.length) where.classLevel = { in: classLevel };
  if (examType.length) where.examType = { in: examType };
  if (city.length) where.city = { in: city };
  if (tag.length) where.tags = { some: { tagId: { in: tag } } };
  return where;
}

async function loadStudents(where: Prisma.StudentWhereInput): Promise<StudentRow[]> {
  const rows = await prisma.student.findMany({
    where,
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
      userId: true,
      tags: {
        select: {
          tag: { select: { id: true, key: true, label: true, color: true } },
        },
      },
      _count: { select: { lessons: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const where = buildWhere(sp);
  const session = await getServerAuthSession();
  const currentUserId = session?.user?.id;

  const [students, tags, classLevels, examTypes, cities, savedViewsRaw] = await Promise.all([
    loadStudents(where),
    prisma.tag.findMany({
      where: { scope: "STUDENT" },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    }),
    prisma.student.findMany({
      where: { classLevel: { not: null } },
      distinct: ["classLevel"],
      select: { classLevel: true },
      orderBy: { classLevel: "asc" },
    }),
    prisma.student.findMany({
      where: { examType: { not: null } },
      distinct: ["examType"],
      select: { examType: true },
      orderBy: { examType: "asc" },
    }),
    prisma.student.findMany({
      where: { city: { not: null } },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
    currentUserId
      ? prisma.savedView.findMany({
          where: {
            scope: "students",
            OR: [{ ownerId: currentUserId }, { isShared: true }],
          },
          orderBy: [{ isShared: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            scope: true,
            filter: true,
            isShared: true,
            ownerId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const savedViews: SavedViewItem[] = savedViewsRaw.map((v) => ({
    id: v.id,
    name: v.name,
    scope: v.scope,
    isShared: v.isShared,
    ownerId: v.ownerId,
    filter: (v.filter as Record<string, string | string[]>) ?? {},
  }));

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
      <StudentsTable
        data={students}
        tags={tags}
        filterOptions={{
          classLevels: classLevels.map((c) => c.classLevel!).filter(Boolean),
          examTypes: examTypes.map((c) => c.examType!).filter(Boolean),
          cities: cities.map((c) => c.city!).filter(Boolean),
        }}
        savedViews={savedViews}
        currentUserId={currentUserId}
      />
    </div>
  );
}
