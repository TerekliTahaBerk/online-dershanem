import Link from "next/link";
import { Prisma, StudentStatus } from "@prisma/client";

type StudentWithNextLesson = Prisma.StudentGetPayload<{
  include: { lessons: { take: 1 } };
}>;
import { prisma } from "@/lib/prisma";
import {
  buildWhatsAppLink,
  formatDateTime,
  formatDateTimeLocalInput,
  studentStatusLabels,
  studentStatusOptions
} from "@/lib/admin";
import { updateStudentAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    q?: string;
    studentStatus?: string;
    tasks?: string;
    updated?: string;
    edit?: string;
    page?: string;
  }>;
};

function buildWhere(filters: { q: string; studentStatus: string; tasks: string }): Prisma.StudentWhereInput | undefined {
  const conditions: Prisma.StudentWhereInput[] = [];

  if (filters.q) {
    conditions.push({
      OR: [
        { fullName: { contains: filters.q, mode: "insensitive" } },
        { phone: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
        { schoolName: { contains: filters.q, mode: "insensitive" } },
        { activePackage: { contains: filters.q, mode: "insensitive" } }
      ]
    });
  }

  if (filters.studentStatus) {
    conditions.push({ status: filters.studentStatus as StudentStatus });
  }

  if (filters.tasks === "1") {
    conditions.push({ nextActionAt: { not: null } });
  }

  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

const STATUS_COLORS: Record<StudentStatus, string> = {
  NEW: "bg-gray-100 text-gray-600",
  FOLLOW_UP: "bg-yellow-50 text-yellow-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  AT_RISK: "bg-red-50 text-red-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  INACTIVE: "bg-gray-100 text-gray-400"
};

export default async function OgrencilerPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params?.q ?? "";
  const studentStatus = params?.studentStatus ?? "";
  const tasks = params?.tasks ?? "";
  const updated = params?.updated ?? "";
  const editId = params?.edit ?? "";
  const page = Math.max(0, parseInt(params?.page ?? "0", 10));
  const PAGE_SIZE = 30;

  const filters = { q, studentStatus, tasks };
  const where = buildWhere(filters);

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        lessons: {
          where: { status: "SCHEDULED" },
          orderBy: { scheduledAt: "asc" },
          take: 1
        }
      },
      orderBy: [{ nextActionAt: "asc" }, { status: "asc" }, { updatedAt: "desc" }],
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE
    }) as unknown as StudentWithNextLesson[],
    prisma.student.count({ where })
  ]);

  const editStudent = editId ? students.find((s) => s.id === editId) ?? null : null;

  const buildUrl = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (studentStatus) p.set("studentStatus", studentStatus);
    if (tasks) p.set("tasks", tasks);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/ogrenciler?${p.toString()}`;
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#091413]">Öğrenciler</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString("tr-TR")} öğrenci bulundu</p>
        </div>
      </div>

      {/* Flash message */}
      {updated === "student" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-lg">
          Öğrenci güncellendi.
        </div>
      )}
      {updated === "student-error" && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2.5 rounded-lg">
          Güncelleme başarısız.
        </div>
      )}

      {/* Filters */}
      <form method="GET" action="/admin/ogrenciler" className="flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="İsim, telefon, okul..."
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 focus:border-[#408A71]"
        />
        <select
          name="studentStatus"
          defaultValue={studentStatus}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30"
        >
          <option value="">Tüm Durumlar</option>
          {studentStatusOptions.map((s) => (
            <option key={s} value={s}>{studentStatusLabels[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer">
          <input type="checkbox" name="tasks" value="1" defaultChecked={tasks === "1"} className="accent-[#408A71]" />
          Görevli
        </label>
        <button
          type="submit"
          className="bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Filtrele
        </button>
        {(q || studentStatus || tasks) && (
          <Link href="/admin/ogrenciler" className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">
            Temizle
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Öğrenci</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">İletişim</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sınav / Sınıf</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Paket</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sonraki Görev</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Öğrenci bulunamadı.
                  </td>
                </tr>
              )}
              {students.map((student) => {
                const waLink = buildWhatsAppLink(student.phone);
                const nextLesson = student.lessons[0];
                const isEditing = editId === student.id;
                return (
                  <>
                    <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? "bg-[#B0E4CC]/10" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#B0E4CC]/40 flex items-center justify-center text-[#285A48] font-semibold text-xs shrink-0">
                            {student.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-[#091413]">{student.fullName}</p>
                            {student.city && <p className="text-xs text-gray-400">{student.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {waLink ? (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-[#408A71] hover:underline">
                            {student.phone}
                          </a>
                        ) : (
                          <span className="text-gray-600">{student.phone}</span>
                        )}
                        {student.email && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-40">{student.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span>{student.examType ?? "—"}</span>
                        {student.classLevel && <p className="text-xs text-gray-400">{student.classLevel}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {student.activePackage ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[student.status]}`}>
                          {studentStatusLabels[student.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {student.taskLabel && (
                          <p className="font-medium text-gray-700 mb-0.5">{student.taskLabel}</p>
                        )}
                        {student.nextActionAt ? (
                          <span className={new Date(student.nextActionAt) < new Date() ? "text-red-600 font-medium" : ""}>
                            {formatDateTime(student.nextActionAt)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={isEditing ? buildUrl({ edit: "" }) : buildUrl({ edit: student.id })}
                          className="text-xs text-[#408A71] hover:text-[#285A48] font-medium border border-[#408A71]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors"
                        >
                          {isEditing ? "Kapat" : "Düzenle"}
                        </Link>
                      </td>
                    </tr>

                    {/* Inline edit row */}
                    {isEditing && (
                      <tr key={`${student.id}-edit`}>
                        <td colSpan={7} className="px-4 py-4 bg-[#B0E4CC]/5 border-b border-[#B0E4CC]/30">
                          <form action={updateStudentAction} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <input type="hidden" name="studentId" value={student.id} />
                            <input type="hidden" name="returnTo" value={buildUrl({ edit: student.id })} />

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Durum</label>
                              <select
                                name="status"
                                defaultValue={student.status}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#408A71]/30"
                              >
                                {studentStatusOptions.map((s) => (
                                  <option key={s} value={s}>{studentStatusLabels[s]}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Aktif Paket</label>
                              <input
                                type="text"
                                name="activePackage"
                                defaultValue={student.activePackage ?? ""}
                                placeholder="Paket adı..."
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Görev Etiketi</label>
                              <input
                                type="text"
                                name="taskLabel"
                                defaultValue={student.taskLabel ?? ""}
                                placeholder="Görev açıklaması..."
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Sonraki Eylem</label>
                              <input
                                type="datetime-local"
                                name="nextActionAt"
                                defaultValue={formatDateTimeLocalInput(student.nextActionAt)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30"
                              />
                            </div>

                            <div className="space-y-1 col-span-2 md:col-span-3 lg:col-span-4">
                              <label className="text-xs font-medium text-gray-600">Notlar</label>
                              <textarea
                                name="notes"
                                defaultValue={student.notes ?? ""}
                                placeholder="Notlar..."
                                rows={2}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#408A71]/30 resize-none"
                              />
                            </div>

                            <div className="col-span-2 md:col-span-3 lg:col-span-4 flex gap-3">
                              <button
                                type="submit"
                                className="bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                              >
                                Kaydet
                              </button>
                              <Link
                                href={buildUrl({ edit: "" })}
                                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                              >
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

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
            </span>
            <div className="flex gap-2">
              {page > 0 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="text-xs text-[#408A71] border border-[#408A71]/30 rounded-lg px-3 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors"
                >
                  Önceki
                </Link>
              )}
              {(page + 1) * PAGE_SIZE < total && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="text-xs text-[#408A71] border border-[#408A71]/30 rounded-lg px-3 py-1.5 hover:bg-[#B0E4CC]/20 transition-colors"
                >
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
