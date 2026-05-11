import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bell, BookOpen, CheckCircle2, Goal, Play, TrendingDown, TrendingUp, Trophy, Video } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type LessonWithRelations = Prisma.LessonGetPayload<{
  include: { teacher: true; package: true };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    notifications: { orderBy: { createdAt: "desc" }; take: 4 };
    student: {
      include: {
        lessons: { include: { teacher: true; package: true } };
        purchaseIntents: true;
        courseProgress: {
          include: {
            course: {
              include: {
                modules: { include: { contents: true } };
              };
            };
          };
        };
        goals: true;
        examResults: {
          include: { subjectStats: true };
          orderBy: { takenAt: "desc" };
          take: 3;
        };
        metricSnapshots: {
          where: { metricKey: "net_average" };
          orderBy: { endsAt: "desc" };
          take: 3;
        };
      };
    };
  };
}>;

function fmtTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

function fmtDay(date: Date) {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "BUGÜN";
  if (d.toDateString() === tomorrow.toDateString()) return "YARIN";
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(d).toUpperCase();
}

function metricDelta(current?: Prisma.Decimal | null, previous?: Prisma.Decimal | null) {
  if (current == null || previous == null) return null;
  return Number(current) - Number(previous);
}

export default async function PanelDashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      notifications: { orderBy: { createdAt: "desc" }, take: 4 },
      student: {
        include: {
          lessons: {
            include: { teacher: true, package: true },
            orderBy: { scheduledAt: "asc" },
          },
          purchaseIntents: { orderBy: { submittedAt: "desc" }, take: 3 },
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
            orderBy: { updatedAt: "desc" },
          },
          goals: { where: { status: "ACTIVE" }, orderBy: { dueAt: "asc" }, take: 3 },
          examResults: {
            include: { subjectStats: true },
            orderBy: { takenAt: "desc" },
            take: 3,
          },
          metricSnapshots: {
            where: { metricKey: "net_average" },
            orderBy: { endsAt: "desc" },
            take: 3,
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;

  if (!student) {
    return (
      <>
        <div className="pd-page-header">
          <h1 className="pd-page-title">Panelim</h1>
        </div>
        <div className="pd-page-body">
          <div className="pd-empty tone-mint">
            <div className="pd-empty-icon" style={{ fontSize: 22 }}>👋</div>
            <div className="pd-empty-title">Profiliniz hazırlanıyor</div>
            <div className="pd-empty-desc">
              Hesabınız kısa süre içinde tamamlanacak.
            </div>
          </div>
        </div>
      </>
    );
  }

  const now = new Date();
  const notifications = user.notifications;
  const lessons = student.lessons as unknown as LessonWithRelations[];
  const upcoming = lessons.filter((lesson) => lesson.status === "SCHEDULED" && new Date(lesson.scheduledAt) >= now);
  const nextLesson = upcoming[0] ?? null;
  const completed = lessons.filter((lesson) => lesson.status === "COMPLETED");
  const total = lessons.filter((lesson) => lesson.status !== "CANCELLED").length;
  const totalHours = Math.round(completed.reduce((sum, lesson) => sum + lesson.duration, 0) / 60);
  const lessonProgressPct = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const courseProgress = [...student.courseProgress].sort((a, b) => b.completionPercent - a.completionPercent).slice(0, 3);
  const activeGoals = student.goals;
  const latestExam = student.examResults[0] ?? null;
  const unreadNotifications = notifications.filter((notification) => !notification.readAt);
  const latestNet = student.metricSnapshots[0] ?? null;
  const previousNet = student.metricSnapshots[1] ?? null;
  const netDelta = metricDelta(latestNet?.value ?? null, previousNet?.value ?? null);

  const isNearby =
    nextLesson &&
    new Date(nextLesson.scheduledAt).getTime() - now.getTime() < 30 * 60 * 1000;

  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);
  const weekLessons = upcoming.filter((lesson) => new Date(lesson.scheduledAt) < in7Days).slice(0, 5);

  const kpis = [
    {
      label: "Tamamlanan Ders",
      value: completed.length.toString(),
      delta: `${total} dersten`,
      up: true,
      tone: "mint",
    },
    {
      label: "Toplam Süre",
      value: `${totalHours}s`,
      delta: `${Math.max(1, Math.round(totalHours / 4))}h / hafta`,
      up: true,
      tone: "sky",
    },
    {
      label: "Yaklaşan Ders",
      value: upcoming.length.toString(),
      delta: "planlandı",
      up: upcoming.length > 0,
      tone: "yellow",
    },
    {
      label: "Kurs İlerlemesi",
      value: `%${courseProgress[0]?.completionPercent ?? lessonProgressPct}`,
      delta: `${courseProgress.length} aktif kurs`,
      up: (courseProgress[0]?.completionPercent ?? lessonProgressPct) > 50,
      tone: "lavender",
    },
    {
      label: "Net Ortalaması",
      value: latestNet ? Number(latestNet.value).toFixed(1) : "—",
      delta: netDelta == null ? "ölçüm bekleniyor" : `${netDelta >= 0 ? "+" : ""}${netDelta.toFixed(1)} değişim`,
      up: netDelta == null ? false : netDelta >= 0,
      tone: "blush",
    },
  ];

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--pd-muted)", marginBottom: 4 }}>
              {new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(now)}
            </div>
            <h1 className="pd-page-title">
              Merhaba, {student.fullName.split(" ")[0]} 👋
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {nextLesson?.googleMeetLink ? (
              <a
                href={nextLesson.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pd-btn pd-btn-accent pd-btn-sm"
              >
                <Play size={13} /> Sıradaki Derse Gir
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pd-page-body">
        <div className="pd-kpi-grid">
          {kpis.map((kpi) => (
            <div key={kpi.label} className={`pd-kpi-card tone-${kpi.tone}`}>
              <div className="pd-kpi-label">{kpi.label}</div>
              <div className="pd-kpi-value">{kpi.value}</div>
              <div className={`pd-kpi-delta ${kpi.up ? "up" : ""}`}>
                {kpi.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {kpi.delta}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 16, marginTop: 16, marginBottom: 20 }}>
          <div className="pd-card">
            <div className="pd-card-head">
              <div>
                <span className="pd-eyebrow-tag tone-mint">Kurslar</span>
                <div className="pd-card-title" style={{ marginTop: 6 }}>Kurs İlerlemen</div>
                <div className="pd-card-sub">{student.courseProgress.length} kurs takipte</div>
              </div>
              <Link href="/panel/dersler" className="pd-btn pd-btn-ghost pd-btn-sm">
                Aç
              </Link>
            </div>
            <div className="pd-card-body">
              {courseProgress.length === 0 ? (
                <div className="pd-empty-inline tone-mint">Henüz atanmış kurs görünmüyor.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {courseProgress.map((progress) => {
                    const contentCount = progress.course.modules.reduce((sum, module) => sum + module.contents.length, 0);
                    return (
                      <div key={progress.id} style={{ padding: 14, border: "1px solid var(--pd-line)", borderRadius: 14 }}>
                        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pd-ink)" }}>{progress.course.title}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "var(--pd-muted)" }}>
                              {progress.course.subject} {progress.course.examType ? `· ${progress.course.examType}` : ""}
                            </div>
                          </div>
                          <span className="pd-chip pd-chip-accent">%{progress.completionPercent}</span>
                        </div>
                        <div style={{ marginTop: 10, height: 8, background: "var(--pd-bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${progress.completionPercent}%`, height: "100%", background: "var(--pd-accent)" }} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10, fontSize: 12, color: "var(--pd-muted)" }}>
                          <span>{progress.completedContent}/{Math.max(progress.totalContent, contentCount)} içerik</span>
                          {progress.lastOpenedAt ? (
                            <span>
                              Son açılış{" "}
                              {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(progress.lastOpenedAt))}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pd-card">
            <div className="pd-card-head">
              <div>
                <span className="pd-eyebrow-tag tone-blush">Bildirim</span>
                <div className="pd-card-title" style={{ marginTop: 6 }}>Bildirimler</div>
                <div className="pd-card-sub">{unreadNotifications.length} yeni</div>
              </div>
              <Bell size={15} color="var(--pd-accent)" />
            </div>
            <div className="pd-card-body" style={{ display: "grid", gap: 10 }}>
              {notifications.length === 0 ? (
                <div className="pd-empty-inline tone-blush">Bildirim bulunmuyor.</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid var(--pd-line)",
                      background: notification.readAt ? "var(--pd-bg-elevated)" : "var(--pd-accent-soft)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pd-ink)" }}>{notification.title}</div>
                      {!notification.readAt ? <span className="pd-chip pd-chip-accent">Yeni</span> : null}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--pd-muted)" }}>{notification.body}</div>
                    {notification.href ? (
                      <Link href={notification.href} style={{ display: "inline-flex", marginTop: 8, fontSize: 12, color: "var(--pd-accent)", textDecoration: "none", fontWeight: 600 }}>
                        Aç
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {nextLesson ? (
          <div
            style={{
              background: isNearby ? "var(--pd-accent)" : "var(--pd-bg-elevated)",
              border: `1px solid ${isNearby ? "var(--pd-accent)" : "var(--pd-line)"}`,
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: isNearby ? "rgba(255,255,255,0.7)" : "var(--pd-accent)",
                    marginBottom: 8,
                  }}
                >
                  {isNearby ? "⚡ Ders başlamak üzere!" : "Sıradaki ders"}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: isNearby ? "#fff" : "var(--pd-ink)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {nextLesson.teacher.fullName}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: isNearby ? "rgba(255,255,255,0.7)" : "var(--pd-muted)",
                    marginTop: 4,
                  }}
                >
                  {fmtDay(nextLesson.scheduledAt)} {fmtTime(nextLesson.scheduledAt)} · {nextLesson.duration} dk
                  {nextLesson.package ? ` · ${nextLesson.package.name}` : ""}
                </div>
              </div>
              {nextLesson.googleMeetLink ? (
                <a
                  href={nextLesson.googleMeetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    borderRadius: 10,
                    background: isNearby ? "#fff" : "var(--pd-accent)",
                    color: isNearby ? "var(--pd-accent)" : "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Video size={14} /> Derse Katıl
                </a>
              ) : (
                <div
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    background: isNearby ? "rgba(255,255,255,0.15)" : "var(--pd-bg-subtle)",
                    color: isNearby ? "rgba(255,255,255,0.6)" : "var(--pd-muted)",
                    fontSize: 13,
                  }}
                >
                  Bağlantı yakında
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--pd-bg-elevated)",
              border: "1px solid var(--pd-line)",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            <p style={{ color: "var(--pd-muted)", fontSize: 14 }}>
              Sıradaki dersiniz henüz planlanmadı.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="pd-card">
            <div className="pd-card-head">
              <div>
                <span className="pd-eyebrow-tag tone-sky">Takvim</span>
                <div className="pd-card-title" style={{ marginTop: 6 }}>Bu Haftaki Program</div>
                <div className="pd-card-sub">{weekLessons.length} ders planlandı</div>
              </div>
              <Link href="/panel/takvim" className="pd-btn pd-btn-ghost pd-btn-sm">
                Takvim
              </Link>
            </div>
            <div className="pd-card-body">
              {weekLessons.length === 0 ? (
                <div className="pd-empty-inline tone-yellow">Bu hafta planlanmış ders yok.</div>
              ) : (
                weekLessons.map((lesson) => {
                  const isNext = lesson.id === nextLesson?.id;
                  return (
                    <div key={lesson.id} className={`pd-upcoming-row ${isNext ? "now" : ""}`}>
                      <div className="pd-upcoming-time">
                        <div className="hr">{fmtTime(lesson.scheduledAt)}</div>
                        <div className="day">{fmtDay(lesson.scheduledAt)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink)" }}>{lesson.teacher.fullName}</div>
                        <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 2 }}>
                          {lesson.duration} dk{lesson.package ? ` · ${lesson.package.name}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {isNext ? <span className="pd-chip pd-chip-accent" style={{ fontSize: 10 }}>Sıradaki</span> : null}
                        {lesson.googleMeetLink ? (
                          <a
                            href={lesson.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pd-btn pd-btn-ghost pd-btn-sm"
                          >
                            <Video size={12} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pd-card">
            <div className="pd-card-head">
              <div>
                <span className="pd-eyebrow-tag tone-lavender">Hedef</span>
                <div className="pd-card-title" style={{ marginTop: 6 }}>Performans & Hedefler</div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--pd-accent)" }}>%{courseProgress[0]?.completionPercent ?? lessonProgressPct}</span>
            </div>
            <div className="pd-card-body">
              <div className="pd-progress" style={{ marginBottom: 8 }}>
                <div className="pd-progress-fill" style={{ width: `${courseProgress[0]?.completionPercent ?? lessonProgressPct}%` }} />
              </div>
              <p style={{ fontSize: 12, color: "var(--pd-muted)", marginBottom: 20 }}>
                {completed.length} ders tamamlandı / {total} ders planlandı
                {totalHours > 0 ? ` · ${totalHours} saat` : ""}
              </p>

              {latestExam ? (
                <div style={{ padding: 14, borderRadius: 12, background: "var(--pd-bg-subtle)", border: "1px solid var(--pd-line)", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Son Deneme</div>
                      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "var(--pd-ink)" }}>{latestExam.title}</div>
                    </div>
                    <Trophy size={16} color="var(--pd-accent)" />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "var(--pd-ink)" }}>{latestExam.net ? Number(latestExam.net).toFixed(1) : "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>Net</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "var(--pd-ink)" }}>{latestExam.score ? Number(latestExam.score).toFixed(1) : "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>Puan</div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div style={{ borderTop: "1px solid var(--pd-line)", paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--pd-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Aktif Hedefler
                </div>
                {activeGoals.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--pd-muted)" }}>Yeni hedef eklenmedi.</p>
                ) : (
                  activeGoals.map((goal) => {
                    const targetValue = goal.targetValue ? Number(goal.targetValue) : 0;
                    const currentValue = goal.currentValue ? Number(goal.currentValue) : 0;
                    const pct = targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;
                    return (
                      <div key={goal.id} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                          <span style={{ color: "var(--pd-ink-2)" }}>{goal.title}</span>
                          <span style={{ color: "var(--pd-muted)" }}>
                            {currentValue}/{targetValue || "—"} {goal.unit ?? ""}
                          </span>
                        </div>
                        <div className="pd-progress">
                          <div className="pd-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { href: "/panel/dersler", label: "Derslerim", sub: `${total} ders · ${student.courseProgress.length} kurs`, icon: <BookOpen size={18} /> },
            { href: "/panel/odemeler", label: "Ödemelerim", sub: student.activePackage ?? "Paket yok", icon: <CheckCircle2 size={18} /> },
            { href: "/panel/profil", label: "Profilim", sub: student.examType ?? "Bilgi güncelle", icon: <Goal size={18} /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                background: "var(--pd-bg-elevated)",
                border: "1px solid var(--pd-line)",
                borderRadius: 14,
                padding: 18,
                display: "flex",
                alignItems: "center",
                gap: 14,
                textDecoration: "none",
                transition: "border-color 120ms ease, box-shadow 120ms ease",
              }}
            >
              <span style={{ color: "var(--pd-accent)" }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 2 }}>{item.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
