import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { AssignmentCreateForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function YeniOdevPage() {
  const { teacherId, isAdmin } = await requireTeacher();
  if (!teacherId && !isAdmin) redirect("/giris");

  const classrooms = teacherId
    ? await prisma.classroom.findMany({
        where: isAdmin ? {} : { teachers: { some: { teacherId } } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Teacher'ın "kendi" öğrencileri = sınıflarındaki öğrenciler
  const students = teacherId
    ? await prisma.student.findMany({
        where: isAdmin
          ? {}
          : {
              classrooms: {
                some: { classroom: { teachers: { some: { teacherId } } } },
              },
            },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
        take: 200,
      })
    : [];

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/ogretmen/odevler" className="pd-link" style={{ fontSize: 12 }}>
            ← Ödevler
          </Link>
          <h1 className="pd-page-title">Yeni Ödev</h1>
        </div>
      </div>

      <AssignmentCreateForm classrooms={classrooms} students={students} />
    </div>
  );
}
