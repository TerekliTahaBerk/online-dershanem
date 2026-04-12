import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Users, ExternalLink } from "lucide-react";

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

const fmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default async function OgretmenOgrencilerimPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teacher: {
        include: {
          lessons: {
            include: { student: true, package: true },
            orderBy: { scheduledAt: "asc" },
          },
        },
      },
    },
  })) as unknown as TeacherWithUser | null;

  const teacher = user?.teacher;
  if (!teacher) redirect("/ogretmen");

  const now = new Date();

  // Build a map of students
  const studentMap = new Map<
    string,
    {
      student: (typeof teacher.lessons)[0]["student"];
      lessons: typeof teacher.lessons;
      totalLessons: number;
      completedLessons: number;
      nextLesson: (typeof teacher.lessons)[0] | null;
      lastLesson: (typeof teacher.lessons)[0] | null;
      packages: Set<string>;
    }
  >();

  for (const lesson of teacher.lessons) {
    const sid = lesson.studentId;
    if (!studentMap.has(sid)) {
      studentMap.set(sid, {
        student: lesson.student,
        lessons: [],
        totalLessons: 0,
        completedLessons: 0,
        nextLesson: null,
        lastLesson: null,
        packages: new Set(),
      });
    }
    const entry = studentMap.get(sid)!;
    entry.lessons.push(lesson);
    entry.totalLessons++;
    if (lesson.status === "COMPLETED") entry.completedLessons++;
    if (lesson.package) entry.packages.add(lesson.package.name);
    if (
      lesson.status === "SCHEDULED" &&
      new Date(lesson.scheduledAt) >= now &&
      (!entry.nextLesson || new Date(lesson.scheduledAt) < new Date(entry.nextLesson.scheduledAt))
    ) {
      entry.nextLesson = lesson;
    }
    if (
      lesson.status === "COMPLETED" &&
      (!entry.lastLesson || new Date(lesson.scheduledAt) > new Date(entry.lastLesson.scheduledAt))
    ) {
      entry.lastLesson = lesson;
    }
  }

  const students = Array.from(studentMap.values()).sort((a, b) => {
    // Active students first
    if (a.nextLesson && !b.nextLesson) return -1;
    if (!a.nextLesson && b.nextLesson) return 1;
    return a.student.fullName.localeCompare(b.student.fullName, "tr");
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Öğrencilerim</h1>
        <p className="mt-1 text-sm text-stone-500">{students.length} öğrenci</p>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center">
          <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">Henüz öğrenciniz bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map(({ student, totalLessons, completedLessons, nextLesson, lastLesson, packages }) => (
            <div key={student.id} className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
                  {student.fullName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-stone-900">{student.fullName}</h2>
                    {nextLesson && (
                      <span className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* Contact + metadata */}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-400">
                    {student.phone && <span>{student.phone}</span>}
                    {student.email && <span>{student.email}</span>}
                    {student.classLevel && <span className="font-medium text-stone-600">{student.classLevel}</span>}
                    {student.examType && <span className="font-medium text-stone-600">{student.examType}</span>}
                  </div>

                  {/* Academic profile */}
                  {(student.targetGoal || student.weakLessons || student.strongLessons) && (
                    <div className="mt-2 grid sm:grid-cols-3 gap-2">
                      {student.targetGoal && (
                        <div className="rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1.5">
                          <p className="text-xs font-semibold text-blue-600 mb-0.5">Hedef</p>
                          <p className="text-xs text-blue-800 truncate">{student.targetGoal}</p>
                        </div>
                      )}
                      {student.weakLessons && (
                        <div className="rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5">
                          <p className="text-xs font-semibold text-red-600 mb-0.5">Geliştirilmesi Gereken Dersler</p>
                          <p className="text-xs text-red-800 line-clamp-2">{student.weakLessons}</p>
                        </div>
                      )}
                      {student.strongLessons && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
                          <p className="text-xs font-semibold text-emerald-600 mb-0.5">Güçlü Dersler</p>
                          <p className="text-xs text-emerald-800 line-clamp-2">{student.strongLessons}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Packages */}
                  {packages.size > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.from(packages).map((pkg) => (
                        <span key={pkg} className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          {pkg}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-stone-50 px-3 py-2">
                      <p className="text-xs text-stone-500">Toplam Ders</p>
                      <p className="text-lg font-bold text-stone-900">{totalLessons}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 px-3 py-2">
                      <p className="text-xs text-stone-500">Tamamlanan</p>
                      <p className="text-lg font-bold text-emerald-600">{completedLessons}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 px-3 py-2">
                      <p className="text-xs text-stone-500">Kalan</p>
                      <p className="text-lg font-bold text-stone-900">{totalLessons - completedLessons}</p>
                    </div>
                  </div>

                  {/* Next lesson */}
                  {nextLesson && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">Sıradaki Ders</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          {fmt.format(new Date(nextLesson.scheduledAt))} · {fmtTime.format(new Date(nextLesson.scheduledAt))} · {nextLesson.duration} dk
                        </p>
                      </div>
                      {nextLesson.googleMeetLink && (
                        <a
                          href={nextLesson.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg font-medium hover:bg-emerald-700 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Bağlan
                        </a>
                      )}
                    </div>
                  )}

                  {/* Last completed lesson */}
                  {lastLesson && (
                    <div className="mt-2">
                      <p className="text-xs text-stone-400">
                        Son işlenen ders:{" "}
                        <span className="text-stone-600 font-medium">
                          {fmt.format(new Date(lastLesson.scheduledAt))}
                        </span>
                        {lastLesson.notes && (
                          <span className="ml-1 italic text-stone-400">— {lastLesson.notes.slice(0, 60)}{lastLesson.notes.length > 60 ? "…" : ""}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
