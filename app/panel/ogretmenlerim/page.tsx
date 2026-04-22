import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, CalendarDays, CheckCircle, Clock, User, Video } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type LessonWithTeacher = Prisma.LessonGetPayload<{
  include: { teacher: true; package: { select: { name: true } } };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        lessons: {
          include: {
            teacher: true;
            package: { select: { name: true } };
          };
        };
      };
    };
  };
}>;

export default async function PanelOgretmenlerimPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          lessons: {
            include: {
              teacher: true,
              package: { select: { name: true } },
            },
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const lessons = student.lessons as unknown as LessonWithTeacher[];
  const now = new Date();

  const teacherMap = new Map<
    string,
    {
      teacher: LessonWithTeacher["teacher"];
      totalLessons: number;
      completedLessons: number;
      nextLesson: LessonWithTeacher | null;
      lastLesson: LessonWithTeacher | null;
    }
  >();

  for (const lesson of lessons) {
    const t = lesson.teacher;
    if (!teacherMap.has(t.id)) {
      teacherMap.set(t.id, {
        teacher: t,
        totalLessons: 0,
        completedLessons: 0,
        nextLesson: null,
        lastLesson: null,
      });
    }
    const entry = teacherMap.get(t.id)!;
    entry.totalLessons += 1;
    if (lesson.status === "COMPLETED") entry.completedLessons += 1;

    const scheduledAt = new Date(lesson.scheduledAt);
    if (lesson.status === "SCHEDULED" && scheduledAt >= now) {
      if (!entry.nextLesson || scheduledAt < new Date(entry.nextLesson.scheduledAt)) {
        entry.nextLesson = lesson;
      }
    }
    if (lesson.status === "COMPLETED") {
      if (!entry.lastLesson || scheduledAt > new Date(entry.lastLesson.scheduledAt)) {
        entry.lastLesson = lesson;
      }
    }
  }

  const teachers = Array.from(teacherMap.values()).sort((a, b) => {
    if (a.nextLesson && !b.nextLesson) return -1;
    if (!a.nextLesson && b.nextLesson) return 1;
    return b.totalLessons - a.totalLessons;
  });

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Öğretmenlerim</h1>
        <p className="pd-page-sub">
          {teachers.length} öğretmen · ders programınıza göre atanmış
        </p>
      </div>

      <div className="pd-page-body">
        {teachers.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "var(--pd-bg-elevated)",
              border: "1px solid var(--pd-line)",
              borderRadius: 16,
            }}
          >
            <User size={32} style={{ color: "var(--pd-muted-2)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink-2)" }}>Öğretmen eşleşmeniz yakında paylaşılacak</p>
            <p style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 4 }}>İlk dersiniz planlandığında burada yer alacak.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {teachers.map(({ teacher, totalLessons, completedLessons, nextLesson, lastLesson }) => {
              const subjects = teacher.subjects.split(",").map((s: string) => s.trim()).filter(Boolean);
              const initials = teacher.fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const isActive = !!nextLesson;

              return (
                <div key={teacher.id} className="pd-card" style={{ overflow: "hidden" }}>
                  <div style={{ padding: 20, display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "var(--pd-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 17,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--pd-ink)" }}>{teacher.fullName}</div>
                          {isActive && (
                            <span className="pd-chip pd-chip-accent" style={{ marginTop: 6, display: "inline-flex" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pd-accent)", display: "inline-block" }} />
                              Aktif
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 20, textAlign: "center", flexShrink: 0 }}>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--pd-ink)" }}>{totalLessons}</div>
                            <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>Toplam</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--pd-accent)" }}>{completedLessons}</div>
                            <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>Tamamlanan</div>
                          </div>
                        </div>
                      </div>

                      {subjects.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                          {subjects.map((s: string) => (
                            <span key={s} className="pd-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <BookOpen size={10} /> {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {teacher.bio && (
                        <p style={{ marginTop: 10, fontSize: 13, color: "var(--pd-muted)", lineHeight: 1.55 }}>{teacher.bio}</p>
                      )}
                    </div>
                  </div>

                  {(nextLesson || lastLesson) && (
                    <div style={{ borderTop: "1px solid var(--pd-line)" }}>
                      {nextLesson && (
                        <div
                          style={{
                            padding: "12px 20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 16,
                            background: "var(--pd-accent-soft)",
                            borderBottom: lastLesson ? "1px solid var(--pd-line)" : undefined,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <CalendarDays size={14} style={{ color: "var(--pd-accent)", flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Sıradaki Ders
                              </div>
                              <div style={{ fontSize: 12, color: "var(--pd-ink-2)", marginTop: 2 }}>
                                {new Intl.DateTimeFormat("tr-TR", {
                                  day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                                }).format(new Date(nextLesson.scheduledAt))}
                                {" · "}{nextLesson.duration} dk
                                {nextLesson.package ? ` · ${nextLesson.package.name}` : ""}
                              </div>
                            </div>
                          </div>
                          {nextLesson.googleMeetLink && (
                            <a
                              href={nextLesson.googleMeetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pd-btn pd-btn-accent pd-btn-sm"
                              style={{ flexShrink: 0 }}
                            >
                              <Video size={12} /> Katıl
                            </a>
                          )}
                        </div>
                      )}
                      {lastLesson && (
                        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                          <CheckCircle size={14} style={{ color: "var(--pd-muted-2)", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Son İşlenen Ders
                            </div>
                            <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 2 }}>
                              {new Intl.DateTimeFormat("tr-TR", {
                                day: "numeric", month: "long", year: "numeric",
                              }).format(new Date(lastLesson.scheduledAt))}
                              {lastLesson.notes && (
                                <span style={{ fontStyle: "italic" }}> · "{lastLesson.notes}"</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
