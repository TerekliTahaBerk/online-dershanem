import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Video, Clock, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import type { Prisma } from "@prisma/client";

type LessonWithRelations = Prisma.LessonGetPayload<{
  include: { teacher: true; package: true };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        lessons: { include: { teacher: true; package: true } };
      };
    };
  };
}>;

const statusConfig = {
  SCHEDULED: { label: "Planlandı", icon: Clock, cls: "bg-blue-50 text-blue-700 border-blue-100" },
  COMPLETED: { label: "Tamamlandı", icon: CheckCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  CANCELLED: { label: "İptal", icon: XCircle, cls: "bg-red-50 text-red-600 border-red-100" },
} as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function PanelDerslerPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          lessons: {
            include: { teacher: true, package: true },
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const lessons = student.lessons as unknown as LessonWithRelations[];
  const now = new Date();

  const upcoming = lessons.filter(
    (l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now
  ).reverse();

  const past = lessons.filter(
    (l) => l.status !== "SCHEDULED" || new Date(l.scheduledAt) < now
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Derslerim</h1>
        <p className="mt-1 text-sm text-stone-500">
          {lessons.length} toplam ders · {upcoming.length} yaklaşan
        </p>
      </div>

      {/* Upcoming lessons */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
            Yaklaşan Dersler
          </h2>
          <div className="space-y-3">
            {upcoming.map((lesson) => {
              const isNearby =
                new Date(lesson.scheduledAt).getTime() - now.getTime() < 30 * 60 * 1000;
              return (
                <div
                  key={lesson.id}
                  className={`rounded-xl border p-5 flex items-center justify-between gap-4 ${
                    isNearby
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-stone-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isNearby ? "bg-emerald-600" : "bg-stone-100"
                      }`}
                    >
                      <CalendarDays
                        className={`w-5 h-5 ${isNearby ? "text-white" : "text-stone-500"}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        {lesson.teacher.fullName}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {formatDate(lesson.scheduledAt)} · {lesson.duration} dk
                        {lesson.package ? ` · ${lesson.package.name}` : ""}
                      </p>
                      {lesson.notes && (
                        <p className="text-xs text-stone-400 mt-1 italic">{lesson.notes}</p>
                      )}
                    </div>
                  </div>

                  {lesson.googleMeetLink ? (
                    <a
                      href={lesson.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                        isNearby
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-stone-900 text-white hover:bg-stone-700"
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      Katıl
                    </a>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1.5 text-xs text-stone-400 bg-stone-50 border border-stone-200 px-3 py-2 rounded-lg">
                      <Clock className="w-3.5 h-3.5" />
                      Link bekleniyor
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Past lessons */}
      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
            Geçmiş Dersler
          </h2>
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
            {past.map((lesson) => {
              const cfg = statusConfig[lesson.status as keyof typeof statusConfig] ?? statusConfig.SCHEDULED;
              const StatusIcon = cfg.icon;
              return (
                <div key={lesson.id} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-left min-w-[80px]">
                      <p className="text-xs font-medium text-stone-700">
                        {new Intl.DateTimeFormat("tr-TR", {
                          day: "numeric",
                          month: "short",
                        }).format(new Date(lesson.scheduledAt))}
                      </p>
                      <p className="text-xs text-stone-400">
                        {new Intl.DateTimeFormat("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(lesson.scheduledAt))}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">
                        {lesson.teacher.fullName}
                      </p>
                      <p className="text-xs text-stone-500">
                        {lesson.duration} dk{lesson.package ? ` · ${lesson.package.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.cls}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {lessons.length === 0 && (
        <div className="text-center py-16">
          <CalendarDays className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Henüz ders bulunmuyor</p>
          <p className="text-xs text-stone-400 mt-1">Dersler planlandıktan sonra burada görünecek.</p>
        </div>
      )}
    </div>
  );
}
