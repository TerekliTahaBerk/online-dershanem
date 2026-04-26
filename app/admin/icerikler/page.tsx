import Link from "next/link";
import { Prisma, ContentType, CourseStatus, EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createContentAction,
  createCourseAction,
  createModuleAction,
  linkCourseToPackageAction,
  updateCourseStatusAction,
} from "./actions";
import { BookOpen, Layers3, Link2, Plus, Radio, Users, Video } from "lucide-react";

type CourseWithTree = Prisma.CourseGetPayload<{
  include: {
    modules: {
      include: {
        contents: true;
      };
    };
    packageCourses: {
      include: {
        package: true;
      };
    };
    studentProgress: true;
  };
}>;

const courseStatusLabels: Record<CourseStatus, string> = {
  DRAFT: "Taslak",
  PUBLISHED: "Yayinda",
  ARCHIVED: "Arsiv",
};

const contentTypeLabels: Record<ContentType, string> = {
  LIVE_SESSION: "Canli Ders",
  VIDEO: "Video",
  NOTE: "Not",
  PDF: "PDF",
  QUIZ: "Quiz",
  ASSIGNMENT: "Odev",
  LINK: "Link",
};

const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  LEAD: "Lead",
  TRIAL: "Deneme",
  ACTIVE: "Aktif",
  PAUSED: "Duraklatildi",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
};

const statusTone: Record<CourseStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ARCHIVED: "bg-stone-100 text-stone-700 border-stone-200",
};

const enrollmentTone: Record<EnrollmentStatus, string> = {
  LEAD: "bg-stone-100 text-stone-700",
  TRIAL: "bg-sky-50 text-sky-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-indigo-50 text-indigo-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

type Props = {
  searchParams?: Promise<{ updated?: string }>;
};

function Flash({ updated }: { updated: string }) {
  if (!updated) return null;

  const successMessages: Record<string, string> = {
    "course-created": "Kurs olusturuldu.",
    "module-created": "Modul eklendi.",
    "content-created": "Icerik eklendi.",
    "package-linked": "Kurs pakete baglandi.",
    "course-status-updated": "Kurs durumu guncellendi.",
  };

  const errorMessages: Record<string, string> = {
    "course-error": "Kurs olusturulamadi. Zorunlu alanlari kontrol et.",
    "course-slug-taken": "Bu slug zaten kullaniliyor.",
    "module-error": "Modul eklenemedi.",
    "content-error": "Icerik eklenemedi.",
    "package-link-error": "Paket baglantisi kurulamadi.",
    "course-status-error": "Kurs durumu guncellenemedi.",
  };

  if (successMessages[updated]) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {successMessages[updated]}
      </div>
    );
  }

  if (errorMessages[updated]) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {errorMessages[updated]}
      </div>
    );
  }

  return null;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof BookOpen;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-gray-400">{label}</span>
        <div className="rounded-xl bg-[#0D5C3D]/8 p-2 text-[#0D5C3D]">
          <Icon size={16} />
        </div>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-[#091413]">{value}</div>
      <p className="mt-1 text-sm text-gray-500">{sub}</p>
    </div>
  );
}

