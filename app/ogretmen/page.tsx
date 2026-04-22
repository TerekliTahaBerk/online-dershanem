import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { CalendarDays, Users, CheckCircle2, Clock, BookOpen, Video, TrendingUp } from "lucide-react";

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

const fmtLong = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const fmtShort = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

export default async function OgretmenDashboardPage() {
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
  if (!teacher) {
    return (
      <>
        <div className="pd-page-header">
          <h1 className="pd-page-title">Öğretmen Paneli</h1>
        </div>
        <div className="pd-page-body">
          <div className="pd-card" style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--pd-muted)", fontSize: 14 }}>
              Profiliniz henüz tamamlanmadı. Yönetim ekibimizle iletişime geçebilirsiniz.
            </p>
          </div>
        </div>
      </>
    );
  }

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const upcoming = teacher.lessons.filter(
    (l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now
  );
  const completed = teacher.lessons.filter((l) => l.status === "COMPLETED");
  const today = teacher.lessons.filter(
    (l) =>
      l.status === "SCHEDULED" &&
      new Date(l.scheduledAt).toDateString() === now.toDateString()
  );
  const thisWeek = teacher.lessons.filter(
    (l) =>
      l.status === "SCHEDULED" &&
      new Date(l.scheduledAt) >= now &&
      new Date(l.scheduledAt) <= weekEnd
  );

  const uniqueStudentIds = new Set(teacher.lessons.map((l) => l.studentId));
  const totalStudents = uniqueStudentIds.size;
  const totalHours = Math.round(completed.reduce((s, l) => s + l.duration, 0) / 60);
  const nextLesson = upcoming[0] ?? null;
  const isNearby = nextLesson && new Date(nextLesson.scheduledAt).getTime() - now.getTime() < 30 * 60 * 1000;

  const kpis = [
    { label: "Aktif Öğrenci", value: totalStudents, icon: Users },
    { label: "Tamamlanan", value: completed.length, icon: CheckCircle2 },
    { label: "Toplam Saat", value: totalHours, icon: Clock },
    { label: "Yaklaşan", value: upcoming.length, icon: CalendarDays },
  ];

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--pd-muted)", marginBottom: 4 }}>
              {new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(now)}
            </div>
            <h1 className="pd-page-title">Merhaba, {teacher.fullName.split(" ")[0]} 👋</h1>
          </div>
          {nextLesson?.googleMeetLink && (
            <a
              href={nextLesson.googleMeetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="pd-btn pd-btn-accent pd-btn-sm"
            >
              <Video size={13} /> Sıradaki Derse Gir
            </a>
          )}
        </div>
      </div>

      <div className="pd-page-body">
        {/* KPI cards */}
        <div className="pd-kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="pd-kpi-card">
              <div className="pd-kpi-label">{k.label}</div>
              <div className="pd-kpi-value">{k.value}</div>
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
                <div style={{ fontSize: 20, fontWeight: 600, color: isNearby ? "#fff" : "var(--pd-ink)", letterSpacing: "-0.02em" }}>
                  {nextLesson.student.fullName}
                </div>
                <div style={{ fontSize: 13, color: isNearby ? "rgba(255,255,255,0.7)" : "var(--pd-muted)", marginTop: 4 }}>
                  {fmtLong.format(new Date(nextLesson.scheduledAt))} · {fmtTime.format(new Date(nextLesson.scheduledAt))} · {nextLesson.duration} dk
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
                  <Video size={14} /> Derse Gir
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
              {today.length > 0 ? `Bugün ${today.length} ders planınız var.` : "Bugün dersiniz bulunmuyor."}
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
                <div className="pd-card-sub">{thisWeek.length} ders planlandı</div>
              </div>
              <Link href="/ogretmen/takvim" className="pd-btn pd-btn-ghost pd-btn-sm">
                Takvim →
              </Link>
            </div>
            <div className="pd-card-body">
              {thisWeek.length === 0 ? (
                <p style={{ color: "var(--pd-muted)", fontSize: 13 }}>Bu hafta planlanmış ders yok.</p>
              ) : (
                thisWeek.slice(0, 6).map((lesson, i) => (
                  <div
                    key={lesson.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: i > 0 ? "10px 0 0" : "0",
                      borderTop: i > 0 ? "1px solid var(--pd-line)" : undefined,
                      marginTop: i > 0 ? 10 : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "var(--pd-accent-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--pd-accent)",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {lesson.student.fullName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pd-ink)" }}>{lesson.student.fullName.split(" ")[0]}</div>
                        <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>
                          {lesson.package?.name ?? "—"}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--pd-ink-2)" }}>{fmtShort.format(new Date(lesson.scheduledAt))}</div>
                      <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>{fmtTime.format(new Date(lesson.scheduledAt))}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="pd-card">
            <div className="pd-card-head">
              <div className="pd-card-title">Özet</div>
              <TrendingUp size={16} style={{ color: "var(--pd-accent)" }} />
            </div>
            <div className="pd-card-body">
              {[
                { label: "Toplam Öğrenci", value: totalStudents },
                { label: "Bu Hafta", value: thisWeek.length },
                { label: "Tamamlanan", value: completed.length },
                { label: "Toplam Saat", value: `${totalHours}s` },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--pd-line)",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--pd-muted)" }}>{item.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--pd-ink)" }}>{item.value}</span>
                </div>
              ))}

              <Link href="/ogretmen/dersler" className="pd-btn pd-btn-ghost pd-btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
                <BookOpen size={13} /> Tüm Dersler
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
