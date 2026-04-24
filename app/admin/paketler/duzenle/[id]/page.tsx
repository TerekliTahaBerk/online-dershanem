import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updatePackageAction } from "../../actions";

type Props = { params: Promise<{ id: string }> };

export default async function PaketDuzenlePage({ params }: Props) {
  const { id } = await params;
  const pkg = await prisma.package.findUnique({ where: { id } });

  if (!pkg) notFound();

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/paketler" className="text-sm text-gray-500 hover:text-gray-700">← Paketlere Dön</Link>
        <h1 className="text-2xl font-bold text-[#091413] mt-2">Paketi Düzenle</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form action={updatePackageAction} className="space-y-5">
          <input type="hidden" name="packageId" value={pkg.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Paket Adı *</label>
              <input type="text" name="name" required defaultValue={pkg.name}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Paket Türü *</label>
              <select name="type" required defaultValue={pkg.type}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]">
                <option value="COURSE">📚 Ders Paketi</option>
                <option value="EXAM">📝 Deneme Paketi</option>
              </select>
              <p className="text-xs text-gray-400">Ders paketi birebir özel ders, deneme paketi ise sınav/deneme erişimi içerir.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Fiyat (₺) *</label>
              <input type="number" name="price" required min="0" step="0.01" defaultValue={(pkg.price / 100).toFixed(2)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Açıklama</label>
              <textarea name="description" rows={2} defaultValue={pkg.description ?? ""}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41] resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Ders / Sınav Sayısı *</label>
              <input type="number" name="lessonCount" required min="1" defaultValue={pkg.lessonCount}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Dersler / Konular *</label>
              <input type="text" name="subjects" required defaultValue={pkg.subjects}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">PayTR Ödeme Linki</label>
              <input type="url" name="paytrLink" defaultValue={pkg.paytrLink ?? ""}
                placeholder="https://www.paytr.com/link/..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isActive" defaultChecked={pkg.isActive} className="w-4 h-4 accent-[#546B41] rounded" />
                <span className="text-sm font-medium text-gray-700">Aktif</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              Değişiklikleri Kaydet
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
