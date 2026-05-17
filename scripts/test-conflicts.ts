// Test runner for conflict logic. Run with: npx tsx scripts/test-conflicts.ts
// Eklenir, FAZ 3.5 test scripti; CI'de zorunlu değil.
import { findLessonConflicts, formatConflicts } from "../lib/scheduling/conflicts";
import { prisma } from "../lib/prisma";

async function main() {
  const today = new Date();
  today.setHours(15, 0, 0, 0);
  today.setDate(today.getDate() + 30);

  const teacher = await prisma.teacher.findFirst({ select: { id: true, fullName: true } });
  const student = await prisma.student.findFirst({ select: { id: true, fullName: true } });
  if (!teacher || !student) {
    console.log("NO_DATA (need at least 1 teacher and 1 student)");
    return;
  }
  console.log("Testing with teacher=", teacher.fullName, "student=", student.fullName);

  const seed = await prisma.lesson.create({
    data: {
      teacherId: teacher.id,
      studentId: student.id,
      scheduledAt: today,
      duration: 60,
      status: "SCHEDULED",
      title: "TEST-CONFLICT-SEED",
    },
    select: { id: true },
  });
  console.log("seed id:", seed.id);

  try {
    const c1 = await findLessonConflicts({
      teacherId: teacher.id,
      studentIds: [],
      occurrences: [{ scheduledAt: today, duration: 60 }],
    });
    console.log("[1] TEACHER same time → conflicts:", c1.length, "(expected ≥1)");

    const c2 = await findLessonConflicts({
      teacherId: "NON_EXIST",
      studentIds: [student.id],
      occurrences: [{ scheduledAt: today, duration: 60 }],
    });
    console.log("[2] STUDENT same time → conflicts:", c2.length, "(expected ≥1)");

    const overlapDate = new Date(today.getTime() + 30 * 60_000);
    const c3 = await findLessonConflicts({
      teacherId: teacher.id,
      studentIds: [],
      occurrences: [{ scheduledAt: overlapDate, duration: 60 }],
    });
    console.log("[3] Partial 30dk overlap → conflicts:", c3.length, "(expected ≥1)");

    const farDate = new Date(today.getTime() + 2 * 60 * 60_000);
    const c4 = await findLessonConflicts({
      teacherId: teacher.id,
      studentIds: [student.id],
      occurrences: [{ scheduledAt: farDate, duration: 60 }],
    });
    console.log("[4] 2h later → conflicts:", c4.length, "(expected 0)");

    const c5 = await findLessonConflicts({
      teacherId: teacher.id,
      studentIds: [student.id],
      occurrences: [{ scheduledAt: today, duration: 60 }],
      excludeLessonIds: [seed.id],
    });
    console.log("[5] Self-excluded → conflicts:", c5.length, "(expected 0)");

    // Soft cancel: status=CANCELLED → çakışma sayılmaz
    await prisma.lesson.update({ where: { id: seed.id }, data: { status: "CANCELLED" } });
    const c6 = await findLessonConflicts({
      teacherId: teacher.id,
      studentIds: [student.id],
      occurrences: [{ scheduledAt: today, duration: 60 }],
    });
    console.log("[6] After CANCELLED → conflicts:", c6.length, "(expected 0)");

    console.log("\nformatConflicts sample (c1):");
    console.log(formatConflicts(c1).slice(0, 300));
  } finally {
    await prisma.lesson.delete({ where: { id: seed.id } });
    console.log("\nCleanup OK");
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
