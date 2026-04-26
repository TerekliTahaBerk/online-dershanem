import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getMobileUser, unauthorized } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Section = {
  title: string;
  kind: "stats" | "list" | "details";
  items: Record<string, unknown>[];
};

function json(data: unknown) {
  return Response.json(
    JSON.parse(
      JSON.stringify(data, (_key, value) => {
        if (typeof value === "bigint") return value.toString();
        if (value instanceof Prisma.Decimal) return Number(value);
        return value;
      })
    )
  );
}

function page(title: string, sections: Section[]) {
  return json({ title, sections });
}

function requireRole(user: { role: string }, roles: string[]) {
  return roles.includes(user.role);
}

async function studentId(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { student: { select: { id: true } } } });
  return user?.student?.id ?? null;
}

async function teacherId(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teacher: { select: { id: true } } } });
  return user?.teacher?.id ?? null;
}

async function studentPage(userId: string, section: string) {
  const sid = await studentId(userId);
  if (!sid) return page("Öğrenci Paneli", [{ title: "Durum", kind: "details", items: [{ message: "Profiliniz hazırlanıyor." }] }]);

  if (section === "lessons" || section === "calendar") {
    const lessons = await prisma.lesson.findMany({
      where: { studentId: sid },
      include: { teacher: true, package: true },
      orderBy: { scheduledAt: "asc" },
    });
    return page(section === "calendar" ? "Takvim" : "Derslerim", [
      {
        title: "Dersler",
        kind: "list",
        items: lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.teacher.fullName,
          subtitle: lesson.package?.name ?? "Paket yok",
          status: lesson.status,
          date: lesson.scheduledAt,
          detail: `${lesson.duration} dk`,
          url: lesson.googleMeetLink,
        })),
      },
    ]);
  }

  if (section === "teachers") {
    const lessons = await prisma.lesson.findMany({
      where: { studentId: sid },
      include: { teacher: true },
      orderBy: { scheduledAt: "desc" },
    });
    const teachers = [...new Map(lessons.map((lesson) => [lesson.teacher.id, lesson.teacher])).values()];
    return page("Öğretmenlerim", [
      {
        title: "Öğretmenler",
        kind: "list",
        items: teachers.map((teacher) => ({
          id: teacher.id,
          title: teacher.fullName,
          subtitle: teacher.subjects,
          detail: teacher.email ?? teacher.phone ?? "",
        })),
      },
    ]);
  }

  if (section === "camps") {
    const camps = await prisma.camp.findMany({ where: { isActive: true }, orderBy: { startDate: "asc" } });
    return page("Kamplar", [
      {
        title: "Aktif Kamplar",
        kind: "list",
        items: camps.map((camp) => ({
          id: camp.id,
          title: camp.name,
          subtitle: camp.category,
          detail: `${camp.quota} kontenjan`,
          price: camp.price,
          url: camp.paytrLink,
        })),
      },
    ]);
  }

  if (section === "payments") {
    const rows = await prisma.purchaseIntent.findMany({
      where: { studentId: sid },
      orderBy: { submittedAt: "desc" },
      take: 50,
    });
    return page("Ödemelerim", [
      {
        title: "Ödemeler",
        kind: "list",
        items: rows.map((row) => ({
          id: row.id,
          title: row.packageName,
          subtitle: row.status,
          status: row.intakeStatus,
          date: row.submittedAt,
          url: row.paymentLink,
        })),
      },
    ]);
  }

  if (section === "packages") {
    const [enrollments, packages] = await Promise.all([
      prisma.studentPackageEnrollment.findMany({ where: { studentId: sid }, include: { package: true }, orderBy: { startsAt: "desc" } }),
      prisma.package.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    ]);
    return page("Paketler", [
      {
        title: "Kayıtlı Paketler",
        kind: "list",
        items: enrollments.map((enrollment) => ({
          id: enrollment.id,
          title: enrollment.package.name,
          subtitle: enrollment.status,
          detail: enrollment.billingPeriodLabel ?? "",
        })),
      },
      {
        title: "Aktif Paketler",
        kind: "list",
        items: packages.map((pkg) => ({ id: pkg.id, title: pkg.name, subtitle: pkg.subjects, detail: `${pkg.lessonCount} ders`, price: pkg.price, url: pkg.paytrLink })),
      },
    ]);
  }

  if (section === "profile") {
    const student = await prisma.student.findUnique({ where: { id: sid } });
    return page("Profilim", [{ title: "Profil Bilgileri", kind: "details", items: student ? [student] : [] }]);
  }

  const student = await prisma.student.findUnique({
    where: { id: sid },
    include: {
      lessons: { include: { teacher: true, package: true }, orderBy: { scheduledAt: "asc" } },
      goals: { where: { status: "ACTIVE" }, orderBy: { dueAt: "asc" }, take: 5 },
      examResults: { include: { subjectStats: true }, orderBy: { takenAt: "desc" }, take: 10 },
      metricSnapshots: { orderBy: { endsAt: "desc" }, take: 12 },
      courseProgress: { include: { course: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  const now = new Date();
  const lessons = student?.lessons ?? [];
  const completed = lessons.filter((lesson) => lesson.status === "COMPLETED");
  const upcoming = lessons.filter((lesson) => lesson.status === "SCHEDULED" && lesson.scheduledAt >= now);
  return page("Öğrenci Paneli", [
    {
      title: "Özet",
      kind: "stats",
      items: [
        { label: "Tamamlanan Ders", value: completed.length },
        { label: "Yaklaşan Ders", value: upcoming.length },
        { label: "Aktif Hedef", value: student?.goals.length ?? 0 },
        { label: "Sonuç", value: student?.examResults.length ?? 0 },
      ],
    },
    {
      title: "Yaklaşan Dersler",
      kind: "list",
      items: upcoming.slice(0, 8).map((lesson) => ({ id: lesson.id, title: lesson.teacher.fullName, subtitle: lesson.package?.name ?? "", date: lesson.scheduledAt, url: lesson.googleMeetLink })),
    },
    {
      title: "Deneme Sonuçları",
      kind: "list",
      items: (student?.examResults ?? []).map((result) => ({ id: result.id, title: result.title, subtitle: result.examType ?? result.assessmentType, date: result.takenAt, score: result.score, net: result.net })),
    },
    {
      title: "Kurs İlerlemesi",
      kind: "list",
      items: (student?.courseProgress ?? []).map((progress) => ({ id: progress.id, title: progress.course.title, subtitle: progress.course.subject, value: progress.completionPercent })),
    },
  ]);
}

async function teacherPage(userId: string, section: string) {
  const tid = await teacherId(userId);
  if (!tid) return page("Öğretmen Paneli", [{ title: "Durum", kind: "details", items: [{ message: "Profiliniz hazırlanıyor." }] }]);
  const teacher = await prisma.teacher.findUnique({
    where: { id: tid },
    include: { lessons: { include: { student: true, package: true }, orderBy: { scheduledAt: "asc" } } },
  });
  const lessons = teacher?.lessons ?? [];
  if (section === "profile") return page("Profilim", [{ title: "Profil Bilgileri", kind: "details", items: teacher ? [teacher] : [] }]);
  if (section === "students") {
    const students = [...new Map(lessons.map((lesson) => [lesson.student.id, lesson.student])).values()];
    return page("Öğrencilerim", [{ title: "Öğrenciler", kind: "list", items: students.map((student) => ({ id: student.id, title: student.fullName, subtitle: student.examType ?? "", detail: student.phone })) }]);
  }
  if (section === "lessons" || section === "calendar") {
    return page(section === "calendar" ? "Takvim" : "Derslerim", [{ title: "Dersler", kind: "list", items: lessons.map((lesson) => ({ id: lesson.id, title: lesson.student.fullName, subtitle: lesson.package?.name ?? "", status: lesson.status, date: lesson.scheduledAt, url: lesson.googleMeetLink })) }]);
  }
  const now = new Date();
  const upcoming = lessons.filter((lesson) => lesson.status === "SCHEDULED" && lesson.scheduledAt >= now);
  const completed = lessons.filter((lesson) => lesson.status === "COMPLETED");
  return page("Öğretmen Paneli", [
    { title: "Özet", kind: "stats", items: [{ label: "Aktif Öğrenci", value: new Set(lessons.map((lesson) => lesson.studentId)).size }, { label: "Tamamlanan", value: completed.length }, { label: "Yaklaşan", value: upcoming.length }] },
    { title: "Yaklaşan Dersler", kind: "list", items: upcoming.slice(0, 10).map((lesson) => ({ id: lesson.id, title: lesson.student.fullName, subtitle: lesson.package?.name ?? "", date: lesson.scheduledAt, url: lesson.googleMeetLink })) },
  ]);
}

async function adminPage(section: string) {
  if (section === "students") {
    const rows = await prisma.student.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
    return page("Öğrenciler", [{ title: "Öğrenciler", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.fullName, subtitle: row.status, detail: row.phone, email: row.email })) }]);
  }
  if (section === "teachers") {
    const rows = await prisma.teacher.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
    return page("Hocalar", [{ title: "Hocalar", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.fullName, subtitle: row.subjects, status: row.status, email: row.email })) }]);
  }
  if (section === "lessons") {
    const rows = await prisma.lesson.findMany({ include: { student: true, teacher: true, package: true }, orderBy: { scheduledAt: "desc" }, take: 100 });
    return page("Dersler", [{ title: "Dersler", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.student.fullName, subtitle: row.teacher.fullName, status: row.status, date: row.scheduledAt, detail: row.package?.name ?? "" })) }]);
  }
  if (section === "payments") {
    const rows = await prisma.purchaseIntent.findMany({ orderBy: { submittedAt: "desc" }, take: 100 });
    return page("Ödemeler", [{ title: "Ödemeler", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.studentFullName, subtitle: row.packageName, status: row.status, date: row.submittedAt, url: row.paymentLink })) }]);
  }
  if (section === "leads") {
    const rows = await prisma.leadSubmission.findMany({ orderBy: { submittedAt: "desc" }, take: 100 });
    return page("Lead Inbox", [{ title: "Başvurular", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.fullName, subtitle: row.examType, status: row.intakeStatus, detail: row.phone, date: row.submittedAt })) }]);
  }
  if (section === "packages") {
    const rows = await prisma.package.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
    return page("Paketler", [{ title: "Paketler", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.name, subtitle: row.subjects, detail: `${row.lessonCount} ders`, price: row.price, status: row.isActive ? "ACTIVE" : "INACTIVE" })) }]);
  }
  if (section === "camps") {
    const rows = await prisma.camp.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
    return page("Kamplar", [{ title: "Kamplar", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.name, subtitle: row.category, detail: row.quota, price: row.price, status: row.isActive ? "ACTIVE" : "INACTIVE" })) }]);
  }
  if (section === "content") {
    const rows = await prisma.course.findMany({ include: { modules: { include: { contents: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
    return page("İçerikler", [{ title: "Kurslar", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.title, subtitle: row.subject, status: row.status, detail: `${row.modules.length} modül` })) }]);
  }
  if (section === "stats") {
    const [students, activeStudents, teachers, lessons, paid, leads] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.teacher.count(),
      prisma.lesson.count(),
      prisma.purchaseIntent.count({ where: { status: "PAID" } }),
      prisma.leadSubmission.count(),
    ]);
    return page("İstatistikler", [{ title: "Genel", kind: "stats", items: [{ label: "Öğrenci", value: students }, { label: "Aktif Öğrenci", value: activeStudents }, { label: "Hoca", value: teachers }, { label: "Ders", value: lessons }, { label: "Ödenen", value: paid }, { label: "Form", value: leads }] }]);
  }
  const [students, activeStudents, thisWeekLessons, pendingPayments, newLeads, odkExams] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.lesson.count({ where: { status: "SCHEDULED" } }),
    prisma.purchaseIntent.count({ where: { status: "PENDING" } }),
    prisma.leadSubmission.count({ where: { intakeStatus: "NEW" } }),
    prisma.odkExam.count({ where: { status: "PUBLISHED" } }),
  ]);
  return page("Admin Dashboard", [{ title: "Özet", kind: "stats", items: [{ label: "Toplam Öğrenci", value: students }, { label: "Aktif Öğrenci", value: activeStudents }, { label: "Planlı Ders", value: thisWeekLessons }, { label: "Bekleyen Ödeme", value: pendingPayments }, { label: "Yeni Lead", value: newLeads }, { label: "Yayındaki ODK Sınav", value: odkExams }] }]);
}

