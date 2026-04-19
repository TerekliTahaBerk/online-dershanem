import Link from "next/link";
import { Prisma, LessonStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatDateTimeLocalInput, lessonStatusLabels, lessonStatusOptions } from "@/lib/admin";
import { updateLessonAction, cancelLessonAction, deleteLessonAction } from "./actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { ExternalLink, Plus } from "lucide-react";

type LessonWithRelations = Prisma.LessonGetPayload<{
  include: {
    student: { select: { id: true; fullName: true; phone: true } };
    teacher: { select: { id: true; fullName: true } };
    package: { select: { name: true } };
  };
}>;

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    teacherId?: string;
    from?: string;
    to?: string;
    updated?: string;
    edit?: string;
    page?: string;
  }>;
};

function buildWhere(f: {
  q: string;
  status: string;
  teacherId: string;
  from: string;
  to: string;
}): Prisma.LessonWhereInput | undefined {
  const conditions: Prisma.LessonWhereInput[] = [];

  if (f.q) {
    conditions.push({
      OR: [
        { student: { fullName: { contains: f.q, mode: "insensitive" } } },
        { teacher: { fullName: { contains: f.q, mode: "insensitive" } } }
      ]
    });
  }
  if (f.status) conditions.push({ status: f.status as LessonStatus });
  if (f.teacherId) conditions.push({ teacherId: f.teacherId });
  if (f.from || f.to) {
    const range: Prisma.DateTimeFilter = {};
    if (f.from) range.gte = new Date(f.from);
    if (f.to) range.lte = new Date(f.to);
    conditions.push({ scheduledAt: range });
  }

  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

const STATUS_COLORS: Record<LessonStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600 line-through"
};

