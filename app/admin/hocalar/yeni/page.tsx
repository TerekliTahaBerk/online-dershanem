import Link from "next/link";
import { createTeacherAction } from "../actions";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function YeniHocaPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/hocalar" className="text-sm text-gray-500 hover:text-[var(--pd-ink-2)]">← Hocalara Dön</Link>
        <h1 className="text-2xl font-bold text-[var(--pd-ink)] mt-2">Yeni Hoca Ekle</h1>
      </div>

      {error === "missing" && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg mb-4">
          Ad soyad ve branşlar zorunludur.
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--pd-line)] p-6">
        <form action={createTeacherAction} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Ad Soyad *</label>
              <input type="text" name="fullName" required placeholder="Ahmet Yılmaz"
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">E-posta</label>
              <input type="email" name="email" placeholder="ahmet@example.com"
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Telefon</label>
              <input type="tel" name="phone" placeholder="0532 000 00 00"
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
            </div>

            {/* Subjects */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Branşlar *</label>
              <input type="text" name="subjects" required placeholder="Örn: TYT Matematik, AYT Matematik, Geometri"
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              <p className="text-xs text-[var(--pd-muted)]">Virgülle ayırarak girebilirsiniz.</p>
            </div>

            {/* Bio */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-[var(--pd-ink-2)]">Bio / Açıklama</label>
              <textarea name="bio" rows={3} placeholder="Hoca hakkında kısa tanıtım..."
                className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)] resize-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="bg-[var(--pd-accent)] hover:bg-[var(--pd-accent-hover)] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              Hocayı Kaydet
            </button>
            <Link href="/admin/hocalar" className="text-sm text-gray-500 hover:text-[var(--pd-ink-2)] px-4 py-2.5">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
