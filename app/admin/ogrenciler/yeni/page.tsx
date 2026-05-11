import Link from "next/link";
import { createStudentAction } from "../actions";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

const EXAM_TYPES = ["TYT", "AYT", "YKS", "LGS", "KPSS", "DGS", "Diğer"];
const CLASS_LEVELS = ["9. Sınıf", "10. Sınıf", "11. Sınıf", "12. Sınıf", "Mezun", "8. Sınıf", "Diğer"];

export default async function YeniOgrenciPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/ogrenciler" className="text-sm text-gray-500 hover:text-[var(--pd-ink-2)]">← Öğrencilere Dön</Link>
        <h1 className="text-2xl font-bold text-[var(--pd-ink)] mt-2">Yeni Öğrenci Ekle</h1>
        <p className="text-sm text-gray-500 mt-1">Manuel öğrenci kaydı oluştur. Form başvurusundan otomatik oluşturulanlardan ayrı tutulur.</p>
      </div>

      {error === "missing" && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg mb-5">
          Ad soyad ve telefon numarası zorunludur.
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--pd-line)] p-6">
        <form action={createStudentAction} className="space-y-6">
          {/* Temel Bilgiler */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--pd-ink-2)] mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--pd-accent)] text-white text-xs flex items-center justify-center font-bold">1</span>
              Temel Bilgiler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Ad Soyad *</label>
                <input type="text" name="fullName" required placeholder="Ayşe Yılmaz"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Telefon *</label>
                <input type="tel" name="phone" required placeholder="0532 000 00 00"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">E-posta</label>
                <input type="email" name="email" placeholder="ayse@example.com"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Şehir</label>
                <input type="text" name="city" placeholder="İstanbul"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">İlçe</label>
                <input type="text" name="district" placeholder="Kadıköy"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
            </div>
          </div>

          {/* Akademik Bilgiler */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--pd-ink-2)] mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--pd-accent)] text-white text-xs flex items-center justify-center font-bold">2</span>
              Akademik Bilgiler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Okul</label>
                <input type="text" name="schoolName" placeholder="Okul adı"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Sınıf</label>
                <select name="classLevel"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]">
                  <option value="">Seçin...</option>
                  {CLASS_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Sınav Türü</label>
                <select name="examType"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]">
                  <option value="">Seçin...</option>
                  {EXAM_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Hedef</label>
                <input type="text" name="targetGoal" placeholder="Hedef üniversite / puan"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Zayıf Dersler</label>
                <input type="text" name="weakLessons" placeholder="Matematik, Fizik..."
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
            </div>
          </div>

          {/* Paket & Veli */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--pd-ink-2)] mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--pd-accent)] text-white text-xs flex items-center justify-center font-bold">3</span>
              Paket & Veli Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Aktif Paket</label>
                <input type="text" name="activePackage" placeholder="Örn: TYT Matematik - 10 Ders"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Veli Ad Soyad</label>
                <input type="text" name="parentFullName" placeholder="Veli adı"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Veli Telefon</label>
                <input type="tel" name="parentPhone" placeholder="0532 000 00 00"
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)]" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-[var(--pd-ink-3)]">Notlar</label>
                <textarea name="notes" rows={3} placeholder="Öğrenci hakkında notlar..."
                  className="w-full border border-[var(--pd-line)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pd-accent-soft)] focus:border-[var(--pd-accent)] resize-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit"
              className="bg-[var(--pd-accent)] hover:bg-[var(--pd-accent-hover)] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              Öğrenciyi Kaydet
            </button>
            <Link href="/admin/ogrenciler" className="text-sm text-gray-500 hover:text-[var(--pd-ink-2)] px-4 py-2.5">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
