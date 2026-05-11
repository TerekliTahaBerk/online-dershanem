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
        <Link href="/admin/paketler" className="text-sm text-gray-500 hover:text-[var(--pd-ink-2)]">← Paketlere Dön</Link>
        <h1 className="text-2xl font-bold text-[var(--pd-ink)] mt-2">Paketi Düzenle</h1>
      </div>

      <div className="bg-white rounded-xl border border-[var(--pd-line)] p-6">
        <form action={updatePackageAction} className="space-y-5">
          <input type="hidden" name="packageId" value={pkg.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Paket Adı *</label>
              <input type="text" name="name" required defaultValue={pkg.name}
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Paket Türü *</label>
              <select name="type" required defaultValue={pkg.type}
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]">
                <option value="COURSE">📚 Ders Paketi</option>
                <option value="EXAM">📝 Deneme Paketi</option>
              </select>
              <p className="text-xs text-[var(--pd-muted)]">Ders paketi birebir özel ders, deneme paketi ise sınav/deneme erişimi içerir.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Fiyat (₺) *</label>
              <input type="number" name="price" required min="0" step="0.01" defaultValue={(pkg.price / 100).toFixed(2)}
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Açıklama</label>
              <textarea name="description" rows={2} defaultValue={pkg.description ?? ""}
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)] resize-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Ders / Sınav Sayısı *</label>
              <input type="number" name="lessonCount" required min="1" defaultValue={pkg.lessonCount}
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Dersler / Konular *</label>
              <input type="text" name="subjects" required defaultValue={pkg.subjects}
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">PayTR Ödeme Linki</label>
              <input type="url" name="paytrLink" defaultValue={pkg.paytrLink ?? ""}
                placeholder="https://www.paytr.com/link/..."
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isActive" defaultChecked={pkg.isActive} className="w-4 h-4 accent-[var(--pd-accent)] rounded" />
                <span className="text-sm font-medium text-[var(--pd-ink-2)]">Aktif</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="bg-[var(--pd-accent)] hover:bg-[var(--pd-accent-hover)] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              Değişiklikleri Kaydet
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
