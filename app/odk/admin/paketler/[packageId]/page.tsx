import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  addExamToPackage,
  removeExamFromPackage,
  addPackageAccessTag,
  removePackageAccessTag,
  togglePackageStatus,
} from "@/app/odk/admin/actions";
import { DeletePackageButton } from "@/components/odk/admin/exam-detail-editor";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

const familyLabels: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", LGS: "LGS", KPSS: "KPSS", ALES: "ALES",
};

async function getData(packageId: string) {
  const [pkg, allExams, allTags] = await Promise.all([
    prisma.odkPackage.findUnique({
      where: { id: packageId },
      include: {
        packageExams: {
          include: { exam: { select: { id: true, title: true, cadenceFamily: true, status: true } } },
          orderBy: { sortOrder: "asc" },
        },
        packageAccessTags: {
          include: { accessTag: { select: { id: true, title: true, key: true } } },
        },
      },
    }),
    prisma.odkExam.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, title: true, cadenceFamily: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.odkAccessTag.findMany({
      where: { isActive: true },
      select: { id: true, title: true, key: true },
      orderBy: { title: "asc" },
    }),
  ]);

  if (!pkg) return null;

  const linkedExamIds = new Set(pkg.packageExams.map((pe) => pe.exam.id));
  const linkedTagIds = new Set(pkg.packageAccessTags.map((pt) => pt.accessTag.id));

  return {
    pkg,
    availableExams: allExams.filter((e) => !linkedExamIds.has(e.id)),
    availableTags: allTags.filter((t) => !linkedTagIds.has(t.id)),
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Taslak",  className: "bg-stone-100 text-stone-500" },
  PUBLISHED: { label: "Yayında", className: "bg-emerald-50 text-emerald-700" },
  ARCHIVED:  { label: "Arşiv",   className: "bg-amber-50 text-amber-700" },
};

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const data = await getData(packageId);
  if (!data) notFound();

  const { pkg, availableExams, availableTags } = data;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/odk/admin/paketler"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Paketlere dön
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-900">{pkg.title}</h1>
              <p className="text-sm text-stone-500">
                {formatPrice(pkg.priceCents)}
                {pkg.durationDays ? ` · ${pkg.durationDays} gün` : " · Süresiz"}
                {" · "}
                <span className={`font-medium ${pkg.isActive ? "text-emerald-600" : "text-stone-400"}`}>
                  {pkg.isActive ? "Aktif" : "Pasif"}
                </span>
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await togglePackageStatus(packageId, !pkg.isActive);
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
            >
              {pkg.isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
          </form>
        </div>
        {pkg.description && (
          <p className="mt-3 text-sm text-stone-500 max-w-xl">{pkg.description}</p>
        )}
      </div>

      {/* Linked Exams */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Paketteki Sınavlar</h2>
            <p className="text-xs text-stone-400 mt-0.5">{pkg.packageExams.length} sınav bağlı</p>
          </div>
        </div>

        {pkg.packageExams.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">
            Henüz bu pakete sınav eklenmemiş.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {pkg.packageExams.map(({ exam }) => {
              const st = statusConfig[exam.status] ?? statusConfig.DRAFT;
              return (
                <div key={exam.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                      {familyLabels[exam.cadenceFamily] ?? exam.cadenceFamily}
                    </span>
                    <p className="truncate text-sm font-medium text-stone-900">{exam.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/odk/admin/sinavlar/${exam.id}`}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-500 border border-stone-200 hover:border-stone-300 transition"
                    >
                      Düzenle
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await removeExamFromPackage(packageId, exam.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition"
                      >
                        Çıkar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add exam */}
        {availableExams.length > 0 && (
          <form
            action={async (fd: FormData) => {
              "use server";
              const examId = fd.get("examId") as string;
              if (examId) await addExamToPackage(packageId, examId);
            }}
            className="flex items-center gap-2 pt-2 border-t border-stone-100"
          >
            <select
              name="examId"
              className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              defaultValue=""
            >
              <option value="" disabled>Sınav seç…</option>
              {availableExams.map((e) => (
                <option key={e.id} value={e.id}>
                  [{familyLabels[e.cadenceFamily] ?? e.cadenceFamily}] {e.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shrink-0"
            >
              Ekle
            </button>
          </form>
        )}
      </div>

      {/* Access Tags */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Erişim Etiketleri</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Bu etiketlere sahip öğrenciler paketi görebilir.
          </p>
        </div>

        {pkg.packageAccessTags.length === 0 ? (
          <p className="text-sm text-stone-400 py-2 text-center">
            Bu pakete erişim etiketi eklenmemiş — herkese açık sayılır.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pkg.packageAccessTags.map(({ accessTag }) => (
              <div key={accessTag.id} className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 pl-3 pr-1.5 py-1">
                <span className="text-xs font-medium text-emerald-700">{accessTag.title}</span>
                <form
                  action={async () => {
                    "use server";
                    await removePackageAccessTag(packageId, accessTag.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-full h-4 w-4 flex items-center justify-center text-emerald-500 hover:bg-emerald-200 hover:text-emerald-800 transition text-xs font-bold"
                  >
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {availableTags.length > 0 && (
          <form
            action={async (fd: FormData) => {
              "use server";
              const tagId = fd.get("tagId") as string;
              if (tagId) await addPackageAccessTag(packageId, tagId);
            }}
            className="flex items-center gap-2 pt-2 border-t border-stone-100"
          >
            <select
              name="tagId"
              className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              defaultValue=""
            >
              <option value="" disabled>Etiket seç…</option>
              {availableTags.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shrink-0"
            >
              Ekle
            </button>
          </form>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-red-50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-red-800">Tehlikeli İşlemler</h2>
        <p className="text-xs text-red-600">
          Paketi silmek geri alınamaz. Tüm ilişkili sipariş ve yetkilendirmeler de silinir.
        </p>
        <DeletePackageButton packageId={packageId} />
      </div>
    </div>
  );
}
