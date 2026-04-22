import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";

export const dynamic = "force-dynamic";

type TeacherWithUser = Prisma.UserGetPayload<{
  include: {
    teacher: {
      include: {
        lessons: {
          include: { student: true };
        };
      };
    };
  };
}>;

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function startOfWeek(d: Date, offset: number): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function OgretmenTakvimPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const params = await searchParams;
  const weekOffset = parseInt(params.week ?? "0");

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teacher: {
        include: {
          lessons: {
            where: { status: "SCHEDULED" },
            include: { student: true },
            orderBy: { scheduledAt: "asc" },
          },
        },
      },
    },
  })) as unknown as TeacherWithUser | null;

  const teacher = user?.teacher;
  if (!teacher) redirect("/ogretmen");

  const today = new Date();
  const weekStart = startOfWeek(today, weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const weekLessons = teacher.lessons.filter((l) => {
    const d = new Date(l.scheduledAt);
    return d >= weekStart && d < weekEnd;
  });

  const fmtDay = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });
  const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="pd-page-title">Haftalık Takvim</h1>
            <p className="pd-page-sub">
              {fmtDay.format(weekStart)} – {fmtDay.format(new Date(weekEnd.getTime() - 86400000))}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Link
              href={`/ogretmen/takvim?week=${weekOffset - 1}`}
              className="pd-btn pd-btn-ghost pd-btn-sm"
              style={{ padding: "6px 8px" }}
            >
              <ChevronLeft size={14} />
            </Link>
            <Link href="/ogretmen/takvim" className="pd-btn pd-btn-ghost pd-btn-sm">
              Bu Hafta
            </Link>
            <Link
              href={`/ogretmen/takvim?week=${weekOffset + 1}`}
              className="pd-btn pd-btn-ghost pd-btn-sm"
              style={{ padding: "6px 8px" }}
            >
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div className="pd-page-body">
        <div className="pd-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--pd-line)" }}>
                  <th
                    style={{
                      width: 52,
                      padding: "8px",
                      textAlign: "right",
                      color: "var(--pd-muted)",
                      fontWeight: 500,
                      position: "sticky",
                      left: 0,
                      background: "var(--pd-bg-elevated)",
                      zIndex: 10,
                    }}
                  >
                    Saat
                  </th>
                  {weekDays.map((day, i) => {
                    const isToday = day.toDateString() === today.toDateString();
                    return (
                      <th
                        key={i}
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          minWidth: 100,
                          fontWeight: 500,
                          background: isToday ? "var(--pd-accent-soft)" : "transparent",
                          color: isToday ? "var(--pd-accent)" : "var(--pd-muted)",
                        }}
                      >
                        <div style={{ fontSize: 11 }}>{DAY_NAMES[i]}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: isToday ? "var(--pd-accent)" : "var(--pd-ink)" }}>
                          {day.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour} style={{ borderBottom: "1px solid var(--pd-line)" }}>
                    <td
                      style={{
                        padding: "6px 8px",
                        textAlign: "right",
                        color: "var(--pd-muted-2)",
                        verticalAlign: "top",
                        position: "sticky",
                        left: 0,
                        background: "var(--pd-bg-elevated)",
                        zIndex: 10,
                        fontWeight: 500,
                        fontSize: 11,
                      }}
                    >
                      {String(hour).padStart(2, "0")}:00
                    </td>
                    {weekDays.map((day, di) => {
                      const isToday = day.toDateString() === today.toDateString();
                      const cellLessons = weekLessons.filter((l) => {
                        const d = new Date(l.scheduledAt);
                        return (
                          d.getDate() === day.getDate() &&
                          d.getMonth() === day.getMonth() &&
                          d.getHours() === hour
                        );
                      });
                      return (
                        <td
                          key={di}
                          style={{
                            padding: "4px",
                            verticalAlign: "top",
                            minHeight: 40,
                            background: isToday ? "rgba(var(--pd-accent-rgb, 99,102,241), 0.04)" : "transparent",
                          }}
                        >
                          {cellLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              style={{
                                borderRadius: 6,
                                background: "var(--pd-accent-soft)",
                                border: "1px solid var(--pd-line)",
                                padding: "6px 8px",
                                marginBottom: 4,
                              }}
                            >
                              <div style={{ fontWeight: 600, color: "var(--pd-ink)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {lesson.student.fullName.split(" ")[0]}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--pd-muted)", marginTop: 1 }}>
                                {fmtTime.format(new Date(lesson.scheduledAt))} · {lesson.duration}dk
                              </div>
                              {lesson.googleMeetLink && (
                                <a
                                  href={lesson.googleMeetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: 11,
                                    color: "var(--pd-accent)",
                                    textDecoration: "none",
                                    marginTop: 3,
                                    fontWeight: 500,
                                  }}
                                >
                                  <Video size={10} /> Bağlan
                                </a>
                              )}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