async function odkPage(userId: string, section: string, isAdmin: boolean) {
  if (isAdmin) {
    if (section === "odk-exams") {
      const rows = await prisma.odkExam.findMany({ include: { sections: true, files: true }, orderBy: { updatedAt: "desc" }, take: 100 });
      return page("ODK Sınavlar", [{ title: "Sınavlar", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.title, subtitle: row.cadenceFamily, status: row.status, date: row.startsAt, detail: `${row.sections.length} bölüm` })) }]);
    }
    if (section === "odk-packages") {
      const rows = await prisma.odkPackage.findMany({ include: { packageExams: true, packageAccessTags: true }, orderBy: { updatedAt: "desc" }, take: 100 });
      return page("ODK Paketler", [{ title: "Paketler", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.title, subtitle: row.slug, status: row.isActive ? "ACTIVE" : "INACTIVE", price: row.priceCents / 100, detail: `${row.packageExams.length} sınav` })) }]);
    }
    if (section === "odk-students") {
      const rows = await prisma.user.findMany({ include: { odkUserAccessTags: { include: { accessTag: true } }, odkAttempts: true }, orderBy: { createdAt: "desc" }, take: 100 });
      return page("ODK Öğrenciler", [{ title: "Öğrenci Erişimi", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.name ?? row.email, subtitle: row.email, detail: `${row.odkUserAccessTags.length} erişim`, attempts: row.odkAttempts.length })) }]);
    }
    if (section === "odk-tags") {
      const rows = await prisma.odkAccessTag.findMany({ orderBy: { title: "asc" } });
      return page("Erişim Etiketleri", [{ title: "Etiketler", kind: "list", items: rows.map((row) => ({ id: row.id, title: row.title, subtitle: row.key, status: row.isActive ? "ACTIVE" : "INACTIVE" })) }]);
    }
    const [totalExams, publishedExams, totalPackages, activeStudents, attemptsLast30d] = await Promise.all([
      prisma.odkExam.count(),
      prisma.odkExam.count({ where: { status: "PUBLISHED" } }),
      prisma.odkPackage.count(),
      prisma.odkUserAccessTag.count({ where: { revokedAt: null } }),
      prisma.odkExamAttempt.count({ where: { startedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);
    return page("ODK Dashboard", [{ title: "Özet", kind: "stats", items: [{ label: "Toplam Sınav", value: totalExams }, { label: "Yayında", value: publishedExams }, { label: "Paket", value: totalPackages }, { label: "Aktif Öğrenci", value: activeStudents }, { label: "Son 30 Gün", value: attemptsLast30d }] }]);
  }

  const attempts = await prisma.odkExamAttempt.findMany({ where: { userId }, include: { exam: true }, orderBy: { startedAt: "desc" }, take: 100 });
  if (section === "odk-results") {
    return page("Sonuçlarım & Analiz", [{ title: "Tüm Girişimler", kind: "list", items: attempts.map((row) => ({ id: row.id, title: row.exam.title, subtitle: row.exam.cadenceFamily, status: row.status, score: row.score, date: row.startedAt, detail: `D:${row.correctCount} Y:${row.wrongCount} B:${row.blankCount}` })) }]);
  }
  if (section === "odk-package") {
    const tags = await prisma.odkUserAccessTag.findMany({ where: { userId }, include: { accessTag: true }, orderBy: { createdAt: "desc" } });
    return page("Paketim", [{ title: "Erişimler", kind: "list", items: tags.map((tag) => ({ id: tag.id, title: tag.accessTag.title, subtitle: tag.accessTag.key, status: tag.revokedAt ? "REVOKED" : "ACTIVE", date: tag.expiresAt })) }]);
  }
  if (section === "odk-profile") {
    const tags = await prisma.odkUserAccessTag.findMany({ where: { userId }, include: { accessTag: true } });
    return page("Profil", [{ title: "Erişim Paketleri", kind: "list", items: tags.map((tag) => ({ id: tag.id, title: tag.accessTag.title, subtitle: tag.accessTag.key, date: tag.expiresAt })) }]);
  }
  const exams = await prisma.odkExam.findMany({ where: { status: "PUBLISHED" }, include: { sections: true }, orderBy: { startsAt: "asc" }, take: 100 });
  return page(section === "odk-exams" ? "Sınavlarım" : "ODK Panel", [
    { title: "Özet", kind: "stats", items: [{ label: "Mevcut Sınav", value: exams.length }, { label: "Girişim", value: attempts.length }, { label: "Tamamlanan", value: attempts.filter((attempt) => attempt.status === "SUBMITTED").length }] },
    { title: "Sınavlar", kind: "list", items: exams.map((row) => ({ id: row.id, title: row.title, subtitle: row.cadenceFamily, status: row.status, date: row.startsAt, detail: `${row.sections.length} bölüm` })) },
    { title: "Sonuçlar", kind: "list", items: attempts.slice(0, 10).map((row) => ({ id: row.id, title: row.exam.title, subtitle: row.status, score: row.score, date: row.startedAt })) },
  ]);
}

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const section = request.nextUrl.searchParams.get("section") ?? "dashboard";

  if (section.startsWith("odk-")) {
    if (user.role !== "ADMIN" && user.role !== "STUDENT") return unauthorized();
    return odkPage(user.id, section, user.role === "ADMIN");
  }

  if (user.role === "ADMIN") return adminPage(section);
  if (user.role === "TEACHER" && requireRole(user, ["TEACHER"])) return teacherPage(user.id, section);
  return studentPage(user.id, section);
}

