import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { BookOpen, ExternalLink } from "lucide-react";
import { updateLessonNotesAction, completeLessonAction, cancelLessonAction } from "../actions";

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

type Tab = "upcoming" | "completed" | "cancelled" | "all";

const tabLabels: Record<Tab, string> = {
  upcoming: "Yaklaşan",
  completed: "Tamamlanan",
  cancelled: "İptal",
  all: "Tümü",
};

const statusChip: Record<string, { bg: string; color: string }> = {
  SCHEDULED: { bg: "#dbeafe", color: "#1d4ed8" },
  COMPLETED: { bg: "var(--pd-accent-soft)", color: "var(--pd-accent)" },
  CANCELLED: { bg: "var(--pd-bg-subtle)", color: "var(--pd-muted-2)" },
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

const fmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default async function OgretmenDerslerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const params = await searchParams;
  const tab = (params.tab as Tab) ?? "upcoming";
  const editId = params.edit ?? "";

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teacher: {
        include: {
          lessons: {
            include: { student: true, package: true },
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
    },
  })) as unknown as TeacherWithUser | null;

  const teacher = user?.teacher;
  if (!teacher) redirect("/ogretmen");

  const now = new Date();
  const allLessons = teacher.lessons;

  const filtered = {
    upcoming: allLessons.filter((l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now).reverse(),
    completed: allLessons.filter((l) => l.status === "COMPLETED"),
    cancelled: allLessons.filter((l) => l.status === "CANCELLED"),
    all: allLessons,
  }[tab];

  const counts = {
    upcoming: allLessons.filter((l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now).length,
    completed: allLessons.filter((l) => l.status === "COMPLETED").length,
    cancelled: allLessons.filter((l) => l.status === "CANCELLED").length,
    all: allLessons.length,
  };

  return (
    <>
      <div className="pd-page-header">
        <h1 className="pd-page-title">Derslerim</h1>
        <p className="pd-page-sub">{allLessons.length} ders kaydı</p>
      </div>

      <div className="pd-page-body">
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--pd-bg-subtle)", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 20 }}>
          {(["upcoming", "completed", "cancelled", "all"] as Tab[]).map((t) => (
            <a
              key={t}
              href={`/ogretmen/dersler?tab=${t}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                background: tab === t ? "var(--pd-bg-elevated)" : "transparent",
                color: tab === t ? "var(--pd-ink)" : "var(--pd-muted)",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 120ms ease",
              }}
            >
              {tabLabels[t]}
              <span style={{ fontSize: 11, color: "var(--pd-muted-2)" }}>{counts[t]}</span>
            </a>
          ))}
        </div>

        {/* Table card */}
        <div className="pd-card" style={{ overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <BookOpen size={28} style={{ color: "var(--pd-muted-2)", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 13, color: "var(--pd-muted)" }}>Bu filtrede ders görünmüyor</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--pd-line)", background: "var(--pd-bg-subtle)" }}>
                    {["Tarih / Saat", "Öğrenci", "Paket", "Süre", "Bağlantı", "Durum", ""].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "10px 16px",
                          textAlign: i === 6 ? "right" : "left",
                          fontWeight: 600,
                          fontSize: 11,
                          color: "var(--pd-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lesson) => {
                    const isEditing = editId === lesson.id;
                    const isPast = new Date(lesson.scheduledAt) < now;
                    const isOverdue = isPast && lesson.status === "SCHEDULED";
                    const chip = statusChip[lesson.status] ?? statusChip.SCHEDULED;

                    return (
                      <>
                        <tr
                          key={lesson.id}
                          style={{
                            borderBottom: "1px solid var(--pd-line)",
                            background: isEditing ? "var(--pd-accent-soft)" : "transparent",
                            opacity: lesson.status === "CANCELLED" ? 0.55 : 1,
                          }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 500, color: isOverdue ? "#b45309" : "var(--pd-ink)" }}>
                              {fmt.format(new Date(lesson.scheduledAt))}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--pd-muted)", marginTop: 2 }}>
                              {fmtTime.format(new Date(lesson.scheduledAt))}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "var(--pd-accent-soft)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--pd-accent)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {lesson.student.fullName.charAt(0)}
                              </div>
                              <span style={{ fontWeight: 500, color: "var(--pd-ink)" }}>{lesson.student.fullName}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--pd-muted)", fontSize: 12 }}>
                            {lesson.package?.name ?? "—"}
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--pd-muted)" }}>{lesson.duration} dk</td>
                          <td style={{ padding: "12px 16px" }}>
                            {lesson.googleMeetLink ? (
                              <a
                                href={lesson.googleMeetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pd-btn pd-btn-ghost pd-btn-sm"
                              >
                                <ExternalLink size={11} /> Meet
                              </a>
                            ) : (
                              <span style={{ color: "var(--pd-muted-2)", fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 600,
                                background: chip.bg,
                                color: chip.color,
                              }}
                            >
                              {statusLabels[lesson.status]}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            {lesson.status === "SCHEDULED" && (
                              <a
                                href={`/ogretmen/dersler?tab=${tab}&edit=${isEditing ? "" : lesson.id}`}
                                className="pd-btn pd-btn-ghost pd-btn-sm"
                              >
                                {isEditing ? "Kapat" : "Düzenle"}
                              </a>
                            )}
                          </td>
                        </tr>

                        {lesson.notes && !isEditing && (
                          <tr key={`${lesson.id}-notes`} style={{ opacity: lesson.status === "CANCELLED" ? 0.55 : 1 }}>
                            <td colSpan={7} style={{ padding: "0 16px 12px" }}>
                              <div
                                style={{
                                  borderRadius: 8,
                                  padding: "8px 12px",
                                  fontSize: 12,
                                  background: lesson.status === "COMPLETED" ? "#fffbeb" : "var(--pd-bg-subtle)",
                                  border: `1px solid ${lesson.status === "COMPLETED" ? "#fde68a" : "var(--pd-line)"}`,
                                  color: lesson.status === "COMPLETED" ? "#92400e" : "var(--pd-muted)",
                                }}
                              >
                                <span style={{ fontWeight: 600, marginRight: 4 }}>Not:</span>
                                {lesson.notes}
                              </div>
                            </td>
                          </tr>
                        )}

                        {isEditing && (
                          <tr key={`${lesson.id}-edit`}>
                            <td
                              colSpan={7}
                              style={{
                                padding: "16px",
                                background: "var(--pd-bg-subtle)",
                                borderBottom: "1px solid var(--pd-line)",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <form action={updateLessonNotesAction} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <input type="hidden" name="lessonId" value={lesson.id} />
                                  <input type="hidden" name="tab" value={tab} />
                                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Ders Notu
                                  </label>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <textarea
                                      name="notes"
                                      rows={2}
                                      defaultValue={lesson.notes ?? ""}
                                      placeholder="Öğrenciyle paylaşılacak kısa not"
                                      style={{
                                        flex: 1,
                                        borderRadius: 8,
                                        border: "1px solid var(--pd-line)",
                                        padding: "8px 12px",
                                        fontSize: 13,
                                        color: "var(--pd-ink)",
                                        background: "var(--pd-bg-elevated)",
                                        outline: "none",
                                        resize: "none",
                                      }}
                                    />
                                    <button type="submit" className="pd-btn pd-btn-ghost pd-btn-sm" style={{ alignSelf: "flex-end" }}>
                                      Kaydet
                                    </button>
                                  </div>
                                </form>

                                {isPast && (
                                  <form action={completeLessonAction}>
                                    <input type="hidden" name="lessonId" value={lesson.id} />
                                    <input type="hidden" name="tab" value={tab} />
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <textarea
                                        name="notes"
                                        rows={2}
                                        defaultValue={lesson.notes ?? ""}
                                        placeholder="Kapanış notu ekleyebilirsiniz"
                                        style={{
                                          flex: 1,
                                          borderRadius: 8,
                                          border: "1px solid var(--pd-line)",
                                          padding: "8px 12px",
                                          fontSize: 13,
                                          color: "var(--pd-ink)",
                                          background: "var(--pd-bg-elevated)",
                                          outline: "none",
                                          resize: "none",
                                        }}
                                      />
                                      <button type="submit" className="pd-btn pd-btn-accent pd-btn-sm" style={{ alignSelf: "flex-end" }}>
                                        Dersi Tamamla
                                      </button>
                                    </div>
                                  </form>
                                )}

                                <form action={cancelLessonAction}>
                                  <input type="hidden" name="lessonId" value={lesson.id} />
                                  <input type="hidden" name="tab" value={tab} />
                                  <button
                                    type="submit"
                                    style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                                  >
                                    Dersi iptal et
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
