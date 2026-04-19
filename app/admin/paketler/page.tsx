import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/admin";
import { togglePackageAction, deletePackageAction } from "./actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Plus, ExternalLink, BookOpen, CheckCircle, XCircle } from "lucide-react";

type PackageWithCount = Prisma.PackageGetPayload<{
  include: { _count: { select: { lessons: true } } };
}>;

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ updated?: string; edit?: string }>;
};

export default async function PaketlerPage({ searchParams }: Props) {
  const params = await searchParams;
  const updated = params?.updated ?? "";
  const editId = params?.edit ?? "";

  const packages = await prisma.package.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { lessons: true } } }
  }) as unknown as PackageWithCount[];

  const activeCount = packages.filter((p) => p.isActive).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#091413]">Paketler</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {packages.length} paket · {activeCount} aktif
          </p>
        </div>
        <Link
          href="/admin/paketler/yeni"
          className="flex items-center gap-2 bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Yeni Paket
        </Link>
      </div>

      {/* Flash */}
      {(updated === "created" || updated === "package" || updated === "toggle") && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          {updated === "created" ? "Paket oluşturuldu." : updated === "toggle" ? "Paket durumu güncellendi." : "Paket güncellendi."}
        </div>
      )}

      {/* Package Grid */}
      {packages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Henüz paket yok</p>
          <Link href="/admin/paketler/yeni" className="mt-3 inline-block text-sm text-[#546B41] hover:underline">
            İlk paketi oluştur →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const isEditing = editId === pkg.id;
            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-xl border transition-all ${
                  pkg.isActive ? "border-gray-200" : "border-gray-100 opacity-70"
                } ${isEditing ? "ring-2 ring-[#546B41]/30" : ""}`}
              >
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#091413] truncate">{pkg.name}</h3>
                        {pkg.isActive ? (
                          <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-gray-400 shrink-0" />
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{pkg.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-[#091413]">{formatPrice(pkg.price)}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs bg-[#DCCCAC]/30 text-[#435633] px-2 py-0.5 rounded-full font-medium">
                      <BookOpen size={10} />
                      {pkg.lessonCount} ders
                    </span>
                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-50 rounded-full">
                      {pkg.subjects}
                    </span>
                  </div>

                  {/* Stats */}
                  <p className="mt-2 text-xs text-gray-400">{pkg._count.lessons} ders bu pakete bağlı</p>

                  {/* PayTR Link */}
                  {pkg.paytrLink && (
                    <div className="mt-3">
                      <a
                        href={pkg.paytrLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink size={11} />
                        PayTR Ödeme Linki
                      </a>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/paketler/duzenle/${pkg.id}`}
                      className="text-xs text-[#546B41] hover:text-[#435633] font-medium border border-[#546B41]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#DCCCAC]/20 transition-colors"
                    >
                      Düzenle
                    </Link>

                    <form action={togglePackageAction}>
                      <input type="hidden" name="packageId" value={pkg.id} />
                      <input type="hidden" name="currentIsActive" value={String(pkg.isActive)} />
                      <button
                        type="submit"
                        className={`text-xs font-medium border rounded-lg px-2.5 py-1.5 transition-colors ${
                          pkg.isActive
                            ? "text-red-600 border-red-200 hover:bg-red-50"
                            : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        }`}
                      >
                        {pkg.isActive ? "Pasife Al" : "Aktife Al"}
                      </button>
                    </form>

                    <ConfirmDeleteButton
                      action={deletePackageAction}
                      hiddenFields={{ packageId: pkg.id }}
                      message={`"${pkg.name}" paketini kalıcı olarak silmek istediğinizden emin misiniz?`}
                      className="text-xs font-medium border border-red-200 text-red-700 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors"
                    >
                      Sil
                    </ConfirmDeleteButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
