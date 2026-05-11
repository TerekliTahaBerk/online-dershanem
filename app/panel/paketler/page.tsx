import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, ExternalLink, Lock, Package } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { canSeeMarketplacePrice, canSeeOwnedPackagePrice, formatPriceMasked } from "@/lib/permissions";

type PackageRow = Prisma.PackageGetPayload<{
  include: {
    packageCourses: true;
  };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        packageEnrollments: {
          include: { package: true };
        };
      };
    };
  };
}>;

export default async function PanelPaketlerPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const role = session.user.role;
  const showMarketPrice = canSeeMarketplacePrice(role);
  const showOwnedPrice = canSeeOwnedPackagePrice(role);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          packageEnrollments: {
            include: { package: true },
            orderBy: { startsAt: "desc" },
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  if (!user?.student) redirect("/panel");

  const packages = (await prisma.package.findMany({
    where: { isActive: true },
    include: { packageCourses: true },
    orderBy: { price: "asc" },
  })) as unknown as PackageRow[];

  const activeEnrollment = user.student.packageEnrollments.find((enrollment) => enrollment.status === "ACTIVE") ?? null;
  const activePackageName = activeEnrollment?.package.name ?? user.student.activePackage;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Paketler</h1>
        <p className="mt-1 text-sm text-stone-500">
          Paketlerinizi, dahil kursları ve ödeme detaylarını keşfedin.
        </p>
      </div>

      {activePackageName ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Aktif paketiniz</p>
            <p className="text-sm text-emerald-700">{activePackageName}</p>
          </div>
        </div>
      ) : null}

      {packages.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Şu anda yeni paket bulunmuyor</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => {
            const subjects = pkg.subjects.split(",").map((subject) => subject.trim()).filter(Boolean);
            const isActive = activePackageName === pkg.name;
            return (
              <div
                key={pkg.id}
                className={`rounded-xl bg-white border p-6 flex flex-col ${isActive ? "border-emerald-300 shadow-sm" : "border-stone-200"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-stone-600" />
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <span className="text-xs font-medium text-stone-500 bg-stone-100 rounded-full px-2.5 py-1">
                      {pkg.lessonCount} ders
                    </span>
                    <span className="text-xs font-medium text-stone-500 bg-stone-100 rounded-full px-2.5 py-1">
                      {pkg.packageCourses.length} kurs
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-stone-900">{pkg.name}</h3>

                {pkg.description ? (
                  <p className="mt-1 text-sm text-stone-500 leading-relaxed">{pkg.description}</p>
                ) : null}

                {subjects.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subjects.map((subject) => (
                      <span
                        key={subject}
                        className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                ) : null}

                {isActive ? (
                  <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700">
                    Bu paket aktif üyeliğinizde görünüyor.
                  </div>
                ) : null}

                <div className="mt-auto pt-5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xl font-bold text-stone-900">
                      {showMarketPrice ? formatPriceMasked(pkg.price, true) : <span className="inline-flex items-center gap-1 text-stone-400 text-sm font-medium"><Lock className="w-3.5 h-3.5" /> Gizli</span>}
                    </p>
                  </div>
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
