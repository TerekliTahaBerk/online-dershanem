import { prisma } from "@/lib/prisma";
import { PackageCreateForm } from "@/components/odk/admin/package-create-form";
import { togglePackageStatus } from "@/app/odk/admin/actions";
import { Package } from "lucide-react";

type PackageRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  priceCents: number;
  durationDays: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { packageExams: number; orders: number; entitlements: number };
};

async function getPackages(): Promise<PackageRow[]> {
  const rows = await prisma.odkPackage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { packageExams: true, orders: true, entitlements: true } },
    },
  });
  return rows as unknown as PackageRow[];
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

export default async function PaketlerPage() {
  const packages = await getPackages();

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Paketler</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {packages.length} paket · {packages.filter((p) => p.isActive).length} aktif
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Package list */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          {packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-8 w-8 text-stone-300 mb-3" />
              <p className="text-sm font-medium text-stone-500">Henüz paket yok</p>
              <p className="text-xs text-stone-400 mt-1">Sağdaki formdan ilk paketi oluştur.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Paket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Fiyat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Sınavlar</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Satış</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Durum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{pkg.title}</p>
                      {pkg.description && (
                        <p className="text-xs text-stone-400 mt-0.5 truncate max-w-[200px]">{pkg.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-700">{formatPrice(pkg.priceCents)}</td>
                    <td className="px-4 py-3 text-stone-600">{pkg._count.packageExams}</td>
                    <td className="px-4 py-3 text-stone-600">{pkg._count.orders}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pkg.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                        {pkg.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <form action={async () => { "use server"; await togglePackageStatus(pkg.id, !pkg.isActive); }}>
                        <button
                          type="submit"
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition"
                        >
                          {pkg.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create form */}
        <div>
          <PackageCreateForm />
        </div>
      </div>
    </div>
  );
}
