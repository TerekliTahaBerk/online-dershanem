import Link from "next/link";
import { Users, CreditCard, CalendarDays, ClipboardList, TrendingUp, ExternalLink, ArrowRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { studentStatusLabels, buildWhatsAppLink } from "@/lib/admin";

type UpcomingLesson = Prisma.LessonGetPayload<{
  include: {
    student: { select: { id: true; fullName: true; phone: true } };
    teacher: { select: { id: true; fullName: true } };
    package: { select: { name: true } };
  };
}>;

export const dynamic = "force-dynamic";

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
    overdueTaskStudents,
    overdueTaskLeads,
    upcomingLessons,
    recentStudents
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.lesson.count({ where: { status: "SCHEDULED", scheduledAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.purchaseIntent.count({ where: { status: "PENDING" } }),
    prisma.student.count({ where: { nextActionAt: { not: null, lte: now } } }),
    prisma.leadSubmission.count({ where: { nextActionAt: { not: null, lte: now } } }),
    prisma.lesson.findMany({
      where: { status: "SCHEDULED", scheduledAt: { gte: now } },
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
        teacher: { select: { id: true, fullName: true } },
        package: { select: { name: true } }
      },
      orderBy: { scheduledAt: "asc" },
      take: 8
    }) as unknown as UpcomingLesson[],
    prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  const overdueTaskCount = overdueTaskStudents + overdueTaskLeads;

  const statCards = [
    {
      label: "Toplam Öğrenci",
      value: totalStudents,
      unit: "Öğrenci",
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-50",
      href: "/admin/ogrenciler",
      trend: null
    },
    {
      label: "Aktif Öğrenci",
      value: activeStudents,
      unit: "Aktif",
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      href: "/admin/ogrenciler?studentStatus=ACTIVE",
      trend: null
    },
    {
      label: "Bu Haftaki Ders",
      value: thisWeekLessons,
      unit: "Ders",
      icon: CalendarDays,
      color: "text-blue-500",
      bg: "bg-blue-50",
      href: "/admin/dersler",
      trend: null
    },
    {
      label: "Bekleyen Ödeme",
      value: pendingPayments,
      unit: "İşlem",
      icon: CreditCard,
      color: "text-amber-500",
      bg: "bg-amber-50",
      href: "/admin/odemeler?purchaseStatus=PENDING",
      trend: null
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#091413]">Genel Bakış</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Intl.DateTimeFormat("tr-TR", { dateStyle: "full" }).format(now)}
          </p>
        </div>
        {overdueTaskCount > 0 && (
          <Link
            href="/admin/ogrenciler?tasks=1"
            className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <ClipboardList size={15} />
            {overdueTaskCount} bekleyen görev
          </Link>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, unit, icon: Icon, color, bg, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-lg ${bg}`}>
                <Icon size={20} className={color} />
              </div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-[#091413] mt-1">
                {value.toLocaleString("tr-TR")}
                <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Upcoming Lessons */}
        <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#091413]">Yaklaşan Dersler</h2>
            <Link
              href="/admin/dersler"
              className="text-xs text-[#408A71] font-medium hover:underline flex items-center gap-1"
            >
              Tümü <ArrowRight size={11} />
            </Link>
          </div>
          {upcomingLessons.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              Planlanmış ders yok
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingLessons.map((lesson) => {
                const waLink = buildWhatsAppLink(lesson.student.phone);
                return (
                  <div key={lesson.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#B0E4CC]/40 flex items-center justify-center shrink-0 text-[#285A48] font-semibold text-sm">
                        {lesson.student.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#091413] truncate">{lesson.student.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{lesson.teacher.fullName} · {lesson.package?.name ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-700">
                          {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(lesson.scheduledAt))}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(lesson.scheduledAt))}
                        </p>
                      </div>
                      {lesson.googleMeetLink && (
                        <a
                          href={lesson.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Meet <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-100">
            <Link
              href="/admin/dersler/yeni"
              className="w-full flex items-center justify-center gap-2 bg-[#408A71] hover:bg-[#285A48] text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              + Yeni Ders Ekle
            </Link>
          </div>
        </div>

        {/* Recent Students */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-[#091413]">Son Öğrenciler</h2>
            <Link
              href="/admin/ogrenciler"
              className="text-xs text-[#408A71] font-medium hover:underline flex items-center gap-1"
            >
              Tümü <ArrowRight size={11} />
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              Öğrenci yok
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentStudents.map((student) => {
                const statusColors: Record<string, string> = {
                  NEW: "bg-gray-100 text-gray-600",
                  FOLLOW_UP: "bg-yellow-50 text-yellow-700",
                  ACTIVE: "bg-emerald-50 text-emerald-700",
                  AT_RISK: "bg-red-50 text-red-700",
                  COMPLETED: "bg-blue-50 text-blue-700",
                  INACTIVE: "bg-gray-100 text-gray-400"
                };
                return (
                  <Link
                    key={student.id}
                    href={`/admin/ogrenciler/${student.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#B0E4CC]/40 flex items-center justify-center shrink-0 text-[#285A48] font-semibold text-xs">
                        {student.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#091413] truncate">{student.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{student.examType ?? student.classLevel ?? "—"}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColors[student.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {studentStatusLabels[student.status]}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
