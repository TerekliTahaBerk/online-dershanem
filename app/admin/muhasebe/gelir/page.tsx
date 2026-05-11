import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { EntryForm } from "../_components/entry-form";

export const dynamic = "force-dynamic";

export default async function GelirPage() {
  await requireAdmin();
  const [students, teachers] = await Promise.all([
    prisma.student.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" }, take: 500 }),
    prisma.teacher.findMany({
      select: { id: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="pd-page">
      <div className="pd-page-header">
        <div>
          <Link href="/admin/muhasebe" className="pd-link" style={{ fontSize: 12 }}>← Muhasebe</Link>
          <h1 className="pd-page-title">Gelir Ekle</h1>
        </div>
      </div>
      <EntryForm
        type="INCOME"
        students={students}
        teachers={teachers.map((t: any) => ({ id: t.id, name: t.user?.name ?? "—" }))}
      />
    </div>
  );
}
