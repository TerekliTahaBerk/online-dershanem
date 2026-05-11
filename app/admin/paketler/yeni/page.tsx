import Link from "next/link";
import { createPackageAction } from "../actions";

const inputCls = "w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function YeniPaketPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/paketler" className="text-sm text-gray-500 hover:text-[var(--pd-ink-2)]">← Paketlere Dön</Link>
        <h1 className="text-2xl font-bold text-[var(--pd-ink)] mt-2">Yeni Paket Oluştur</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg mb-4">
          {error === "missing" ? "Lütfen zorunlu alanları doldurun." : "Geçersiz değer. Fiyat ve ders sayısı sayısal olmalıdır."}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--pd-line)] p-6">
        <form action={createPackageAction} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Paket Adı *</label>
              <input type="text" name="name" required placeholder="Örn: TYT Matematik - 10 Ders Paketi"
                className={inputCls} />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Paket Türü *</label>
              <select name="type" required className={inputCls}>
                <option value="COURSE">📚 Ders Paketi</option>
                <option value="EXAM">📝 Deneme Paketi</option>
              </select>
              <p className="text-xs text-[var(--pd-muted)]">Ders paketi birebir özel ders, deneme paketi ise sınav/deneme erişimi içerir.</p>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Fiyat (₺) *</label>
              <input type="number" name="price" required min="0" step="0.01" placeholder="599.00"
                className={inputCls} />
            </div>

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Açıklama</label>
              <textarea name="description" rows={2} placeholder="Paket hakkında kısa açıklama..."
                className={`${inputCls} resize-none`} />
            </div>

            {/* Lesson Count */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Ders / Sınav Sayısı *</label>
              <input type="number" name="lessonCount" required min="1" placeholder="10"
                className={inputCls} />
            </div>

            {/* Subjects */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Dersler / Konular *</label>
              <input type="text" name="subjects" required placeholder="Örn: TYT Matematik, Geometri"
                className={inputCls} />
            </div>

            {/* PayTR Link */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">PayTR Ödeme Linki</label>
              <input type="url" name="paytrLink" placeholder="https://www.paytr.com/link/..."
                className={inputCls} />
              <p className="text-xs text-[var(--pd-muted)]">PayTR panelinden aldığınız ödeme linkini buraya yapıştırın.</p>
            </div>

            {/* Active */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isActive" defaultChecked className="w-4 h-4 accent-[var(--pd-accent)] rounded" />
                <span className="text-sm font-medium text-[var(--pd-ink-2)]">Aktif (öğrencilere görünür)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="bg-[var(--pd-accent)] hover:bg-[var(--pd-accent-hover)] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              Paketi Kaydet
            </button>
            <Link href="/admin/paketler" className="text-sm text-gray-500 hover:text-[var(--pd-ink-2)] px-4 py-2.5">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
