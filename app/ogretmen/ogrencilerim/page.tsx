import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Users, Video } from "lucide-react";

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

  const studentMap = new Map<
    string,
    {
      student: (typeof teacher.lessons)[0]["student"];
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
        totalLessons: 0,
        completedLessons: 0,
        nextLesson: null,
        lastLesson: null,
        packages: new Set(),
      });
    }
    const entry = studentMap.get(sid)!;
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
    if (a.nextLesson && !b.nextLesson) return -1;
    if (!a.nextLesson && b.nextLesson) return 1;
    return a.student.fullName.localeCompare(b.student.fullName, "tr");
  });

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Öğrencilerim</h1>
        <p className="pd-page-sub">{students.length} öğrenci</p>
      </div>

      <div className="pd-page-body">
        {students.length === 0 ? (
          <div className="pd-empty tone-mint">
            <div className="pd-empty-icon">
              <Users size={20} />
            </div>
            <div className="pd-empty-title">Henüz öğrenciniz bulunmuyor</div>
            <div className="pd-empty-desc">Atanan öğrenciler ders planlandıkça burada görünecek.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {students.map(({ student, totalLessons, completedLessons, nextLesson, lastLesson, packages }) => {
              const initials = student.fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={student.id} className="pd-card" style={{ overflow: "hidden" }}>
                  <div style={{ padding: 20, display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: "var(--pd-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--pd-ink)" }}>{student.fullName}</div>
                            {nextLesson && (
                              <span className="pd-chip pd-chip-accent" style={{ display: "inline-flex" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pd-accent)", display: "inline-block" }} />
                                Aktif
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: "2px 12px", fontSize: 12, color: "var(--pd-muted)" }}>
                            {student.phone && <span>{student.phone}</span>}
                            {(student as { classLevel?: string }).classLevel && (
                              <span style={{ color: "var(--pd-ink-2)", fontWeight: 500 }}>{(student as { classLevel?: string }).classLevel}</span>
                            )}
                            {(student as { examType?: string }).examType && (
                              <span style={{ color: "var(--pd-ink-2)", fontWeight: 500 }}>{(student as { examType?: string }).examType}</span>
                            )}
                          </div>
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
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--pd-ink-2)" }}>{totalLessons - completedLessons}</div>
                            <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>Kalan</div>
                          </div>
                        </div>
                      </div>

                      {/* Academic profile */}
                      {((student as { targetGoal?: string }).targetGoal || (student as { weakLessons?: string }).weakLessons || (student as { strongLessons?: string }).strongLessons) && (
                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                          {(student as { targetGoal?: string }).targetGoal && (
                            <div className="pd-info-card tone-sky">
                              <div className="pd-info-card-label">Hedef</div>
                              <div className="pd-info-card-value">{(student as { targetGoal?: string }).targetGoal}</div>
                            </div>
                          )}
                          {(student as { weakLessons?: string }).weakLessons && (
                            <div className="pd-info-card tone-blush">
                              <div className="pd-info-card-label">Zayıf Dersler</div>
                              <div className="pd-info-card-value">{(student as { weakLessons?: string }).weakLessons}</div>
                            </div>
                          )}
                          {(student as { strongLessons?: string }).strongLessons && (
                            <div className="pd-info-card tone-mint">
                              <div className="pd-info-card-label">Güçlü Dersler</div>
                              <div className="pd-info-card-value">{(student as { strongLessons?: string }).strongLessons}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {packages.size > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Array.from(packages).map((pkg) => (
                            <span key={pkg} className="pd-chip">{pkg}</span>
                          ))}
                        </div>
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
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Sıradaki Ders
                            </div>
                            <div style={{ fontSize: 12, color: "var(--pd-ink-2)", marginTop: 2 }}>
                              {fmt.format(new Date(nextLesson.scheduledAt))} · {fmtTime.format(new Date(nextLesson.scheduledAt))} · {nextLesson.duration} dk
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
                              <Video size={12} /> Bağlan
                            </a>
                          )}
                        </div>
                      )}
                      {lastLesson && (
                        <div style={{ padding: "10px 20px", fontSize: 12, color: "var(--pd-muted)" }}>
                          Son işlenen ders:{" "}
                          <span style={{ color: "var(--pd-ink-2)", fontWeight: 500 }}>
                            {fmt.format(new Date(lastLesson.scheduledAt))}
                          </span>
                          {lastLesson.notes && (
                            <span style={{ fontStyle: "italic" }}>
                              {" "}— {lastLesson.notes.slice(0, 60)}{lastLesson.notes.length > 60 ? "…" : ""}
                            </span>
                          )}
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
