import type { Prisma } from "@prisma/client";
import { requirePagePermission } from "@/lib/rbac/define-action";
import { prisma } from "@/lib/prisma";
import { PrintShell } from "@/components/od/print/print-shell";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NEW: "Yeni",
  FOLLOW_UP: "Takip",
  ACTIVE: "Aktif",
  AT_RISK: "Riskli",
  COMPLETED: "Tamamlandı",
  INACTIVE: "Pasif",
};
const STATUSES = new Set(Object.keys(STATUS_LABEL));

type SP = Record<string, string | string[] | undefined>;

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

function describeFilters(sp: SP): string[] {
  const out: string[] = [];
  const status = asArray(sp.status).map((s) => STATUS_LABEL[s] ?? s);
  if (status.length) out.push(`Durum: ${status.join(", ")}`);
  const cl = asArray(sp.classLevel);
  if (cl.length) out.push(`Sınıf: ${cl.join(", ")}`);
  const ex = asArray(sp.examType);
  if (ex.length) out.push(`Sınav: ${ex.join(", ")}`);
  const ci = asArray(sp.city);
  if (ci.length) out.push(`Şehir: ${ci.join(", ")}`);
  const tg = asArray(sp.tag);
  if (tg.length) out.push(`${tg.length} etiket`);
  return out;
}

export default async function StudentsPrintPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requirePagePermission("students.read");
  const sp = await searchParams;
  const where = buildWhere(sp);

  const rows = await prisma.student.findMany({
    where,
    select: {
      fullName: true,
      phone: true,
      email: true,
      classLevel: true,
      examType: true,
      city: true,
      status: true,
      activePackage: true,
      tags: { select: { tag: { select: { label: true } } } },
      _count: { select: { lessons: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  const filters = describeFilters(sp);

  return (
    <PrintShell
      title="Öğrenci Listesi"
      subtitle={`${rows.length} kayıt · ${new Date().toLocaleString("tr-TR")}`}
      meta={filters.length ? filters : ["Filtre uygulanmadı"]}
    >
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left p-1.5">Ad Soyad</th>
            <th className="text-left p-1.5">Telefon</th>
            <th className="text-left p-1.5">E-posta</th>
            <th className="text-left p-1.5">Sınıf</th>
            <th className="text-left p-1.5">Sınav</th>
            <th className="text-left p-1.5">Şehir</th>
            <th className="text-left p-1.5">Durum</th>
            <th className="text-left p-1.5">Paket</th>
            <th className="text-right p-1.5">Ders</th>
            <th className="text-left p-1.5">Etiketler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-gray-300 even:bg-gray-50"
            >
              <td className="p-1.5 font-medium">{r.fullName}</td>
              <td className="p-1.5 font-mono">{r.phone}</td>
              <td className="p-1.5">{r.email ?? "—"}</td>
              <td className="p-1.5">{r.classLevel ?? "—"}</td>
              <td className="p-1.5">{r.examType ?? "—"}</td>
              <td className="p-1.5">{r.city ?? "—"}</td>
              <td className="p-1.5">{STATUS_LABEL[r.status] ?? r.status}</td>
              <td className="p-1.5">{r.activePackage ?? "—"}</td>
              <td className="p-1.5 text-right">{r._count.lessons}</td>
              <td className="p-1.5">
                {r.tags.map((t) => t.tag.label).join(", ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintShell>
  );
}
