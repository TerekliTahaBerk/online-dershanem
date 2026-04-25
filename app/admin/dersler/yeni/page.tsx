import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createLessonAction } from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ error?: string; studentId?: string }>;
};

export default async function YeniDersPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params?.error;
  const prefilledStudentId = params?.studentId ?? "";

  const [students, teachers, packages] = await Promise.all([
    prisma.student.findMany({
      where: { status: { in: ["ACTIVE", "NEW", "FOLLOW_UP"] } },
      select: { id: true, fullName: true, phone: true, examType: true },
      orderBy: { fullName: "asc" }
    }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true, subjects: true },
      orderBy: { fullName: "asc" }
    }),
    prisma.package.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  // Default scheduledAt: tomorrow at 10:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultScheduledAt = tomorrow.toISOString().slice(0, 16);

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/dersler" className="text-sm text-gray-500 hover:text-gray-700">← Derslere Dön</Link>
        <h1 className="text-2xl font-bold text-[#091413] mt-2">Yeni Ders Ekle</h1>
      </div>

      {error === "missing" && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg mb-4">
          Lütfen öğrenci, hoca ve ders saatini doldurun.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form action={createLessonAction} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Student */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Öğrenci *</label>
              <select name="studentId" defaultValue={prefilledStudentId} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]">
                <option value="">Öğrenci seçin...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} — {s.phone}{s.examType ? ` (${s.examType})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Ders Başlığı</label>
              <input type="text" name="title" placeholder="Örn: Türev Soruları, Paragraf Çözümü"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Ders Konusu / Branş</label>
              <input type="text" name="subject" placeholder="Örn: Matematik, Türkçe"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            {/* Teacher */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Hoca *</label>
              <select name="teacherId" required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]">
                <option value="">Hoca seçin...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} — {t.subjects}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && (
                <p className="text-xs text-amber-600">
                  Aktif hoca yok.{" "}
                  <Link href="/admin/hocalar/yeni" className="underline">Hoca ekle →</Link>
                </p>
              )}
            </div>

            {/* Package */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Paket (opsiyonel)</label>
              <select name="packageId"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]">
                <option value="">Paketsiz</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Scheduled At */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tarih ve Saat *</label>
              <input type="datetime-local" name="scheduledAt" defaultValue={defaultScheduledAt} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Süre (dakika)</label>
              <input type="number" name="duration" defaultValue="60" min="15" max="240" step="15"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
            </div>

            {/* Google Meet Link */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Google Meet Linki</label>
              <input type="url" name="googleMeetLink" placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
              <p className="text-xs text-gray-400">Dersi oluşturduktan sonra da ekleyebilirsiniz.</p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Notlar</label>
              <textarea name="notes" rows={3} placeholder="Ders konusu, özel notlar..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41] resize-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              Dersi Kaydet
            </button>
            <Link href="/admin/dersler"
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
