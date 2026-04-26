import Link from "next/link";
import { createPackageAction } from "../actions";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function YeniPaketPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/paketler" className="text-sm text-gray-500 hover:text-gray-700">← Paketlere Dön</Link>
        <h1 className="text-2xl font-bold text-[#091413] mt-2">Yeni Paket Oluştur</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg mb-4">
          {error === "missing" ? "Lütfen zorunlu alanları doldurun." : "Geçersiz değer. Fiyat ve ders sayısı sayısal olmalıdır."}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form action={createPackageAction} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Paket Adı *</label>
              <input type="text" name="name" required placeholder="Örn: TYT Matematik - 10 Ders Paketi"
                className={inputCls} />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Paket Türü *</label>
              <select name="type" required className={inputCls}>
                <option value="COURSE">📚 Ders Paketi</option>
                <option value="EXAM">📝 Deneme Paketi</option>
              </select>
              <p className="text-xs text-gray-400">Ders paketi birebir özel ders, deneme paketi ise sınav/deneme erişimi içerir.</p>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Fiyat (₺) *</label>
              <input type="number" name="price" required min="0" step="0.01" placeholder="599.00"
                className={inputCls} />
            </div>

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Açıklama</label>
              <textarea name="description" rows={2} placeholder="Paket hakkında kısa açıklama..."
                className={`${inputCls} resize-none`} />
            </div>

            {/* Lesson Count */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Ders / Sınav Sayısı *</label>
              <input type="number" name="lessonCount" required min="1" placeholder="10"
                className={inputCls} />
            </div>

            {/* Subjects */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Dersler / Konular *</label>
              <input type="text" name="subjects" required placeholder="Örn: TYT Matematik, Geometri"
                className={inputCls} />
            </div>

            {/* PayTR Link */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">PayTR Ödeme Linki</label>
              <input type="url" name="paytrLink" placeholder="https://www.paytr.com/link/..."
                className={inputCls} />
              <p className="text-xs text-gray-400">PayTR panelinden aldığınız ödeme linkini buraya yapıştırın.</p>
            </div>

            {/* Active */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isActive" defaultChecked className="w-4 h-4 accent-[#546B41] rounded" />
                <span className="text-sm font-medium text-gray-700">Aktif (öğrencilere görünür)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              Paketi Kaydet
            </button>
            <Link href="/admin/paketler" className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
