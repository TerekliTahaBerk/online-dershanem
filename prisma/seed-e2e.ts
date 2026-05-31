/**
 * E2E için test kullanıcılarını + minimum ilişki grafiğini idempotent olarak oluşturur.
 *
 * Çalıştırma:
 *   E2E_PASSWORD="testpass123" tsx prisma/seed-e2e.ts
 *
 * Oluşturulan hesaplar:
 *   - e2e-admin@onlinedershanem.test   (ADMIN)
 *   - e2e-ogrenci@onlinedershanem.test (STUDENT + Student profili)
 *   - e2e-ogretmen@onlinedershanem.test (TEACHER + Teacher profili)
 *   - e2e-veli@onlinedershanem.test    (PARENT + Parent profili)
 *
 * Ek ilişkiler (Session 11 — E2E suite için):
 *   - Classroom "E2E Sınıf 1" (deterministik isim/branch)
 *   - ClassroomTeacher (e2e-ogretmen lead) + ClassroomStudent (e2e-ogrenci)
 *   - ParentStudent (e2e-veli ↔ e2e-ogrenci, primary)
 *   - Package "E2E Paket 1" (kuruş cinsinden 50_000_000)
 *   - StudentPackageEnrollment (ACTIVE)
 *   - PaymentScheduleItem (PENDING, 50_000_000 kuruş)
 *   - Assignment "E2E Ödev 1" (PUBLISHED, classroom-level)
 *
 * Tüm kayıtlar `e2e-` prefix'iyle ayırt edilir; cleanup için
 * `tests/e2e/helpers/db.ts > cleanupE2E()` kullanılabilir.
 *
 * UYARI: Sadece test/staging ortamında çalıştırın. Production DATABASE_URL
 * tespit edilirse abort eder.
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = process.env.E2E_PASSWORD || "testpass123";

// Deterministik kimlikler — testlerin DB'yi sorgulayıp ID lookup yapmasına gerek kalmasın diye
// isim/branch/slug üzerinden idempotent yapıyoruz; ID'ler otomatik üretilir, sabit isim arıyoruz.
const E2E = {
  classroomName: "E2E Sınıf 1",
  classroomBranch: "E2E",
  packageName: "E2E Paket 1",
  paymentTitle: "E2E Aylık Taksit",
  assignmentTitle: "E2E Ödev 1",
  // Phase 3 / Session 13 — D1: deterministik ODK access tag.
  odkAccessTagKey: "e2e-tag-1",
  odkAccessTagTitle: "E2E Erişim Etiketi",
} as const;

const ACCOUNTS = [
  {
    email: "e2e-admin@onlinedershanem.test",
    fullName: "E2E Admin",
    role: UserRole.ADMIN,
    profile: null,
  },
  {
    email: "e2e-ogrenci@onlinedershanem.test",
    fullName: "E2E Öğrenci",
    role: UserRole.STUDENT,
    profile: "student" as const,
  },
  {
    // Phase 3 / Session 13 — D1: ikinci öğrenci hesabı.
    // Bulk ODK access tag idempotency testi en az iki user-account'lu
    // öğrenciye etiket vermek istiyor.
    email: "e2e-ogrenci2@onlinedershanem.test",
    fullName: "E2E Öğrenci 2",
    role: UserRole.STUDENT,
    profile: "student" as const,
  },
  {
    email: "e2e-ogretmen@onlinedershanem.test",
    fullName: "E2E Öğretmen",
    role: UserRole.TEACHER,
    profile: "teacher" as const,
  },
  {
    email: "e2e-veli@onlinedershanem.test",
    fullName: "E2E Veli",
    role: UserRole.PARENT,
    profile: "parent" as const,
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (/prod|production/i.test(dbUrl)) {
    console.error("❌ Production DATABASE_URL tespit edildi. Abort.");
    process.exit(1);
  }
  console.log(`🌱 E2E seed başlıyor (password: ${PASSWORD.replace(/./g, "*")})`);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const acc of ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: { passwordHash, name: acc.fullName, role: acc.role },
      create: {
        email: acc.email,
        name: acc.fullName,
        passwordHash,
        role: acc.role,
      },
    });

    if (acc.profile === "student") {
      const phone = `+9050000000${acc.email.length.toString().padStart(2, "0")}`;
      await prisma.student.upsert({
        where: { userId: user.id },
        update: { fullName: acc.fullName },
        create: {
          userId: user.id,
          fullName: acc.fullName,
          email: acc.email,
          phone,
          phoneKey: phone.replace(/\D/g, ""),
        },
      });
    } else if (acc.profile === "teacher") {
      await prisma.teacher.upsert({
        where: { userId: user.id },
        update: { fullName: acc.fullName },
        create: {
          userId: user.id,
          fullName: acc.fullName,
          email: acc.email,
          subjects: "Genel",
        },
      });
    } else if (acc.profile === "parent") {
      await prisma.parent.upsert({
        where: { userId: user.id },
        update: { fullName: acc.fullName },
        create: { userId: user.id, fullName: acc.fullName, email: acc.email },
      });
    }

    console.log(`✓ ${acc.email}`);
  }

  // ── İlişki grafiği ──────────────────────────────────────────────
  const studentUser = await prisma.user.findUniqueOrThrow({
    where: { email: "e2e-ogrenci@onlinedershanem.test" },
    include: { student: true },
  });
  const teacherUser = await prisma.user.findUniqueOrThrow({
    where: { email: "e2e-ogretmen@onlinedershanem.test" },
    include: { teacher: true },
  });
  const parentUser = await prisma.user.findUniqueOrThrow({
    where: { email: "e2e-veli@onlinedershanem.test" },
    include: { parent: true },
  });

  if (!studentUser.student || !teacherUser.teacher || !parentUser.parent) {
    throw new Error("Profil kayıtları oluşturulamadı (student/teacher/parent).");
  }

  const studentId = studentUser.student.id;
  const teacherId = teacherUser.teacher.id;
  const parentId = parentUser.parent.id;

  // Classroom (idempotent: name+branch unique)
  const classroom = await prisma.classroom.upsert({
    where: { name_branch: { name: E2E.classroomName, branch: E2E.classroomBranch } },
    update: { isActive: true, capacity: 30 },
    create: {
      name: E2E.classroomName,
      branch: E2E.classroomBranch,
      capacity: 30,
      description: "E2E test sınıfı — silmeyin (cleanupE2E ile temizlenir).",
    },
  });
  console.log(`✓ Classroom ${classroom.name} (${classroom.id})`);

  // ClassroomTeacher (composite PK)
  await prisma.classroomTeacher.upsert({
    where: { classroomId_teacherId: { classroomId: classroom.id, teacherId } },
    update: { isLead: true },
    create: { classroomId: classroom.id, teacherId, isLead: true, subject: "Genel" },
  });
  console.log("✓ ClassroomTeacher");

  // ClassroomStudent (composite PK)
  await prisma.classroomStudent.upsert({
    where: { classroomId_studentId: { classroomId: classroom.id, studentId } },
    update: { leftAt: null },
    create: { classroomId: classroom.id, studentId },
  });
  console.log("✓ ClassroomStudent");

  // ParentStudent (composite PK)
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: { isPrimary: true, relationshipType: "OTHER" },
    create: { parentId, studentId, isPrimary: true, relationshipType: "OTHER", relationship: "E2E" },
  });
  console.log("✓ ParentStudent");

  // Package (idempotent by name — Package.name unique değil, o yüzden findFirst+create)
  let pkg = await prisma.package.findFirst({ where: { name: E2E.packageName } });
  if (!pkg) {
    pkg = await prisma.package.create({
      data: {
        name: E2E.packageName,
        type: "COURSE",
        description: "E2E test paketi",
        price: 50_000_000, // 500.000 TL kuruş cinsinden — test için sabit
        lessonCount: 4,
        subjects: "Genel",
        isActive: true,
      },
    });
  }
  console.log(`✓ Package ${pkg.name} (${pkg.id})`);

  // Enrollment — tek aktif kayıt yeterli
  const existingEnrollment = await prisma.studentPackageEnrollment.findFirst({
    where: { studentId, packageId: pkg.id, status: "ACTIVE" },
  });
  if (!existingEnrollment) {
    await prisma.studentPackageEnrollment.create({
      data: {
        studentId,
        packageId: pkg.id,
        source: "MANUAL",
        status: "ACTIVE",
        listPrice: pkg.price,
        notes: "E2E enrollment",
      },
    });
  }
  console.log("✓ StudentPackageEnrollment");

  // PaymentScheduleItem — exactly one PENDING row idempotent
  const existingPSI = await prisma.paymentScheduleItem.findFirst({
    where: { studentId, parentId, packageId: pkg.id, title: E2E.paymentTitle },
  });
  if (!existingPSI) {
    await prisma.paymentScheduleItem.create({
      data: {
        studentId,
        parentId,
        packageId: pkg.id,
        title: E2E.paymentTitle,
        amount: 50_000_000,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        note: "E2E payment",
      },
    });
  }
  console.log("✓ PaymentScheduleItem (PENDING)");

  // Assignment — classroom-level, PUBLISHED
  const existingAssignment = await prisma.assignment.findFirst({
    where: { teacherId, classroomId: classroom.id, title: E2E.assignmentTitle },
  });
  if (!existingAssignment) {
    await prisma.assignment.create({
      data: {
        teacherId,
        classroomId: classroom.id,
        title: E2E.assignmentTitle,
        description: "E2E ödev — silmeyin.",
        status: "PUBLISHED",
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log("✓ Assignment (PUBLISHED)");

  // Phase 3 / Session 13 — D1: ODK access tag (idempotent by `key` unique).
  const odkTag = await prisma.odkAccessTag.upsert({
    where: { key: E2E.odkAccessTagKey },
    update: { isActive: true, title: E2E.odkAccessTagTitle, service: "ODK" },
    create: {
      key: E2E.odkAccessTagKey,
      title: E2E.odkAccessTagTitle,
      service: "ODK",
      isActive: true,
      description: "E2E test access tag (Session 13).",
    },
  });
  console.log(`✓ OdkAccessTag ${odkTag.key} (${odkTag.id})`);

  // Bulk-grant testlerinin temiz başlaması için, e2e öğrenci hesaplarına
  // verilmiş aktif (revokedAt=null) grant'leri kaldırıyoruz. Test sırasında
  // grant verilip kaldırılınca audit log dolar — burada sadece
  // bulk-odk-idempotency.spec.ts'in deterministik başlamasını sağlıyoruz.
  const e2eStudentUsers = await prisma.user.findMany({
    where: { email: { in: ["e2e-ogrenci@onlinedershanem.test", "e2e-ogrenci2@onlinedershanem.test"] } },
    select: { id: true },
  });
  if (e2eStudentUsers.length > 0) {
    const removed = await prisma.odkUserAccessTag.deleteMany({
      where: {
        userId: { in: e2eStudentUsers.map((u) => u.id) },
        accessTagId: odkTag.id,
      },
    });
    if (removed.count > 0) {
      console.log(`✓ ODK grants pruned: ${removed.count} (clean slate for bulk-odk test)`);
    }
  }

  console.log("✅ E2E seed tamam.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
