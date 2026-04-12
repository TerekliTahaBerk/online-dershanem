import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Plus, Pencil, Tent, ToggleLeft, ToggleRight } from "lucide-react";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  AYT: "AYT Matematik",
  TYT: "TYT Matematik",
  LGS: "LGS",
};

const categoryColors: Record<string, string> = {
  AYT: "bg-blue-100 text-blue-700",
  TYT: "bg-purple-100 text-purple-700",
  LGS: "bg-orange-100 text-orange-700",
};

function formatPrice(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(kurus / 100);
}

export default async function AdminKamplarPage() {
  const session = await getServerAuthSession();
  if (session?.user?.role !== "ADMIN") redirect("/giris");

  const camps = await prisma.camp.findMany({
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  const ayt = camps.filter((c) => c.category === "AYT");
  const tyt = camps.filter((c) => c.category === "TYT");
  const lgs = camps.filter((c) => c.category === "LGS");

  const groups = [
    { label: "AYT Matematik Kampları", camps: ayt },
    { label: "TYT Matematik Kampları", camps: tyt },
    { label: "LGS Kampları", camps: lgs },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Kamplar</h1>
          <p className="mt-1 text-sm text-stone-500">{camps.length} kamp · {camps.filter((c) => c.isActive).length} aktif</p>
        </div>
        <Link
          href="/admin/kamplar/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          Yeni Kamp
        </Link>
      </div>

      {camps.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center">
          <Tent className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Henüz kamp yok</p>
          <p className="text-xs text-stone-400 mt-1">İlk kampı eklemek için "Yeni Kamp" butonuna tıklayın.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ label, camps: groupCamps }) => {
            if (groupCamps.length === 0) return null;
            return (
              <div key={label}>
                <h2 className="text-base font-semibold text-stone-700 mb-3">{label}</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {groupCamps.map((camp) => (
                    <div
                      key={camp.id}
                      className={`rounded-xl border bg-white p-5 flex flex-col gap-3 ${camp.isActive ? "border-stone-200" : "border-stone-100 opacity-60"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${categoryColors[camp.category]}`}>
                            {categoryLabels[camp.category]}
                          </span>
                          <h3 className="text-sm font-semibold text-stone-900 leading-tight">{camp.name}</h3>
                        </div>
                        <div className="shrink-0">
                          {camp.isActive ? (
                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-stone-300" />
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{camp.detail}</p>

                      <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>Kontenjan: <strong className="text-stone-700">{camp.quota}</strong></span>
                        <span className="font-semibold text-stone-900">{formatPrice(camp.price)}</span>
                      </div>

                      {camp.startDate && (
                        <p className="text-xs text-stone-400">
                          {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(camp.startDate)}
                          {camp.endDate && ` – ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(camp.endDate)}`}
                        </p>
                      )}

                      <div className="pt-2 border-t border-stone-100">
                        <Link
                          href={`/admin/kamplar/duzenle/${camp.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition"
                        >
                          <Pencil className="w-3 h-3" />
                          Düzenle
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
