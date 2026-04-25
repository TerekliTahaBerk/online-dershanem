import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Video, Clock, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type LessonWithRelations = Prisma.LessonGetPayload<{
  include: { teacher: true; package: true };
}> & { title?: string | null; subject?: string | null };

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        lessons: { include: { teacher: true; package: true } };
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
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
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
    .filter((l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now)
    .reverse();
  const completedLessons = allLessons.filter((l) => l.status === "COMPLETED");
  const cancelledLessons = allLessons.filter((l) => l.status === "CANCELLED");
  const totalHours = Math.round(completedLessons.reduce((s, l) => s + l.duration, 0) / 60);

  const tabData: Record<string, LessonWithRelations[]> = {
    upcoming: upcomingLessons,
    completed: completedLessons,
    cancelled: cancelledLessons,
    all: [...allLessons].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
  };

  const visibleLessons = tabData[activeTab] ?? upcomingLessons;

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="pd-page-title">Derslerim</h1>
            <p className="pd-page-sub">
              {allLessons.length} ders · {completedLessons.length} tamamlandı · {totalHours} saat
            </p>
          </div>
          <Link href="/panel/takvim" className="pd-btn pd-btn-ghost pd-btn-sm">
            <CalendarDays size={13} /> Takvim
          </Link>
        </div>
      </div>

      <div className="pd-page-body">
        {/* Stats strip */}
        <div className="pd-kpi-grid" style={{ marginBottom: 16 }}>
          {[
            { label: "Tamamlanan", value: completedLessons.length.toString(), up: completedLessons.length > 0 },
            { label: "Yaklaşan", value: upcomingLessons.length.toString(), up: upcomingLessons.length > 0 },
            { label: "Toplam Saat", value: `${totalHours}s`, up: totalHours > 0 },
            { label: "İptal", value: cancelledLessons.length.toString(), up: false },
          ].map((k) => (
            <div key={k.label} className="pd-kpi-card">
              <div className="pd-kpi-label">{k.label}</div>
              <div className="pd-kpi-value">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
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

        {/* Lesson list */}
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
                        {lesson.title ?? lesson.teacher.fullName}
                      </div>
                      <div style={{ fontSize: 12, color: isNearby ? "rgba(255,255,255,0.7)" : "var(--pd-muted)", marginTop: 3 }}>
                        {lesson.subject ? `${lesson.subject} · ` : ""}
                        {lesson.teacher.fullName} · {fmtLong(lesson.scheduledAt)} · {lesson.duration} dk
                        {lesson.package ? ` · ${lesson.package.name}` : ""}
                      </div>
                      {lesson.notes && (
                        <div style={{ marginTop: 8, fontSize: 12, color: isNearby ? "rgba(255,255,255,0.8)" : "var(--pd-ink-2)", fontStyle: "italic" }}>
                          {lesson.notes}
                        </div>
                      )}
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
            {visibleLessons.map((lesson, i) => {
              const isCompleted = lesson.status === "COMPLETED";
              const isCancelled = lesson.status === "CANCELLED";
              return (
                <div
                  key={lesson.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: i < visibleLessons.length - 1 ? "1px solid var(--pd-line)" : "none",
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
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pd-ink)" }}>
                          {lesson.title ?? lesson.teacher.fullName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 2 }}>
                          {lesson.subject ? `${lesson.subject} · ` : ""}
                          {lesson.teacher.fullName} · {fmtLong(lesson.scheduledAt)} · {lesson.duration} dk
                          {lesson.package ? ` · ${lesson.package.name}` : ""}
                        </div>
                        {lesson.notes && (
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
                        )}
                      </div>
                    </div>
                    <span
                      className={
                        isCompleted ? "pd-chip pd-chip-accent" :
                        isCancelled ? "pd-chip" :
                        "pd-chip"
                      }
                      style={{ flexShrink: 0 }}
                    >
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
