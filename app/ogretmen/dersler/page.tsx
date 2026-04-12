import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ExternalLink, BookOpen } from "lucide-react";
import { updateLessonNotesAction, completeLessonAction, cancelLessonAction } from "../actions";

export const dynamic = "force-dynamic";

type TeacherWithUser = Prisma.UserGetPayload<{
  include: {
    teacher: {
      include: {
        lessons: {
          include: { student: true; package: true };
        };
      };
    };
  };
}>;

type Tab = "upcoming" | "completed" | "cancelled" | "all";

const tabLabels: Record<Tab, string> = {
  upcoming: "Yaklaşan",
  completed: "Tamamlanan",
  cancelled: "İptal",
  all: "Tümü",
};

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-stone-100 text-stone-400 line-through",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

const fmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default async function OgretmenDerslerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const params = await searchParams;
  const tab = (params.tab as Tab) ?? "upcoming";
  const editId = params.edit ?? "";

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teacher: {
        include: {
          lessons: {
            include: { student: true, package: true },
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
    },
  })) as unknown as TeacherWithUser | null;

  const teacher = user?.teacher;
  if (!teacher) redirect("/ogretmen");

  const now = new Date();
  const allLessons = teacher.lessons;

  const filtered = {
    upcoming: allLessons.filter((l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now).reverse(),
    completed: allLessons.filter((l) => l.status === "COMPLETED"),
    cancelled: allLessons.filter((l) => l.status === "CANCELLED"),
    all: allLessons,
  }[tab];

  const counts = {
    upcoming: allLessons.filter((l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now).length,
    completed: allLessons.filter((l) => l.status === "COMPLETED").length,
    cancelled: allLessons.filter((l) => l.status === "CANCELLED").length,
    all: allLessons.length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Derslerim</h1>
        <p className="mt-1 text-sm text-stone-500">{allLessons.length} toplam ders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
        {(["upcoming", "completed", "cancelled", "all"] as Tab[]).map((t) => (
          <a
            key={t}
            href={`/ogretmen/dersler?tab=${t}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tabLabels[t]}
            <span className="ml-1.5 text-xs text-stone-400">{counts[t]}</span>
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">Bu kategoride ders yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 font-semibold text-stone-600">Tarih / Saat</th>
                  <th className="text-left px-4 py-3 font-semibold text-stone-600">Öğrenci</th>
                  <th className="text-left px-4 py-3 font-semibold text-stone-600">Paket</th>
                  <th className="text-left px-4 py-3 font-semibold text-stone-600">Süre</th>
                  <th className="text-left px-4 py-3 font-semibold text-stone-600">Meet</th>
                  <th className="text-left px-4 py-3 font-semibold text-stone-600">Durum</th>
                  <th className="text-right px-4 py-3 font-semibold text-stone-600">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((lesson) => {
                  const isEditing = editId === lesson.id;
                  const isPast = new Date(lesson.scheduledAt) < now;
                  const isOverdue = isPast && lesson.status === "SCHEDULED";

                  return (
                    <>
                      <tr
                        key={lesson.id}
                        className={`hover:bg-stone-50 transition-colors ${isEditing ? "bg-emerald-50/30" : ""} ${lesson.status === "CANCELLED" ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <p className={`font-medium ${isOverdue ? "text-amber-600" : "text-stone-800"}`}>
                            {fmt.format(new Date(lesson.scheduledAt))}
                          </p>
                          <p className="text-xs text-stone-400">
                            {fmtTime.format(new Date(lesson.scheduledAt))}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                              {lesson.student.fullName.charAt(0)}
                            </div>
                            <span className="font-medium text-stone-900">{lesson.student.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-500 text-xs">
                          {lesson.package?.name ?? <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-stone-500">{lesson.duration} dk</td>
                        <td className="px-4 py-3">
                          {lesson.googleMeetLink ? (
                            <a
                              href={lesson.googleMeetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg font-medium hover:bg-emerald-100 transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Meet
                            </a>
                          ) : (
                            <span className="text-stone-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[lesson.status]}`}>
                            {statusLabels[lesson.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {lesson.status === "SCHEDULED" && (
                            <a
                              href={`/ogretmen/dersler?tab=${tab}&edit=${isEditing ? "" : lesson.id}`}
                              className="text-xs text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 transition font-medium"
                            >
                              {isEditing ? "Kapat" : "Düzenle"}
                            </a>
                          )}
                        </td>
                      </tr>

                      {/* Completed notes row */}
                      {lesson.notes && !isEditing && (
                        <tr key={`${lesson.id}-notes`} className={lesson.status === "CANCELLED" ? "opacity-50" : ""}>
                          <td colSpan={7} className="px-4 pb-3 pt-0">
                            <div className={`rounded-lg px-3 py-2 text-xs ${
                              lesson.status === "COMPLETED"
                                ? "bg-amber-50 border border-amber-100 text-amber-800"
                                : "bg-stone-50 border border-stone-100 text-stone-600"
                            }`}>
                              <span className="font-semibold mr-1">Not:</span>
                              {lesson.notes}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Inline edit panel */}
                      {isEditing && (
                        <tr key={`${lesson.id}-edit`}>
                          <td colSpan={7} className="px-4 py-4 bg-stone-50 border-b border-stone-100">
                            <div className="space-y-4">
                              {/* Notes */}
                              <form action={updateLessonNotesAction} className="space-y-2">
                                <input type="hidden" name="lessonId" value={lesson.id} />
                                <input type="hidden" name="tab" value={tab} />
                                <label className="block text-xs font-semibold text-stone-700">Ders Notu</label>
                                <div className="flex gap-2">
                                  <textarea
                                    name="notes"
                                    rows={2}
                                    defaultValue={lesson.notes ?? ""}
                                    placeholder="Bu derse ait notlar (öğrenciye de görünür)..."
                                    className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                  />
                                  <button type="submit" className="shrink-0 text-xs bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 py-2 rounded-lg font-medium transition self-end">
                                    Kaydet
                                  </button>
                                </div>
                              </form>

                              {/* Mark complete */}
                              {isPast && (
                                <form action={completeLessonAction} className="space-y-2">
                                  <input type="hidden" name="lessonId" value={lesson.id} />
                                  <input type="hidden" name="tab" value={tab} />
                                  <div className="flex gap-2">
                                    <textarea
                                      name="notes"
                                      rows={2}
                                      defaultValue={lesson.notes ?? ""}
                                      placeholder="Son ders notu (opsiyonel)..."
                                      className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                    />
                                    <button type="submit" className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-semibold transition self-end">
                                      Tamamlandı ✓
                                    </button>
                                  </div>
                                </form>
                              )}

                              {/* Cancel */}
                              <form action={cancelLessonAction}>
                                <input type="hidden" name="lessonId" value={lesson.id} />
                                <input type="hidden" name="tab" value={tab} />
                                <button type="submit" className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                                  Dersi İptal Et
                                </button>
                              </form>
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
        )}
      </div>
    </div>
  );
}
