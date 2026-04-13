import { notFound, redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import { updateCampAction, deleteCampAction } from "../../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminKampDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerAuthSession();
  if (!getPanelAccess(session?.user).hasAdminPanel) redirect("/giris");

  const { id } = await params;
  const camp = await prisma.camp.findUnique({ where: { id } });
  if (!camp) notFound();

  const updateWithId = updateCampAction.bind(null, camp.id);
  const deleteWithId = deleteCampAction.bind(null, camp.id);

  const toDateInput = (d: Date | null) => (d ? d.toISOString().split("T")[0] : "");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/kamplar" className="text-stone-500 hover:text-stone-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Kampı Düzenle</h1>
          <p className="text-sm text-stone-500 mt-0.5 truncate max-w-sm">{camp.name}</p>
        </div>
      </div>

      <form action={updateWithId} className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Kamp Adı *</label>
            <input name="name" required defaultValue={camp.name} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Açıklama *</label>
            <textarea name="detail" required rows={3} defaultValue={camp.detail} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Kategori *</label>
            <select name="category" required defaultValue={camp.category} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="AYT">AYT Matematik</option>
              <option value="TYT">TYT Matematik</option>
              <option value="LGS">LGS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Kontenjan</label>
            <input name="quota" type="number" min={1} max={100} defaultValue={camp.quota} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Fiyat (₺)</label>
            <input name="price" type="number" step="0.01" min={0} defaultValue={(camp.price / 100).toFixed(2)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Orijinal Fiyat (₺)</label>
            <input name="originalPrice" type="number" step="0.01" min={0} defaultValue={(camp.originalPrice / 100).toFixed(2)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">PayTR Ödeme Linki</label>
            <input name="paytrLink" type="url" defaultValue={camp.paytrLink ?? ""} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="https://www.paytr.com/link/..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Başlangıç Tarihi</label>
            <input name="startDate" type="date" defaultValue={toDateInput(camp.startDate)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Bitiş Tarihi</label>
            <input name="endDate" type="date" defaultValue={toDateInput(camp.endDate)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Durum</label>
            <select name="isActive" defaultValue={camp.isActive ? "true" : "false"} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100">
          <form action={deleteWithId}>
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:text-red-800 transition px-2 py-1"
              onClick={(e) => {
                if (!confirm("Bu kampı silmek istediğinizden emin misiniz?")) e.preventDefault();
              }}
            >
              Sil
            </button>
          </form>
          <div className="flex items-center gap-3">
            <Link href="/admin/kamplar" className="text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-2">
              İptal
            </Link>
            <button type="submit" className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
              Kaydet
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
