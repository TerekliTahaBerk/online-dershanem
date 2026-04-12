/**
 * Creates test student + teacher accounts using raw SQL.
 * Safe to run multiple times (upsert logic via ON CONFLICT DO NOTHING).
 * Does NOT depend on env vars or Prisma enum generation.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Student account ─────────────────────────────────────────────────────
  const studentEmail = "ogrenci@onlinedershanem.com";
  const studentPassword = "ogrenci123";

  const [existingStudent] = await prisma.$queryRawUnsafe(
    `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
    studentEmail
  );

  if (!existingStudent) {
    const hash = await bcrypt.hash(studentPassword, 12);
    const userId = `usr_${Date.now()}_student`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'STUDENT', NOW(), NOW())
       ON CONFLICT (email) DO NOTHING`,
      userId, studentEmail, "Test Öğrenci", hash
    );

    // Link to first unlinked student record if exists
    const [unlinkedStudent] = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Student" WHERE "userId" IS NULL LIMIT 1`
    );
    if (unlinkedStudent) {
      const [createdUser] = await prisma.$queryRawUnsafe(
        `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
        studentEmail
      );
      if (createdUser) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Student" SET "userId" = $1, "updatedAt" = NOW() WHERE id = $2`,
          createdUser.id, unlinkedStudent.id
        );
      }
    }

    console.log(`✓ Test öğrenci hesabı: ${studentEmail} / ${studentPassword}`);
  } else {
    console.log(`· Öğrenci hesabı zaten mevcut: ${studentEmail}`);
  }

  // ── Teacher account ──────────────────────────────────────────────────────
  const teacherEmail = "ogretmen@onlinedershanem.com";
  const teacherPassword = "ogretmen123";
  const teacherName = "Test Öğretmen";

  const [existingTeacher] = await prisma.$queryRawUnsafe(
    `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
    teacherEmail
  );

  if (!existingTeacher) {
    const hash = await bcrypt.hash(teacherPassword, 12);
    const userId = `usr_${Date.now()}_teacher`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'TEACHER', NOW(), NOW())
       ON CONFLICT (email) DO NOTHING`,
      userId, teacherEmail, teacherName, hash
    );

    // Find or create a Teacher record to link
    let [teacherRecord] = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Teacher" WHERE "userId" IS NULL AND status = 'ACTIVE' LIMIT 1`
    );

    if (!teacherRecord) {
      const teacherId = `tch_${Date.now()}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Teacher" (id, "fullName", email, subjects, bio, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())
         ON CONFLICT (email) DO NOTHING`,
        teacherId, teacherName, teacherEmail, "Matematik", "Test öğretmen hesabı."
      );
      [teacherRecord] = await prisma.$queryRawUnsafe(
        `SELECT id FROM "Teacher" WHERE email = $1 LIMIT 1`,
        teacherEmail
      );
    }

    if (teacherRecord) {
      const [createdUser] = await prisma.$queryRawUnsafe(
        `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
        teacherEmail
      );
      if (createdUser) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Teacher" SET "userId" = $1, "updatedAt" = NOW() WHERE id = $2`,
          createdUser.id, teacherRecord.id
        );
      }
    }

    console.log(`✓ Test öğretmen hesabı: ${teacherEmail} / ${teacherPassword}`);
  } else {
    console.log(`· Öğretmen hesabı zaten mevcut: ${teacherEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
