import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Package, ExternalLink, BookOpen } from "lucide-react";
import type { Prisma } from "@prisma/client";

type PackageRow = Prisma.PackageGetPayload<Record<string, never>>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: { student: true };
}>;

function formatPrice(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(
    kurus / 100
  );
}

export default async function PanelPaketlerPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { student: true },
  }) as unknown as UserWithStudent | null;

  if (!user?.student) redirect("/panel");

  const packages = (await prisma.package.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  })) as unknown as PackageRow[];

  const activePackageName = user.student.activePackage;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Paketler</h1>
        <p className="mt-1 text-sm text-stone-500">
          Yayındaki paketleri ve ödeme bağlantılarını buradan görün.
        </p>
      </div>

      {activePackageName && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Kayıtlı aktif paketiniz</p>
            <p className="text-sm text-emerald-700">{activePackageName}</p>
          </div>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Şu anda yayında paket görünmüyor</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => {
            const subjects = pkg.subjects.split(",").map((s) => s.trim()).filter(Boolean);
            return (
              <div
                key={pkg.id}
                className="rounded-xl bg-white border border-stone-200 p-6 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-stone-600" />
                  </div>
                  <span className="text-xs font-medium text-stone-500 bg-stone-100 rounded-full px-2.5 py-1">
                    {pkg.lessonCount} ders
                  </span>
                </div>

                <h3 className="text-base font-semibold text-stone-900">{pkg.name}</h3>

                {pkg.description && (
                  <p className="mt-1 text-sm text-stone-500 leading-relaxed">{pkg.description}</p>
                )}

                {subjects.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subjects.map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-5 flex items-center justify-between">
                  <p className="text-xl font-bold text-stone-900">{formatPrice(pkg.price)}</p>
                  {pkg.paytrLink ? (
                    <a
                      href={pkg.paytrLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
                    >
                      Satın Al <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-stone-400">Detay için arayın</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
