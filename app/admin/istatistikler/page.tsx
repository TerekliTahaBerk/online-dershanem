import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { studentStatusLabels, lessonStatusLabels, purchaseStatusLabels, intakeStatusLabels } from "@/lib/admin";
import { StudentStatus, LessonStatus, PurchaseStatus, IntakeStatus } from "@prisma/client";

// groupBy result types (Prisma Accelerate strips inference)
type GroupByStatus<T extends string> = { status: T; _count: number }[];
type GroupByIntakeStatus = { intakeStatus: IntakeStatus; _count: number }[];
type GroupByExamType = { examType: string | null; _count: number }[];

export const dynamic = "force-dynamic";

function BarChart({ data, colorClass = "bg-[var(--pd-accent)]" }: {
  data: { label: string; value: number; total: number }[];
  colorClass?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map(({ label, value, total }) => (
        <div key={label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--pd-ink-3)] font-medium">{label}</span>
            <span className="text-[var(--pd-muted)]">{value} <span className="text-gray-300">/ {total}</span></span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colorClass}`}
              style={{ width: `${total === 0 ? 0 : (value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--pd-line)] p-5 text-center">
      <p className="text-3xl font-bold text-[var(--pd-ink)]">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-[var(--pd-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function IstatistiklerPage() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    // Student stats
    studentsByStatus,
    studentsThisMonth,
    studentsLastMonth,
    // Lesson stats
    lessonsByStatus,
    lessonsThisMonth,
    lessonsLastMonth,
    // Payment stats
    purchasesByStatus,
    paidThisMonth,
    paidLastMonth,
    // Lead stats
    leadsByStatus,
    leadsThisMonth,
    // Teacher stats
    teacherCount,
    activeTeacherCount,
    // Package stats
    packageCount,
    // Exam type breakdown
    studentsByExam,
  ] = await Promise.all([
    // Students by status
    prisma.student.groupBy({ by: ["status"], _count: true }) as unknown as GroupByStatus<StudentStatus>,
    prisma.student.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.student.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    // Lessons by status
    prisma.lesson.groupBy({ by: ["status"], _count: true }) as unknown as GroupByStatus<LessonStatus>,
    prisma.lesson.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.lesson.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    // Purchases by status
    prisma.purchaseIntent.groupBy({ by: ["status"], _count: true }) as unknown as GroupByStatus<PurchaseStatus>,
    prisma.purchaseIntent.count({ where: { status: "PAID", updatedAt: { gte: thisMonthStart } } }),
    prisma.purchaseIntent.count({ where: { status: "PAID", updatedAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    // Leads by status
    prisma.leadSubmission.groupBy({ by: ["intakeStatus"], _count: true }) as unknown as GroupByIntakeStatus,
    prisma.leadSubmission.count({ where: { submittedAt: { gte: thisMonthStart } } }),
    // Teachers
    prisma.teacher.count(),
    prisma.teacher.count({ where: { status: "ACTIVE" } }),
    // Packages
    prisma.package.count({ where: { isActive: true } }),
    // Students by exam type
    prisma.student.groupBy({ by: ["examType"], _count: true, orderBy: { _count: { examType: "desc" } }, take: 6 }) as unknown as GroupByExamType
  ]);

  const totalStudents = studentsByStatus.reduce((s, g) => s + g._count, 0);
  const totalLessons = lessonsByStatus.reduce((s, g) => s + g._count, 0);
  const totalPurchases = purchasesByStatus.reduce((s, g) => s + g._count, 0);

  const studentStatusData = (Object.keys(studentStatusLabels) as StudentStatus[]).map((status) => ({
    label: studentStatusLabels[status],
    value: studentsByStatus.find((g) => g.status === status)?._count ?? 0,
    total: totalStudents
  }));

  const lessonStatusData = (Object.keys(lessonStatusLabels) as LessonStatus[]).map((status) => ({
    label: lessonStatusLabels[status],
    value: lessonsByStatus.find((g) => g.status === status)?._count ?? 0,
    total: totalLessons
  }));

  const purchaseStatusData = (Object.keys(purchaseStatusLabels) as PurchaseStatus[]).map((status) => ({
    label: purchaseStatusLabels[status],
    value: purchasesByStatus.find((g) => g.status === status)?._count ?? 0,
    total: totalPurchases
  }));

  const leadStatusData = (Object.keys(intakeStatusLabels) as IntakeStatus[]).map((status) => ({
    label: intakeStatusLabels[status],
    value: leadsByStatus.find((g) => g.intakeStatus === status)?._count ?? 0,
    total: leadsByStatus.reduce((s, g) => s + g._count, 0)
  }));

  const examTypeData = studentsByExam
    .filter((g) => g.examType)
    .map((g) => ({
      label: g.examType!,
      value: g._count,
      total: totalStudents
    }));

  const studentGrowth = studentsLastMonth === 0 ? null :
    Math.round(((studentsThisMonth - studentsLastMonth) / studentsLastMonth) * 100);
  const lessonGrowth = lessonsLastMonth === 0 ? null :
    Math.round(((lessonsThisMonth - lessonsLastMonth) / lessonsLastMonth) * 100);
  const paymentGrowth = paidLastMonth === 0 ? null :
    Math.round(((paidThisMonth - paidLastMonth) / paidLastMonth) * 100);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--pd-ink)]">İstatistikler</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform geneli analiz ve istatistikler</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Öğrenci"
          value={totalStudents}
          sub={studentsThisMonth > 0 ? `Bu ay +${studentsThisMonth}` : undefined}
        />
        <StatCard
          label="Toplam Ders"
          value={totalLessons}
          sub={lessonsThisMonth > 0 ? `Bu ay +${lessonsThisMonth}` : undefined}
        />
        <StatCard
          label="Ödenen İşlem"
          value={purchasesByStatus.find((g) => g.status === "PAID")?._count ?? 0}
          sub={paidThisMonth > 0 ? `Bu ay +${paidThisMonth}` : undefined}
        />
        <StatCard
          label="Aktif Hoca"
          value={`${activeTeacherCount} / ${teacherCount}`}
          sub={`${packageCount} aktif paket`}
        />
      </div>

      {/* Month comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Öğrenci Büyümesi",
            thisMonth: studentsThisMonth,
            lastMonth: studentsLastMonth,
            growth: studentGrowth,
            link: "/admin/ogrenciler"
          },
          {
            label: "Ders Aktivitesi",
            thisMonth: lessonsThisMonth,
            lastMonth: lessonsLastMonth,
            growth: lessonGrowth,
            link: "/admin/dersler"
          },
          {
            label: "Ödeme Aktivitesi",
            thisMonth: paidThisMonth,
            lastMonth: paidLastMonth,
            growth: paymentGrowth,
            link: "/admin/odemeler"
          }
        ].map(({ label, thisMonth, lastMonth, growth, link }) => (
          <Link key={label} href={link} className="bg-white rounded-xl border border-[var(--pd-line)] p-5 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <div className="flex items-end justify-between mt-2">
              <div>
                <p className="text-2xl font-bold text-[var(--pd-ink)]">{thisMonth}</p>
                <p className="text-xs text-[var(--pd-muted)] mt-0.5">Bu ay</p>
              </div>
              {growth !== null && (
                <span className={`text-sm font-semibold px-2 py-1 rounded-lg ${
                  growth > 0 ? "bg-emerald-50 text-emerald-600" :
                  growth < 0 ? "bg-red-50 text-red-600" :
                  "bg-gray-50 text-gray-500"
                }`}>
                  {growth > 0 ? "+" : ""}{growth}%
                </span>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-[var(--pd-muted)]">
              Geçen ay: {lastMonth}
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Student by Status */}
        <div className="bg-white rounded-xl border border-[var(--pd-line)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--pd-ink)]">Öğrenci Durumu</h2>
            <Link href="/admin/ogrenciler" className="text-xs text-[var(--pd-accent)] hover:underline">Tümü →</Link>
          </div>
          <BarChart data={studentStatusData} colorClass="bg-[var(--pd-accent)]" />
        </div>

        {/* Lesson by Status */}
        <div className="bg-white rounded-xl border border-[var(--pd-line)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--pd-ink)]">Ders Durumu</h2>
            <Link href="/admin/dersler" className="text-xs text-[var(--pd-accent)] hover:underline">Tümü →</Link>
          </div>
          <BarChart data={lessonStatusData} colorClass="bg-blue-400" />
        </div>

        {/* Payment by Status */}
        <div className="bg-white rounded-xl border border-[var(--pd-line)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--pd-ink)]">Ödeme Durumu</h2>
            <Link href="/admin/odemeler" className="text-xs text-[var(--pd-accent)] hover:underline">Tümü →</Link>
          </div>
          <BarChart data={purchaseStatusData} colorClass="bg-violet-400" />
        </div>

        {/* Lead by Status */}
        <div className="bg-white rounded-xl border border-[var(--pd-line)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--pd-ink)]">Form Başvuru Süreci</h2>
            <Link href="/admin/formlar" className="text-xs text-[var(--pd-accent)] hover:underline">Tümü →</Link>
          </div>
          <BarChart data={leadStatusData} colorClass="bg-amber-400" />
        </div>
      </div>

      {/* Exam type breakdown */}
      {examTypeData.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--pd-line)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[var(--pd-ink)]">Sınav Türüne Göre Öğrenci</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {examTypeData.map(({ label, value }) => (
              <Link
                key={label}
                href={`/admin/ogrenciler?q=${label}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-[var(--pd-accent-soft)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--pd-ink-2)]">{label}</span>
                <span className="text-sm font-bold text-[var(--pd-accent)]">{value}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Form leads this month */}
      <div className="bg-white rounded-xl border border-[var(--pd-line)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--pd-ink)]">Bu Ay Form Başvuruları</h2>
          <span className="text-2xl font-bold text-[var(--pd-accent)]">{leadsThisMonth}</span>
        </div>
        <p className="text-sm text-gray-500">
          Web sitesinden gelen form başvurularının {leadsThisMonth} tanesi bu ay geldi.
        </p>
        <Link href="/admin/formlar" className="mt-3 inline-block text-xs text-[var(--pd-accent)] hover:underline">
          Tüm formlara git →
        </Link>
      </div>
    </div>
  );
}