export default async function DerslerPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params?.q ?? "";
  const status = params?.status ?? "";
  const teacherId = params?.teacherId ?? "";
  const from = params?.from ?? "";
  const to = params?.to ?? "";
  const updated = params?.updated ?? "";
  const editId = params?.edit ?? "";
  const page = Math.max(0, parseInt(params?.page ?? "0", 10));
  const PAGE_SIZE = 30;

  const filters = { q, status, teacherId, from, to };
  const where = buildWhere(filters);

  const [lessons, total, teachers] = await Promise.all([
    prisma.lesson.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
        teacher: { select: { id: true, fullName: true } },
        package: { select: { name: true } }
      },
      orderBy: { scheduledAt: "asc" },
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE
    }) as unknown as LessonWithRelations[],
    prisma.lesson.count({ where }),
    prisma.teacher.findMany({ where: { status: "ACTIVE" }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } })
  ]);

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (teacherId) p.set("teacherId", teacherId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/dersler?${p.toString()}`;
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#091413]">Dersler</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString("tr-TR")} ders bulundu</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/dersler/takvim"
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            Takvim
          </Link>
          <Link
            href="/admin/dersler/yeni"
            className="flex items-center gap-2 bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Yeni Ders
          </Link>
        </div>
      </div>

      {/* Flash */}
      {updated === "lesson" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          Ders güncellendi.
        </div>
      )}
      {updated === "cancelled" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-lg">
          Ders iptal edildi.
        </div>
      )}

      {/* Filters */}
      <form method="GET" action="/admin/dersler" className="flex flex-wrap gap-3">
        <input type="text" name="q" defaultValue={q} placeholder="Öğrenci veya hoca adı..."
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 focus:border-[#546B41]" />
        <select name="status" defaultValue={status}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30">
          <option value="">Tüm Durumlar</option>
          {lessonStatusOptions.map((s) => (
            <option key={s} value={s}>{lessonStatusLabels[s]}</option>
          ))}
        </select>
        <select name="teacherId" defaultValue={teacherId}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30">
          <option value="">Tüm Hocalar</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={from}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30" />
        <input type="date" name="to" defaultValue={to}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30" />
        <button type="submit"
          className="bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Filtrele
        </button>
        {(q || status || teacherId || from || to) && (
          <Link href="/admin/dersler" className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">Temizle</Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tarih / Saat</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Öğrenci</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Hoca</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Paket</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Süre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Meet Linki</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Durum</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lessons.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    Ders bulunamadı.{" "}
                    <Link href="/admin/dersler/yeni" className="text-[#546B41] hover:underline">Yeni ders ekle →</Link>
                  </td>
                </tr>
              )}
              {lessons.map((lesson) => {
                const isEditing = editId === lesson.id;
                const isPast = new Date(lesson.scheduledAt) < new Date();
                return (
                  <>
                    <tr key={lesson.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? "bg-[#DCCCAC]/10" : ""} ${lesson.status === "CANCELLED" ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <p className={`font-medium ${isPast && lesson.status === "SCHEDULED" ? "text-amber-600" : "text-[#091413]"}`}>
                          {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(lesson.scheduledAt))}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(lesson.scheduledAt))}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/ogrenciler?edit=${lesson.student.id}`} className="font-medium text-[#091413] hover:text-[#546B41]">
                          {lesson.student.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{lesson.teacher.fullName}</td>
                      <td className="px-4 py-3 text-gray-500">{lesson.package?.name ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{lesson.duration} dk</td>
                      <td className="px-4 py-3">
                        {lesson.googleMeetLink ? (
                          <a
                            href={lesson.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Meet <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[lesson.status]}`}>
                          {lessonStatusLabels[lesson.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {lesson.status !== "CANCELLED" && (
                          <Link
                            href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: lesson.id })}
                            className="text-xs text-[#546B41] hover:text-[#435633] font-medium border border-[#546B41]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#DCCCAC]/20 transition-colors"
                          >
                            {isEditing ? "Kapat" : "Düzenle"}
                          </Link>
                        )}
                      </td>
                    </tr>

                    {/* Inline edit */}
                    {isEditing && (
                      <tr key={`${lesson.id}-edit`}>
                        <td colSpan={8} className="px-4 py-4 bg-[#DCCCAC]/5 border-b border-[#DCCCAC]/30">
                          <div className="flex flex-col gap-4">
                            <form action={updateLessonAction} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <input type="hidden" name="lessonId" value={lesson.id} />
                              <input type="hidden" name="returnTo" value={buildUrl({ edit: lesson.id })} />

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Durum</label>
                                <select name="status" defaultValue={lesson.status}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#546B41]/30">
                                  {lessonStatusOptions.map((s) => (
                                    <option key={s} value={s}>{lessonStatusLabels[s]}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Tarih / Saat</label>
                                <input type="datetime-local" name="scheduledAt" defaultValue={formatDateTimeLocalInput(lesson.scheduledAt)}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30" />
                              </div>

                              <div className="space-y-1 col-span-2">
                                <label className="text-xs font-medium text-gray-600">Google Meet Linki</label>
                                <input type="url" name="googleMeetLink" defaultValue={lesson.googleMeetLink ?? ""}
                                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30" />
                              </div>

                              <div className="space-y-1 col-span-2 md:col-span-4">
                                <label className="text-xs font-medium text-gray-600">Notlar</label>
                                <textarea name="notes" defaultValue={lesson.notes ?? ""} rows={2}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#546B41]/30 resize-none" />
                              </div>

                              <div className="col-span-2 md:col-span-4 flex gap-3">
                                <button type="submit"
                                  className="bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                                  Kaydet
                                </button>
                                <Link href={buildUrl({ edit: "" })} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                                  İptal
                                </Link>
                              </div>
                            </form>

                            {lesson.status === "SCHEDULED" && (
                              <form action={cancelLessonAction}>
                                <input type="hidden" name="lessonId" value={lesson.id} />
                                <input type="hidden" name="returnTo" value={buildUrl({ edit: "" })} />
                                <button type="submit"
                                  className="text-xs text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors">
                                  Dersi İptal Et
                                </button>
                              </form>
                            )}
                            <ConfirmDeleteButton
                              action={deleteLessonAction}
                              hiddenFields={{ lessonId: lesson.id, returnTo: buildUrl({ edit: "" }) }}
                              message="Bu dersi kalıcı olarak silmek istediğinizden emin misiniz?"
                              className="text-xs text-red-700 hover:text-red-900 border border-red-300 bg-red-50 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors"
                            >
                              Dersi Sil
                            </ConfirmDeleteButton>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}</span>
            <div className="flex gap-2">
              {page > 0 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="text-xs text-[#546B41] border border-[#546B41]/30 rounded-lg px-3 py-1.5 hover:bg-[#DCCCAC]/20 transition-colors">
                  Önceki
                </Link>
              )}
              {(page + 1) * PAGE_SIZE < total && (
                <Link href={buildUrl({ page: String(page + 1) })} className="text-xs text-[#546B41] border border-[#546B41]/30 rounded-lg px-3 py-1.5 hover:bg-[#DCCCAC]/20 transition-colors">
                  Sonraki
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
