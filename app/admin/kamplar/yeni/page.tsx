import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { createCampAction } from "../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminKampYeniPage() {
  const session = await getServerAuthSession();
  if (!getPanelAccess(session?.user).hasAdminPanel) redirect("/giris");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/kamplar" className="text-stone-500 hover:text-stone-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Yeni Kamp</h1>
          <p className="text-sm text-stone-500 mt-0.5">Yeni bir kamp ekleyin</p>
        </div>
      </div>

      <form action={createCampAction} className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Kamp Adı *</label>
            <input name="name" required className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="AYT Belirleyici Konular Kampı" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Açıklama *</label>
            <textarea name="detail" required rows={3} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Kamp içeriği hakkında kısa açıklama..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Kategori *</label>
            <select name="category" required className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="AYT">AYT Matematik</option>
              <option value="TYT">TYT Matematik</option>
              <option value="LGS">LGS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Kontenjan</label>
            <input name="quota" type="number" min={1} max={100} defaultValue={8} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Fiyat (₺)</label>
            <input name="price" type="number" step="0.01" min={0} defaultValue={2000} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Orijinal Fiyat (₺)</label>
            <input name="originalPrice" type="number" step="0.01" min={0} defaultValue={5000} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">PayTR Ödeme Linki</label>
            <input name="paytrLink" type="url" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="https://www.paytr.com/link/..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Başlangıç Tarihi</label>
            <input name="startDate" type="date" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Bitiş Tarihi</label>
            <input name="endDate" type="date" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">Durum</label>
            <select name="isActive" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
          <Link href="/admin/kamplar" className="text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-2">
            İptal
          </Link>
          <button type="submit" className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
