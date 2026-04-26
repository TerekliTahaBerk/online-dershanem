import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, BookOpen, Layers3, Plus, Radio, TrendingUp } from "lucide-react";
import { studentStatusLabels, buildWhatsAppLink } from "@/lib/admin";
import type { Prisma, CourseStatus } from "@prisma/client";

type UpcomingLesson = Prisma.LessonGetPayload<{
  include: {
    student: { select: { id: true; fullName: true; phone: true } };
    teacher: { select: { id: true; fullName: true } };
    package: { select: { name: true } };
  };
}>;

type DashboardCourse = Prisma.CourseGetPayload<{
  include: {
    modules: {
      include: {
        contents: true;
      };
    };
    packageCourses: {
      include: {
        package: {
          select: { name: true };
        };
      };
    };
    studentProgress: {
      select: { completionPercent: true };
    };
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
    courses,
    activeEnrollments,
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
    prisma.course.findMany({
      include: {
        modules: {
          include: { contents: true },
          orderBy: { orderIndex: "asc" },
        },
        packageCourses: {
          include: { package: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        studentProgress: { select: { completionPercent: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 4,
    }) as unknown as DashboardCourse[],
    prisma.studentPackageEnrollment.count({ where: { status: "ACTIVE" } }),
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

  const courseStatusLabels: Record<CourseStatus, string> = {
    DRAFT: "Taslak",
    PUBLISHED: "Yayinda",
    ARCHIVED: "Arsiv",
  };

  const courseStatusColors: Record<CourseStatus, string> = {
    DRAFT: "pd-tag pd-tag-warning",
    PUBLISHED: "pd-tag pd-tag-success",
    ARCHIVED: "pd-tag",
  };

  const totalModules = courses.reduce((sum, course) => sum + course.modules.length, 0);
  const totalContents = courses.reduce(
    (sum, course) => sum + course.modules.reduce((moduleSum, module) => moduleSum + module.contents.length, 0),
    0
  );
  const liveContentCount = courses.reduce(
    (sum, course) =>
      sum +
      course.modules.reduce(
        (moduleSum, module) => moduleSum + module.contents.filter((content) => content.contentType === "LIVE_SESSION").length,
        0
      ),
    0
  );

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
            <Link href="/admin/icerikler" className="pd-btn pd-btn-ghost pd-btn-sm">
              Icerikler
            </Link>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 16 }}>
          <Link href="/admin/icerikler" style={{ textDecoration: "none" }}>
            <div className="pd-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Kurs Alani</div>
                <BookOpen size={16} color="var(--pd-accent)" />
              </div>
              <div style={{ fontSize: 30, fontWeight: 600, color: "var(--pd-ink)", lineHeight: 1 }}>{courses.length}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "var(--pd-muted)" }}>{totalModules} modul · {totalContents} icerik</div>
            </div>
          </Link>
          <Link href="/admin/icerikler" style={{ textDecoration: "none" }}>
            <div className="pd-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Yayinlanan Akis</div>
                <Layers3 size={16} color="var(--pd-accent)" />
              </div>
              <div style={{ fontSize: 30, fontWeight: 600, color: "var(--pd-ink)", lineHeight: 1 }}>
                {courses.filter((course) => course.status === "PUBLISHED").length}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: "var(--pd-muted)" }}>{activeEnrollments} aktif uyelik ile iliskili</div>
            </div>
          </Link>
          <Link href="/admin/icerikler" style={{ textDecoration: "none" }}>
            <div className="pd-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Canli Icerikler</div>
                <Radio size={16} color="var(--pd-accent)" />
              </div>
              <div style={{ fontSize: 30, fontWeight: 600, color: "var(--pd-ink)", lineHeight: 1 }}>{liveContentCount}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "var(--pd-muted)" }}>Panel ve takvim akislarina hazir</div>
            </div>
          </Link>
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

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, marginBottom: 16 }}>
          <div className="pd-card">
            <div className="pd-card-head">
              <div>
                <div className="pd-card-title">Icerik Yonetimi</div>
                <div className="pd-card-sub">Kurs, modul ve paket baglari</div>
              </div>
              <Link href="/admin/icerikler" className="pd-btn pd-btn-ghost pd-btn-sm">
                Yonet <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ padding: "0 16px 16px" }}>
              {courses.length === 0 ? (
                <div style={{ padding: "24px 0", color: "var(--pd-muted)", fontSize: 13 }}>
                  Henuz kurs tanimli degil.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {courses.map((course) => {
                    const courseContentCount = course.modules.reduce((sum, module) => sum + module.contents.length, 0);
                    const averageCompletion = course.studentProgress.length
                      ? Math.round(
                          course.studentProgress.reduce((sum, progress) => sum + progress.completionPercent, 0) /
                            course.studentProgress.length
                        )
                      : 0;

                    return (
                      <div
                        key={course.id}
                        style={{
                          border: "1px solid var(--pd-line)",
                          borderRadius: 14,
                          padding: 14,
                          background: "var(--pd-bg-elevated)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--pd-ink)" }}>{course.title}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "var(--pd-muted)" }}>
                              {course.subject} {course.examType ? `· ${course.examType}` : ""}
                            </div>
                          </div>
                          <span className={courseStatusColors[course.status]}>{courseStatusLabels[course.status]}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                          <span className="pd-tag">{course.modules.length} modul</span>
                          <span className="pd-tag">{courseContentCount} icerik</span>
                          <span className="pd-tag">{course.packageCourses.length} paket</span>
                          <span className="pd-tag pd-tag-info">%{averageCompletion} ort. ilerleme</span>
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
                <div className="pd-card-title">Paket Baglantilari</div>
                <div className="pd-card-sub">Yeni kurs modeli ile eslesmeler</div>
              </div>
              <Link href="/admin/paketler" className="pd-btn pd-btn-ghost pd-btn-sm">
                Paketler
              </Link>
            </div>
            <div>
              {courses.slice(0, 4).map((course, index) => (
                <div
                  key={course.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: index < Math.min(courses.length, 4) - 1 ? "1px solid var(--pd-line)" : "none",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pd-ink)" }}>{course.title}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {course.packageCourses.length === 0 ? (
                      <span style={{ fontSize: 12, color: "var(--pd-muted)" }}>Paket bagi yok</span>
                    ) : (
                      course.packageCourses.map((packageCourse) => (
                        <span key={packageCourse.packageId} className="pd-tag pd-tag-success">
                          {packageCourse.package.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--pd-line)" }}>
                <Link href="/admin/icerikler" className="pd-btn pd-btn-accent pd-btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                  Icerik Merkezi
                </Link>
              </div>
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
                      <td style={{ fontSize: 13, color: "var(--pd-ink-2)" }}>
                        {p.packageName ?? "—"}
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
                    <div style={{ fontSize: 11, color: "var(--pd-muted)" }}>{t.subjects ?? "—"}</div>
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
