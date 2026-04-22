import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Video, ArrowRight, TrendingUp, TrendingDown, Play } from "lucide-react";
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
        purchaseIntents: true;
        packages: true;
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

export default async function PanelDashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          lessons: {
            include: { teacher: true, package: true },
            orderBy: { scheduledAt: "asc" },
          },
          purchaseIntents: { orderBy: { submittedAt: "desc" }, take: 3 },
          packages: true,
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
          <div className="pd-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👋</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--pd-ink)", marginBottom: 8 }}>
              Profiliniz hazırlanıyor
            </h2>
            <p style={{ color: "var(--pd-muted)", fontSize: 14 }}>
              Hesabınız kısa süre içinde tamamlanacak.
            </p>
          </div>
        </div>
      </>
    );
  }

  const now = new Date();
  const lessons = student.lessons as unknown as LessonWithRelations[];
  const upcoming = lessons.filter((l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now);
  const nextLesson = upcoming[0] ?? null;
  const completed = lessons.filter((l) => l.status === "COMPLETED");
  const total = lessons.filter((l) => l.status !== "CANCELLED").length;
  const totalHours = Math.round(completed.reduce((s, l) => s + l.duration, 0) / 60);
  const progressPct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  const isNearby =
    nextLesson &&
    new Date(nextLesson.scheduledAt).getTime() - now.getTime() < 30 * 60 * 1000;

  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);
  const weekLessons = upcoming.filter((l) => new Date(l.scheduledAt) < in7Days).slice(0, 5);

  const kpis = [
    {
      label: "Tamamlanan Ders",
      value: completed.length.toString(),
      delta: `${total} dersten`,
      up: true,
    },
    {
      label: "Toplam Süre",
      value: `${totalHours}s`,
      delta: `${Math.round(totalHours / 4)}h / hafta`,
      up: true,
    },
    {
      label: "Yaklaşan Ders",
      value: upcoming.length.toString(),
      delta: "planlandı",
      up: upcoming.length > 0,
    },
    {
      label: "İlerleme",
      value: `%${progressPct}`,
      delta: "müfredat",
      up: progressPct > 50,
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
            {nextLesson?.googleMeetLink && (
              <a
                href={nextLesson.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pd-btn pd-btn-accent pd-btn-sm"
              >
                <Play size={13} /> Sıradaki Derse Gir
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="pd-page-body">
        {/* KPI cards */}
        <div className="pd-kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="pd-kpi-card">
              <div className="pd-kpi-label">{k.label}</div>
              <div className="pd-kpi-value">{k.value}</div>
              <div className={`pd-kpi-delta ${k.up ? "up" : ""}`}>
                {k.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {k.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Next lesson hero */}
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
                  {fmtDay(nextLesson.scheduledAt)} {fmtTime(nextLesson.scheduledAt)} ·{" "}
                  {nextLesson.duration} dk
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

        {/* Two-column: week schedule + progress */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Week schedule */}
          <div className="pd-card">
            <div className="pd-card-head">
              <div>
                <div className="pd-card-title">Bu Haftaki Program</div>
                <div className="pd-card-sub">{weekLessons.length} ders planlandı</div>
              </div>
              <Link href="/panel/takvim" className="pd-btn pd-btn-ghost pd-btn-sm">
                Takvim <ArrowRight size={12} />
              </Link>
            </div>
            <div className="pd-card-body">
              {weekLessons.length === 0 ? (
                <p style={{ color: "var(--pd-muted)", fontSize: 13 }}>Bu hafta planlanmış ders yok.</p>
              ) : (
                weekLessons.map((lesson, i) => {
                  const isNext = lesson.id === nextLesson?.id;
                  return (
                    <div
                      key={lesson.id}
                      className={`pd-upcoming-row ${isNext ? "now" : ""}`}
                    >
                      <div className="pd-upcoming-time">
                        <div className="hr">{fmtTime(lesson.scheduledAt)}</div>
                        <div className="day">{fmtDay(lesson.scheduledAt)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink)" }}>
                          {lesson.teacher.fullName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 2 }}>
                          {lesson.duration} dk{lesson.package ? ` · ${lesson.package.name}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {isNext && (
                          <span className="pd-chip pd-chip-accent" style={{ fontSize: 10 }}>Sıradaki</span>
                        )}
                        {lesson.googleMeetLink && (
                          <a
                            href={lesson.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pd-btn pd-btn-ghost pd-btn-sm"
                          >
                            <Video size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Progress card */}
          <div className="pd-card">
            <div className="pd-card-head">
              <div className="pd-card-title">Ders İlerlemesi</div>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--pd-accent)" }}>%{progressPct}</span>
            </div>
            <div className="pd-card-body">
              <div className="pd-progress" style={{ marginBottom: 8 }}>
                <div className="pd-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <p style={{ fontSize: 12, color: "var(--pd-muted)", marginBottom: 20 }}>
                {completed.length} ders tamamlandı / {total} ders planlandı
                {totalHours > 0 ? ` · ${totalHours} saat` : ""}
              </p>

              {/* Weekly goals */}
              <div style={{ borderTop: "1px solid var(--pd-line)", paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--pd-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Bu hafta
                </div>
                {[
                  { t: "Canlı derse katıl", done: Math.min(upcoming.length, 2), target: 4 },
                  { t: "Ders tamamla", done: Math.min(completed.length, 3), target: 4 },
                ].map((g, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "var(--pd-ink-2)" }}>{g.t}</span>
                      <span style={{ color: "var(--pd-muted)" }}>
                        {g.done}/{g.target}
                      </span>
                    </div>
                    <div className="pd-progress">
                      <div
                        className="pd-progress-fill"
                        style={{ width: `${Math.min(100, (g.done / g.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { href: "/panel/dersler", label: "Derslerim", sub: `${total} ders`, icon: "📚" },
            { href: "/panel/paketler", label: "Paketlerim", sub: (student as any).packages?.length ? `${(student as any).packages.length} paket` : "Paket yok", icon: "📦" },
            { href: "/panel/profil", label: "Profilim", sub: student.examType ?? "Bilgi güncelle", icon: "👤" },
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
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--pd-ink)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 2 }}>{item.sub}</div>
              </div>
              <ArrowRight size={14} style={{ marginLeft: "auto", color: "var(--pd-muted-2)" }} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
