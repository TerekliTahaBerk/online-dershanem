import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, TrendingUp, Download, Plus } from "lucide-react";
import { studentStatusLabels, buildWhatsAppLink } from "@/lib/admin";
import type { Prisma } from "@prisma/client";

type UpcomingLesson = Prisma.LessonGetPayload<{
  include: {
    student: { select: { id: true; fullName: true; phone: true } };
    teacher: { select: { id: true; fullName: true } };
    package: { select: { name: true } };
  };
}>;

export const dynamic = "force-dynamic";

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h}>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--pd-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [
    totalStudents,
    activeStudents,
    thisWeekLessons,
    pendingPayments,
    newLeadsCount,
    overdueTaskCount,
    upcomingLessons,
    recentStudents,
    recentPayments,
    teachers,
    odkExams,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.lesson.count({ where: { status: "SCHEDULED", scheduledAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.purchaseIntent.count({ where: { status: "PENDING" } }),
    prisma.leadSubmission.count({ where: { intakeStatus: "NEW" } }),
    prisma.student.count({ where: { nextActionAt: { not: null, lte: now } } }),
    prisma.lesson.findMany({
      where: { status: "SCHEDULED", scheduledAt: { gte: now } },
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
        teacher: { select: { id: true, fullName: true } },
        package: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 6,
    }) as unknown as UpcomingLesson[],
    prisma.student.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.purchaseIntent.findMany({
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: { student: { select: { fullName: true } } },
    }),
    prisma.teacher.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
    prisma.odkExam.count({ where: { status: "PUBLISHED" } }),
  ]);

  const kpis = [
    {
      label: "Toplam Öğrenci",
      value: totalStudents.toLocaleString("tr-TR"),
      delta: `${activeStudents} aktif`,
      up: true,
      spark: [20, 22, 25, 28, 30, 32, 35, 38, 42, 44, 48, 52],
      href: "/admin/ogrenciler",
    },
    {
      label: "Bu Haftaki Ders",
      value: thisWeekLessons.toString(),
      delta: "Planlı ders",
      up: true,
      spark: [8, 10, 9, 12, 11, 13, 14, 12, 15, 16, 14, thisWeekLessons],
      href: "/admin/dersler",
    },
    {
      label: "Bekleyen Ödeme",
      value: pendingPayments.toString(),
      delta: "işlem bekliyor",
      up: pendingPayments === 0,
      spark: [5, 4, 6, 3, 5, 4, 3, pendingPayments, 4, 3, 4, pendingPayments],
      href: "/admin/odemeler?purchaseStatus=PENDING",
    },
    {
      label: "Yeni Lead",
      value: newLeadsCount.toString(),
      delta: "yanıt bekliyor",
      up: false,
      spark: [10, 14, 18, 20, 22, 26, 28, 32, 34, 36, 38, newLeadsCount],
      href: "/admin/formlar",
    },
  ];

  const statusColors: Record<string, string> = {
    NEW: "pd-tag",
    FOLLOW_UP: "pd-tag pd-tag-warning",
    ACTIVE: "pd-tag pd-tag-success",
    AT_RISK: "pd-tag pd-tag-danger",
    COMPLETED: "pd-tag pd-tag-info",
    INACTIVE: "pd-tag",
  };

  return (
    <>
      {/* Page header */}
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--pd-muted)", marginBottom: 4 }}>
              {new Intl.DateTimeFormat("tr-TR", { dateStyle: "full" }).format(now)}
            </div>
            <h1 className="pd-page-title">Dashboard</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/formlar" className="pd-btn pd-btn-ghost pd-btn-sm">
              Leadler
              {newLeadsCount > 0 && (
                <span
                  style={{
                    background: "var(--pd-accent)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 999,
                    marginLeft: 4,
                  }}
                >
                  {newLeadsCount}
                </span>
              )}
            </Link>
            <Link href="/admin/dersler/yeni" className="pd-btn pd-btn-primary pd-btn-sm">
              <Plus size={13} /> Ders Planla
            </Link>
          </div>
        </div>
      </div>

      <div className="pd-page-body">
        {/* KPI Grid */}
        <div className="pd-kpi-grid">
          {kpis.map((k) => (
            <Link key={k.label} href={k.href} style={{ textDecoration: "none" }}>
              <div className="pd-kpi-card" style={{ cursor: "pointer", transition: "box-shadow 150ms ease" }}>
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
                  <div>
                    <div className="pd-kpi-label">{k.label}</div>
                    <div className="pd-kpi-value">{k.value}</div>
                    <div className={`pd-kpi-delta ${k.up ? "up" : "down"}`}>
                      <TrendingUp size={11} />
                      {k.delta}
                    </div>
                  </div>
                  <Spark values={k.spark} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Main 3-col layout */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Upcoming lessons */}
          <div className="pd-card">
            <div className="pd-card-head">
              <div>
                <div className="pd-card-title">Sıradaki Dersler</div>
                <div className="pd-card-sub">{upcomingLessons.length} ders planlandı</div>
              </div>
              <Link href="/admin/dersler" className="pd-btn pd-btn-ghost pd-btn-sm">
                Tümü <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ overflowX: "auto" }}>
              {upcomingLessons.length === 0 ? (
                <div className="pd-card-body" style={{ color: "var(--pd-muted)", fontSize: 13 }}>
                  Planlı ders yok
                </div>
              ) : (
                <table className="pd-table">
                  <thead>
                    <tr>
                      <th>Öğrenci</th>
                      <th>Öğretmen</th>
                      <th>Paket</th>
                      <th>Tarih</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingLessons.map((lesson) => {
                      const d = new Date(lesson.scheduledAt);
                      const waLink = buildWhatsAppLink(lesson.student.phone);
                      return (
                        <tr key={lesson.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className="pd-avatar pd-avatar-sm">
                                {lesson.student.fullName[0]}
                              </div>
                              <span style={{ fontWeight: 500 }}>{lesson.student.fullName}</span>
                            </div>
                          </td>
                          <td style={{ color: "var(--pd-muted)", fontSize: 13 }}>{lesson.teacher.fullName}</td>
                          <td style={{ color: "var(--pd-muted)", fontSize: 13 }}>{lesson.package?.name ?? "—"}</td>
                          <td style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                            {new Intl.DateTimeFormat("tr-TR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(d)}
                          </td>
                          <td>
                            {lesson.googleMeetLink && (
                              <a
                                href={lesson.googleMeetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pd-btn pd-btn-ghost pd-btn-sm"
                              >
                                Meet
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--pd-line)" }}>
              <Link href="/admin/dersler/yeni" className="pd-btn pd-btn-accent pd-btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                + Yeni Ders Planla
              </Link>
            </div>
          </div>

          {/* Recent students */}
          <div className="pd-card">
            <div className="pd-card-head">
              <div>
                <div className="pd-card-title">Son Öğrenciler</div>
                <div className="pd-card-sub">Yeni kayıtlar</div>
              </div>
              <Link href="/admin/ogrenciler" className="pd-btn pd-btn-ghost pd-btn-sm">
                Tümü
              </Link>
            </div>
            <div>
              {recentStudents.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/admin/ogrenciler/${s.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 16px",
                    borderBottom: i < recentStudents.length - 1 ? "1px solid var(--pd-line)" : "none",
                    textDecoration: "none",
                    transition: "background 120ms ease",
                  }}
                >
                  <div className="pd-avatar">{s.fullName[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pd-ink)" }}>{s.fullName}</div>
                    <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>
                      {s.examType ?? s.classLevel ?? "—"}
                    </div>
                  </div>
                  <span className={statusColors[s.status] ?? "pd-tag"}>
                    {studentStatusLabels[s.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Payments */}
          <div className="pd-card">
            <div className="pd-card-head">
              <div className="pd-card-title">Son Ödemeler</div>
              <Link href="/admin/odemeler" className="pd-btn pd-btn-ghost pd-btn-sm">
                Tümü
              </Link>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Tutar</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>
                        {p.student?.fullName ?? "—"}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        {p.price
                          ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(p.price)
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={
                            p.status === "PAID"
                              ? "pd-tag pd-tag-success"
                              : p.status === "FAILED"
                              ? "pd-tag pd-tag-danger"
                              : "pd-tag pd-tag-warning"
                          }
                        >
                          {p.status === "PAID" ? "Ödendi" : p.status === "FAILED" ? "Başarısız" : "Bekliyor"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--pd-muted)" }}>
                        {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(
                          new Date(p.submittedAt)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teachers + ODK quick stats */}
          <div className="pd-card">
            <div className="pd-card-head">
              <div className="pd-card-title">Öğretmen Kadrosu</div>
              <Link href="/admin/hocalar" className="pd-btn pd-btn-ghost pd-btn-sm">
                Yönet
              </Link>
            </div>
            <div>
              {teachers.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 16px",
                    borderBottom: i < teachers.length - 1 ? "1px solid var(--pd-line)" : "none",
                  }}
                >
                  <div className="pd-avatar">{t.fullName[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pd-ink)" }}>{t.fullName}</div>
                    <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>{t.branch ?? "—"}</div>
                  </div>
                  <span className={t.status === "ACTIVE" ? "pd-tag pd-tag-success" : "pd-tag"}>
                    {t.status === "ACTIVE" ? "Aktif" : "Pasif"}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--pd-line)", background: "var(--pd-bg-subtle)", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    ODK Aktif Sınavlar
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "var(--pd-ink)", marginTop: 2 }}>{odkExams}</div>
                </div>
                <Link href="/odk/admin/sinavlar" className="pd-btn pd-btn-ghost pd-btn-sm">
                  ODK Yönet →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
