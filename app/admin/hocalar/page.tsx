import Link from "next/link";
import { TeacherStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { teacherStatusLabels, teacherStatusOptions } from "@/lib/admin";
import { updateTeacherAction, toggleTeacherStatusAction } from "./actions";
import { Plus, GraduationCap, CalendarDays } from "lucide-react";

type TeacherWithRelations = Prisma.TeacherGetPayload<{
  include: {
    _count: { select: { lessons: true } };
    lessons: { take: 1 };
  };
}>;

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    updated?: string;
    edit?: string;
    status?: string;
  }>;
};

export default async function HocalarPage({ searchParams }: Props) {
  const params = await searchParams;
  const updated = params?.updated ?? "";
  const editId = params?.edit ?? "";
  const statusFilter = params?.status ?? "";

  const teachers = await prisma.teacher.findMany({
    where: statusFilter ? { status: statusFilter as TeacherStatus } : undefined,
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    include: {
      _count: { select: { lessons: true } },
      lessons: {
        where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        take: 1
      }
    }
  }) as unknown as TeacherWithRelations[];

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/hocalar?${p.toString()}`;
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#091413]">Hocalar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {teachers.length} hoca · {teachers.filter((t) => t.status === "ACTIVE").length} aktif
          </p>
        </div>
        <Link
          href="/admin/hocalar/yeni"
          className="flex items-center gap-2 bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Yeni Hoca
        </Link>
      </div>

      {/* Flash */}
      {(updated === "created" || updated === "teacher" || updated === "toggle") && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          {updated === "created" ? "Hoca eklendi." : updated === "toggle" ? "Hoca durumu güncellendi." : "Hoca güncellendi."}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <Link
          href="/admin/hocalar"
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            !statusFilter ? "bg-[#408A71] text-white border-[#408A71]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Tümü
        </Link>
        {teacherStatusOptions.map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: s })}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              statusFilter === s ? "bg-[#408A71] text-white border-[#408A71]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {teacherStatusLabels[s]}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {teachers.length === 0 ? (
          <div className="py-16 text-center">
            <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Hoca bulunamadı</p>
            <Link href="/admin/hocalar/yeni" className="mt-3 inline-block text-sm text-[#408A71] hover:underline">
              İlk hocayı ekle →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Hoca</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">İletişim</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Branşlar</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Toplam Ders</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Sonraki Ders</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Durum</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachers.map((teacher) => {
                  const isEditing = editId === teacher.id;
                  const nextLesson = teacher.lessons[0];
                  return (
                    <>
                      <tr key={teacher.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? "bg-[#B0E4CC]/10" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#285A48]/10 flex items-center justify-center text-[#285A48] font-semibold text-sm shrink-0">
                              {teacher.fullName.charAt(0)}
                            </div>
                            <p className="font-medium text-[#091413]">{teacher.fullName}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {teacher.email && <p className="text-sm">{teacher.email}</p>}
                          {teacher.phone && <p className="text-xs text-gray-400">{teacher.phone}</p>}
                          {!teacher.email && !teacher.phone && <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-[#B0E4CC]/30 text-[#285A48] px-2 py-0.5 rounded-full font-medium">
                            {teacher.subjects}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <CalendarDays size={13} className="text-gray-400" />
                            {teacher._count.lessons}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {nextLesson ? (
                            <>
                              <p className="font-medium text-gray-700">
                                {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(nextLesson.scheduledAt))}
                              </p>
                              <p className="text-gray-400">
                                {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(nextLesson.scheduledAt))}
                              </p>
                            </>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${
                            teacher.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                          }`}>
                            {teacherStatusLabels[teacher.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: teacher.id })}
                            className="text-xs text-[#408A71] hover:text-[#285A48] font-medium border border-[#408A71]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors"
                          >
                            {isEditing ? "Kapat" : "Düzenle"}
                          </Link>
                        </td>
                      </tr>

                      {/* Inline edit */}
                      {isEditing && (
                        <tr key={`${teacher.id}-edit`}>
                          <td colSpan={7} className="px-4 py-4 bg-[#B0E4CC]/5 border-b border-[#B0E4CC]/30">
                            <form action={updateTeacherAction} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <input type="hidden" name="teacherId" value={teacher.id} />
                              <input type="hidden" name="returnTo" value={buildUrl({ edit: teacher.id })} />

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Ad Soyad</label>
                                <input type="text" name="fullName" required defaultValue={teacher.fullName}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">E-posta</label>
                                <input type="email" name="email" defaultValue={teacher.email ?? ""}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Telefon</label>
                                <input type="tel" name="phone" defaultValue={teacher.phone ?? ""}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Branşlar</label>
                                <input type="text" name="subjects" required defaultValue={teacher.subjects}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30" />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Durum</label>
                                <select name="status" defaultValue={teacher.status}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30">
                                  {teacherStatusOptions.map((s) => (
                                    <option key={s} value={s}>{teacherStatusLabels[s]}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1 col-span-2 md:col-span-3">
                                <label className="text-xs font-medium text-gray-600">Bio / Açıklama</label>
                                <textarea name="bio" rows={2} defaultValue={teacher.bio ?? ""}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 resize-none" />
                              </div>

                              <div className="col-span-2 md:col-span-3 flex gap-3">
                                <button type="submit"
                                  className="bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                                  Kaydet
                                </button>
                                <Link href={buildUrl({ edit: "" })} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                                  İptal
                                </Link>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