export default async function IceriklerPage({ searchParams }: Props) {
  const params = await searchParams;
  const updated = params?.updated ?? "";

  const [
    courses,
    packages,
    enrollmentSummary,
    recentAuditLogs,
    dashboardCounts,
  ] = await Promise.all([
    prisma.course.findMany({
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: { contents: { orderBy: { orderIndex: "asc" } } },
        },
        packageCourses: {
          include: { package: true },
          orderBy: { createdAt: "desc" },
        },
        studentProgress: {
          select: { id: true, completionPercent: true, updatedAt: true },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }) as unknown as CourseWithTree[],
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.studentPackageEnrollment.groupBy({
      by: ["status"],
      _count: true,
      orderBy: { status: "asc" },
    }),
    prisma.auditLog.findMany({
      where: {
        entityType: { in: ["course", "course-module", "course-content", "package-course"] },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true, email: true } } },
    }),
    Promise.all([
      prisma.course.count(),
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.courseContent.count({ where: { status: "PUBLISHED" } }),
      prisma.studentCourseProgress.count(),
      prisma.packageCourse.count(),
    ]),
  ]);

  const [totalCourses, publishedCourses, publishedContentCount, activeProgressCount, packageLinkCount] = dashboardCounts;

  const totalModules = courses.reduce((sum, course) => sum + course.modules.length, 0);
  const totalContent = courses.reduce(
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
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091413]">Icerik Yonetimi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kurs, modul, icerik ve paket baglantilarini mevcut sistemi bozmadan yonet.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/istatistikler"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Istatistikler
          </Link>
          <Link
            href="/admin/paketler"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D5C3D] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A4A31]"
          >
            Paketleri Ac
          </Link>
        </div>
      </div>

      <Flash updated={updated} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Kurslar" value={totalCourses} sub={`${publishedCourses} yayinda`} icon={BookOpen} />
        <StatCard label="Moduller" value={totalModules} sub="Icerik agaci" icon={Layers3} />
        <StatCard label="Icerikler" value={totalContent} sub={`${publishedContentCount} yayinda`} icon={Video} />
        <StatCard label="Canli Oturum" value={liveContentCount} sub={`${activeProgressCount} ogrenci ilerlemesi`} icon={Radio} />
        <StatCard label="Paket Baglari" value={packageLinkCount} sub="Kurs paket eslesmesi" icon={Link2} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#091413]">Yeni Kurs Olustur</h2>
              <p className="text-sm text-gray-500">Yeni admin icerik akislarini ayri route uzerinden yonet.</p>
            </div>
            <div className="rounded-full bg-[#0D5C3D]/8 p-2 text-[#0D5C3D]">
              <Plus size={16} />
            </div>
          </div>
          <form action={createCourseAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input type="hidden" name="returnTo" value="/admin/icerikler" />
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Kurs Basligi</span>
              <input name="title" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#0D5C3D]" placeholder="TYT Matematik Problem Kampi" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Slug</span>
              <input name="slug" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#0D5C3D]" placeholder="tyt-matematik-problem-kampi-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Brans</span>
              <input name="subject" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#0D5C3D]" placeholder="Matematik" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Sinav Tipi</span>
              <input name="examType" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#0D5C3D]" placeholder="TYT / AYT / LGS" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Seviye</span>
              <input name="levelLabel" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#0D5C3D]" placeholder="Baslangic / Orta / Ust" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Tahmini Sure (dk)</span>
              <input name="estimatedMinutes" type="number" min="0" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#0D5C3D]" placeholder="720" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-gray-700">Aciklama</span>
              <textarea name="description" rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none ring-0 transition focus:border-[#0D5C3D]" placeholder="Bu kursun hedefi, ritmi ve panelde nasil gorunecegi..." />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Durum</span>
              <select name="status" defaultValue="DRAFT" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]">
                {Object.entries(courseStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D5C3D] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A4A31]">
                <Plus size={14} /> Kurs Olustur
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-[#091413]">Uyelik Dagilimi</h2>
            <p className="mt-1 text-sm text-gray-500">Paket uyelikleri yeni model uzerinden izleniyor.</p>
            <div className="mt-4 space-y-3">
              {enrollmentSummary.length === 0 ? (
                <p className="text-sm text-gray-400">Henuz uyelik verisi yok.</p>
              ) : (
                enrollmentSummary.map((item) => (
                  <div key={item.status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${enrollmentTone[item.status]}`}>
                        {enrollmentStatusLabels[item.status]}
                      </span>
                      <span className="font-medium text-[#091413]">{item._count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-[#0D5C3D]"
                        style={{
                          width: `${Math.max(
                            10,
                            (item._count / Math.max(...enrollmentSummary.map((entry) => entry._count), 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-[#091413]">Son Icerik Loglari</h2>
            <p className="mt-1 text-sm text-gray-500">Admin aksiyonlari audit log uzerinden takip edilir.</p>
            <div className="mt-4 space-y-3">
              {recentAuditLogs.length === 0 ? (
                <p className="text-sm text-gray-400">Icerik logu bulunmuyor.</p>
              ) : (
                recentAuditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-gray-100 bg-stone-50 px-3 py-3">
                    <div className="text-sm font-medium text-[#091413]">{log.summary ?? log.action}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {(log.actor?.name ?? log.actor?.email ?? "Sistem")} ·{" "}
                      {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-semibold text-[#091413]">Henuz kurs yok</h3>
            <p className="mt-1 text-sm text-gray-500">Admin tarafinda ilk kursu yukaridaki form ile olusturabilirsin.</p>
          </div>
        ) : (
          courses.map((course) => {
            const averageCompletion = course.studentProgress.length
              ? Math.round(
                  course.studentProgress.reduce((sum, progress) => sum + progress.completionPercent, 0) /
                    course.studentProgress.length
                )
              : 0;

            return (
              <div key={course.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-tight text-[#091413]">{course.title}</h2>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone[course.status]}`}>
                        {courseStatusLabels[course.status]}
                      </span>
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                        {course.subject}
                      </span>
                      {course.examType ? (
                        <span className="inline-flex rounded-full bg-[#0D5C3D]/8 px-2.5 py-1 text-xs font-medium text-[#0D5C3D]">
                          {course.examType}
                        </span>
                      ) : null}
                    </div>
                    {course.description ? <p className="max-w-4xl text-sm text-gray-600">{course.description}</p> : null}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>{course.modules.length} modul</span>
                      <span>
                        {course.modules.reduce((sum, module) => sum + module.contents.length, 0)} icerik
                      </span>
                      <span>{course.packageCourses.length} paket baglantisi</span>
                      <span>{course.studentProgress.length} ogrenci ilerlemesi</span>
                      <span>Ort. tamamlama %{averageCompletion}</span>
                    </div>
                  </div>

                  <form action={updateCourseStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="returnTo" value="/admin/icerikler" />
                    <select
                      name="status"
                      defaultValue={course.status}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#0D5C3D]"
                    >
                      {Object.entries(courseStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                      Durumu Guncelle
                    </button>
                  </form>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    {course.modules.map((module) => (
                      <div key={module.id} className="rounded-2xl border border-gray-100 bg-stone-50 p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[#091413]">
                              Modul {module.orderIndex + 1}: {module.title}
                            </div>
                            {module.description ? <p className="mt-1 text-sm text-gray-500">{module.description}</p> : null}
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                            {module.contents.length} icerik
                          </span>
                        </div>

                        <div className="space-y-2">
                          {module.contents.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-400">
                              Bu modulde henuz icerik yok.
                            </div>
                          ) : (
                            module.contents.map((content) => (
                              <div key={content.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                                <div>
                                  <div className="text-sm font-medium text-[#091413]">{content.title}</div>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                    <span>{contentTypeLabels[content.contentType]}</span>
                                    {content.durationMinutes ? <span>{content.durationMinutes} dk</span> : null}
                                    <span>{courseStatusLabels[content.status]}</span>
                                    {content.liveStartsAt ? (
                                      <span>
                                        {new Intl.DateTimeFormat("tr-TR", {
                                          day: "2-digit",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }).format(new Date(content.liveStartsAt))}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {content.externalUrl ? (
                                    <a
                                      href={content.externalUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-600 transition hover:bg-gray-50"
                                    >
                                      Ac
                                    </a>
                                  ) : null}
                                  {content.videoUrl ? (
                                    <a
                                      href={content.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-600 transition hover:bg-gray-50"
                                    >
                                      Video
                                    </a>
                                  ) : null}
                                  {content.fileUrl ? (
                                    <a
                                      href={content.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-gray-600 transition hover:bg-gray-50"
                                    >
                                      Dosya
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <form action={createContentAction} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-2">
                          <input type="hidden" name="moduleId" value={module.id} />
                          <input type="hidden" name="returnTo" value="/admin/icerikler" />
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Icerik Basligi</span>
                            <input name="title" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]" placeholder="Canli etut / PDF / Quiz" />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Tur</span>
                            <select name="contentType" defaultValue="VIDEO" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]">
                              {Object.entries(contentTypeLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1 text-sm md:col-span-2">
                            <span className="font-medium text-gray-700">Aciklama</span>
                            <input name="description" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]" placeholder="Ogrenci panelinde gorunecek kisa aciklama" />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Sure (dk)</span>
                            <input name="durationMinutes" type="number" min="0" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]" placeholder="45" />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Durum</span>
                            <select name="status" defaultValue="PUBLISHED" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]">
                              {Object.entries(courseStatusLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Video URL</span>
                            <input name="videoUrl" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]" placeholder="https://..." />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Dosya URL</span>
                            <input name="fileUrl" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]" placeholder="https://..." />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Harici Link</span>
                            <input name="externalUrl" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]" placeholder="https://meet.google.com/..." />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Canli Baslangic</span>
                            <input name="liveStartsAt" type="datetime-local" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]" />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-gray-700">Canli Bitis</span>
                            <input name="liveEndsAt" type="datetime-local" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-[#0D5C3D]" />
                          </label>
                          <div className="md:col-span-2">
                            <button className="inline-flex items-center gap-2 rounded-xl bg-[#0D5C3D] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A4A31]">
                              <Plus size={14} /> Icerik Ekle
                            </button>
                          </div>
                        </form>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-stone-50 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">Yeni Modul</h3>
                      <form action={createModuleAction} className="mt-3 space-y-3">
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="returnTo" value="/admin/icerikler" />
                        <input name="title" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0D5C3D]" placeholder="Modul basligi" />
                        <textarea name="description" rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0D5C3D]" placeholder="Modul aciklamasi" />
                        <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                          <Plus size={14} /> Modul Ekle
                        </button>
                      </form>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-stone-50 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">Pakete Bagla</h3>
                      <form action={linkCourseToPackageAction} className="mt-3 space-y-3">
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="returnTo" value="/admin/icerikler" />
                        <select name="packageId" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0D5C3D]">
                          <option value="">Paket sec</option>
                          {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                          ))}
                        </select>
                        <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                          <Link2 size={14} /> Pakete Bagla
                        </button>
                      </form>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-stone-50 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">Bagli Paketler</h3>
                      <div className="mt-3 space-y-2">
                        {course.packageCourses.length === 0 ? (
                          <p className="text-sm text-gray-400">Bu kurs henuz pakete baglanmadi.</p>
                        ) : (
                          course.packageCourses.map((packageCourse) => (
                            <div key={packageCourse.packageId} className="flex items-center justify-between rounded-xl bg-white px-3 py-3">
                              <div>
                                <div className="text-sm font-medium text-[#091413]">{packageCourse.package.name}</div>
                                <div className="text-xs text-gray-500">
                                  {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(packageCourse.createdAt))}
                                </div>
                              </div>
                              <div className="rounded-full bg-[#0D5C3D]/8 px-2.5 py-1 text-xs font-medium text-[#0D5C3D]">
                                Bagli
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-stone-50 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">Ogrenci Etkisi</h3>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-xs text-gray-500">Ilerleme Kaydi</div>
                          <div className="mt-1 text-2xl font-semibold text-[#091413]">{course.studentProgress.length}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-xs text-gray-500">Ort. Tamamlama</div>
                          <div className="mt-1 text-2xl font-semibold text-[#091413]">%{averageCompletion}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
