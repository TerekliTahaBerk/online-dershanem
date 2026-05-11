import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bulkAssignPackageAction } from "../actions";
import { BulkAssignClient } from "./client";

type Props = {
  searchParams?: Promise<{ updated?: string; error?: string }>;
};

export default async function TopluAtaPage({ searchParams }: Props) {
  const params = await searchParams;
  const updated = params?.updated;
  const error = params?.error;

  const [packages, students] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { status: { in: ["ACTIVE", "NEW", "FOLLOW_UP"] } },
      select: { id: true, fullName: true, classLevel: true, examType: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/paketler" className="text-sm text-gray-500 hover:text-[var(--pd-ink-2)]">
          ← Paketlere Dön
        </Link>
        <h1 className="text-2xl font-bold text-[var(--pd-ink)] mt-2">Toplu Paket Ata</h1>
        <p className="text-sm text-gray-500 mt-1">
          Birden fazla öğrenciye aynı anda paket erişimi verin.
        </p>
      </div>

      {updated && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5">
          ✓ {updated} öğrenciye paket başarıyla atandı.
        </div>
      )}
      {error === "missing" && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5">
          Lütfen en az bir öğrenci ve bir paket seçin.
        </div>
      )}

      <BulkAssignClient
        packages={packages}
        students={students}
        action={bulkAssignPackageAction}
      />
    </div>
  );
}
