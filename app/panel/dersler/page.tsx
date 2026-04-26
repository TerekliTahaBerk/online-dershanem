import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, CalendarDays, CheckCircle, Clock, Video, XCircle } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type LessonWithRelations = Prisma.LessonGetPayload<{
  include: { teacher: true; package: true };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        lessons: { include: { teacher: true; package: true } };
        courseProgress: {
          include: {
            course: {
              include: {
                modules: { include: { contents: true } };
              };
            };
          };
        };
      };
    };
  };
}>;

type Props = { searchParams?: Promise<{ tab?: string }> };

const TABS = [
  { id: "upcoming", label: "Yaklaşan" },
  { id: "completed", label: "Tamamlanan" },
  { id: "cancelled", label: "İptal" },
  { id: "all", label: "Tümü" },
] as const;

function fmtLong(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function PanelDerslerPage({ searchParams }: Props) {
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
          courseProgress: {
            include: {
              course: {
                include: {
                  modules: {
                    include: { contents: true },
                    orderBy: { orderIndex: "asc" },
                  },
                },
              },
            },
            orderBy: [{ completionPercent: "desc" }, { updatedAt: "desc" }],
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const sp = await searchParams;
  const activeTab = sp?.tab ?? "upcoming";
  const now = new Date();
  const allLessons = student.lessons as unknown as LessonWithRelations[];

  const upcomingLessons = allLessons
    .filter((lesson) => lesson.status === "SCHEDULED" && new Date(lesson.scheduledAt) >= now)
    .reverse();
  const completedLessons = allLessons.filter((lesson) => lesson.status === "COMPLETED");
  const cancelledLessons = allLessons.filter((lesson) => lesson.status === "CANCELLED");
  const totalHours = Math.round(completedLessons.reduce((sum, lesson) => sum + lesson.duration, 0) / 60);

  const tabData: Record<string, LessonWithRelations[]> = {
    upcoming: upcomingLessons,
    completed: completedLessons,
    cancelled: cancelledLessons,
    all: [...allLessons].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
  };

  const visibleLessons = tabData[activeTab] ?? upcomingLessons;
  const topCourses = student.courseProgress.slice(0, 4);

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="pd-page-title">Derslerim</h1>
            <p className="pd-page-sub">
              {allLessons.length} ders · {completedLessons.length} tamamlandı · {totalHours} saat · {student.courseProgress.length} kurs
            </p>
          </div>
          <Link href="/panel/takvim" className="pd-btn pd-btn-ghost pd-btn-sm">
            <CalendarDays size={13} /> Takvim
          </Link>
        </div>
      </div>

      <div className="pd-page-body">
        <div className="pd-kpi-grid" style={{ marginBottom: 16 }}>
          {[
            { label: "Tamamlanan", value: completedLessons.length.toString() },
            { label: "Yaklaşan", value: upcomingLessons.length.toString() },
            { label: "Toplam Saat", value: `${totalHours}s` },
            { label: "Kurs", value: student.courseProgress.length.toString() },
          ].map((item) => (
            <div key={item.label} className="pd-kpi-card">
              <div className="pd-kpi-label">{item.label}</div>
              <div className="pd-kpi-value">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="pd-card" style={{ marginBottom: 16 }}>
          <div className="pd-card-head">
            <div>
              <div className="pd-card-title">Kurs Akışlarım</div>
              <div className="pd-card-sub">İçerik ilerlemesi ve modül durumu</div>
            </div>
            <BookOpen size={15} color="var(--pd-accent)" />
          </div>
          <div className="pd-card-body">
            {topCourses.length === 0 ? (
              <p style={{ color: "var(--pd-muted)", fontSize: 13 }}>Henüz kurs ataması görünmüyor.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                {topCourses.map((progress) => {
                  const totalContent = Math.max(
                    progress.totalContent,
                    progress.course.modules.reduce((sum, module) => sum + module.contents.length, 0)
                  );
                  return (
                    <div key={progress.id} style={{ border: "1px solid var(--pd-line)", borderRadius: 14, padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pd-ink)" }}>{progress.course.title}</div>
                          <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 3 }}>
                            {progress.course.subject} {progress.course.examType ? `· ${progress.course.examType}` : ""}
                          </div>
                        </div>
                        <span className="pd-chip pd-chip-accent">%{progress.completionPercent}</span>
                      </div>
                      <div style={{ marginTop: 10, height: 8, background: "var(--pd-bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${progress.completionPercent}%`, height: "100%", background: "var(--pd-accent)" }} />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10, fontSize: 12, color: "var(--pd-muted)" }}>
                        <span>{progress.completedContent}/{totalContent} içerik</span>
                        <span>{progress.course.modules.length} modül</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, background: "var(--pd-bg-subtle)", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 16 }}>
          {TABS.map((tab) => {
            const count = tabData[tab.id]?.length ?? 0;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/panel/dersler?tab=${tab.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  background: isActive ? "var(--pd-bg-elevated)" : "transparent",
                  color: isActive ? "var(--pd-ink)" : "var(--pd-muted)",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 120ms ease",
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: isActive ? "var(--pd-accent-soft)" : "var(--pd-bg-elevated)",
                    color: isActive ? "var(--pd-accent)" : "var(--pd-muted)",
                  }}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {visibleLessons.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "var(--pd-bg-elevated)",
              border: "1px solid var(--pd-line)",
              borderRadius: 16,
            }}
          >
            <CalendarDays size={32} style={{ color: "var(--pd-muted-2)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "var(--pd-muted)" }}>Bu filtrede ders görünmüyor.</p>
          </div>
        ) : activeTab === "upcoming" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visibleLessons.map((lesson) => {
              const isNearby = new Date(lesson.scheduledAt).getTime() - now.getTime() < 30 * 60 * 1000;
              return (
                <div
                  key={lesson.id}
                  style={{
                    background: isNearby ? "var(--pd-accent)" : "var(--pd-bg-elevated)",
                    border: `1px solid ${isNearby ? "var(--pd-accent)" : "var(--pd-line)"}`,
                    borderRadius: 14,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: isNearby ? "rgba(255,255,255,0.2)" : "var(--pd-bg-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CalendarDays size={18} style={{ color: isNearby ? "#fff" : "var(--pd-muted)" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isNearby ? "#fff" : "var(--pd-ink)" }}>
                        {lesson.teacher.fullName}
                      </div>
                      <div style={{ fontSize: 12, color: isNearby ? "rgba(255,255,255,0.7)" : "var(--pd-muted)", marginTop: 3 }}>
                        {fmtLong(lesson.scheduledAt)} · {lesson.duration} dk
                        {lesson.package ? ` · ${lesson.package.name}` : ""}
                      </div>
                      {lesson.notes ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: isNearby ? "rgba(255,255,255,0.8)" : "var(--pd-ink-2)", fontStyle: "italic" }}>
                          {lesson.notes}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {lesson.googleMeetLink ? (
                    <a
                      href={lesson.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 16px",
                        borderRadius: 10,
                        background: isNearby ? "#fff" : "var(--pd-accent)",
                        color: isNearby ? "var(--pd-accent)" : "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                        flexShrink: 0,
                      }}
                    >
                      <Video size={14} /> Derse Katıl
                    </a>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: isNearby ? "rgba(255,255,255,0.5)" : "var(--pd-muted)",
                        background: isNearby ? "rgba(255,255,255,0.1)" : "var(--pd-bg-subtle)",
                        padding: "8px 14px",
                        borderRadius: 8,
                        flexShrink: 0,
                      }}
                    >
                      <Clock size={13} /> Bağlantı bekleniyor
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pd-card" style={{ overflow: "hidden" }}>
            {visibleLessons.map((lesson, index) => {
              const isCompleted = lesson.status === "COMPLETED";
              const isCancelled = lesson.status === "CANCELLED";
              return (
                <div
                  key={lesson.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: index < visibleLessons.length - 1 ? "1px solid var(--pd-line)" : "none",
                    opacity: isCancelled ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: isCompleted ? "var(--pd-accent-soft)" : isCancelled ? "#fef2f2" : "var(--pd-bg-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle size={16} style={{ color: "var(--pd-accent)" }} />
                        ) : isCancelled ? (
                          <XCircle size={16} style={{ color: "#ef4444" }} />
                        ) : (
                          <Clock size={16} style={{ color: "var(--pd-muted)" }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pd-ink)" }}>{lesson.teacher.fullName}</div>
                        <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 2 }}>
                          {fmtLong(lesson.scheduledAt)} · {lesson.duration} dk
                          {lesson.package ? ` · ${lesson.package.name}` : ""}
                        </div>
                        {lesson.notes ? (
                          <div
                            style={{
                              marginTop: 8,
                              padding: "8px 12px",
                              borderRadius: 8,
                              background: isCompleted ? "var(--pd-accent-soft)" : "var(--pd-bg-subtle)",
                              border: "1px solid var(--pd-line)",
                              fontSize: 12,
                              color: "var(--pd-ink-2)",
                            }}
                          >
                            {lesson.notes}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <span className={isCompleted ? "pd-chip pd-chip-accent" : isCancelled ? "pd-chip" : "pd-chip"}>
                      {isCompleted ? "Tamamlandı" : isCancelled ? "İptal" : "Planlandı"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
