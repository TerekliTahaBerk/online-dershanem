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
  CANCELLED: "bg-stone-100 text-stone-500",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

const fmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
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
    <div className="max-w-4xl space-y-6">
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

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center">
          <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-500">Bu kategoride ders yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lesson) => {
            const isEditing = editId === lesson.id;
            const isPast = new Date(lesson.scheduledAt) < now;

            return (
              <div key={lesson.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Student */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                      {lesson.student.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900">{lesson.student.fullName}</p>
                      <p className="text-xs text-stone-400">{lesson.package?.name ?? "Paket yok"}</p>
                    </div>
                  </div>

                  {/* Date/time */}
                  <div className="shrink-0 text-sm">
                    <p className="font-medium text-stone-800">{fmt.format(new Date(lesson.scheduledAt))}</p>
                    <p className="text-stone-400 text-xs">{fmtTime.format(new Date(lesson.scheduledAt))} · {lesson.duration} dk</p>
                  </div>

                  {/* Status badge */}
                  <span className={`shrink-0 inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[lesson.status]}`}>
                    {statusLabels[lesson.status]}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {lesson.googleMeetLink && lesson.status === "SCHEDULED" && (
                      <a
                        href={lesson.googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg font-medium hover:bg-emerald-100 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Meet
                      </a>
                    )}
                    {lesson.status === "SCHEDULED" && (
                      <a
                        href={`/ogretmen/dersler?tab=${tab}&edit=${isEditing ? "" : lesson.id}`}
                        className="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 px-2.5 py-1.5 rounded-lg font-medium transition"
                      >
                        {isEditing ? "Kapat" : "Düzenle"}
                      </a>
                    )}
                  </div>
                </div>

                {/* Completed notes display */}
                {lesson.status === "COMPLETED" && lesson.notes && (
                  <div className="px-4 pb-4">
                    <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Ders Notu</p>
                      <p className="text-xs text-amber-800 leading-relaxed">{lesson.notes}</p>
                    </div>
                  </div>
                )}

                {/* Inline edit panel */}
                {isEditing && (
                  <div className="border-t border-stone-100 bg-stone-50 p-4 space-y-3">
                    {/* Add/update notes */}
                    <form action={updateLessonNotesAction} className="space-y-2">
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <label className="block text-xs font-semibold text-stone-700">Ders Notu</label>
                      <textarea
                        name="notes"
                        rows={3}
                        defaultValue={lesson.notes ?? ""}
                        placeholder="Bu derse ait notlar..."
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                      <button type="submit" className="text-xs bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 py-1.5 rounded-lg font-medium transition">
                        Notu Kaydet
                      </button>
                    </form>

                    {/* Complete lesson */}
                    {isPast && (
                      <form action={completeLessonAction} className="flex items-end gap-2">
                        <input type="hidden" name="lessonId" value={lesson.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-semibold text-stone-700">Tamamlandı olarak işaretle</label>
                          <textarea
                            name="notes"
                            rows={2}
                            defaultValue={lesson.notes ?? ""}
                            placeholder="Ders notu ekleyebilirsiniz..."
                            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                          />
                        </div>
                        <button type="submit" className="shrink-0 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition">
                          Tamamlandı
                        </button>
                      </form>
                    )}

                    {/* Cancel lesson */}
                    <form action={cancelLessonAction}>
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <input type="hidden" name="tab" value={tab} />
                      <button type="submit" className="text-xs text-red-600 hover:text-red-800 font-medium transition">
                        Dersi İptal Et
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
