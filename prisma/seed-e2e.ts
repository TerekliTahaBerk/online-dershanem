import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const ids = {
  admin: "e2e-user-admin",
  teacher: "e2e-user-teacher",
  otherTeacher: "e2e-user-teacher-foreign",
  student: "e2e-user-student",
  foreignStudent: "e2e-user-student-foreign",
  student3: "e2e-user-student-3",
  student4: "e2e-user-student-4",
  parent: "e2e-user-parent",
  studentProfile: "e2e-student-profile",
  foreignStudentProfile: "e2e-student-profile-foreign",
  studentProfile3: "e2e-student-profile-3",
  studentProfile4: "e2e-student-profile-4",
  teacherProfile: "e2e-teacher-profile",
  otherTeacherProfile: "e2e-teacher-profile-foreign",
  group: "e2e-group",
  foreignGroup: "e2e-group-foreign",
  lesson: "e2e-lesson",
  previousLesson: "e2e-lesson-previous",
  foreignLesson: "e2e-lesson-foreign",
  assignment: "e2e-assignment",
};

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.CI !== "true") {
    throw new Error("E2E seed production ortamında çalıştırılamaz.");
  }

  const password = process.env.E2E_PASSWORD || "testpass123";
  const passwordHash = await hashPassword(password);
  const users = [
    { id: ids.admin, email: "admin.e2e@example.com", fullName: "E2E Yönetici", role: "ADMIN" as const },
    { id: ids.teacher, email: "teacher.e2e@example.com", fullName: "E2E Öğretmen", role: "TEACHER" as const },
    { id: ids.otherTeacher, email: "other.teacher.e2e@example.com", fullName: "Başka Öğretmen", role: "TEACHER" as const },
    { id: ids.student, email: "student.e2e@example.com", fullName: "Ada Öğrenci", role: "STUDENT" as const },
    { id: ids.foreignStudent, email: "foreign.student.e2e@example.com", fullName: "Bora Yabancı", role: "STUDENT" as const },
    { id: ids.student3, email: "student3.e2e@example.com", fullName: "Cem Öğrenci", role: "STUDENT" as const },
    { id: ids.student4, email: "student4.e2e@example.com", fullName: "Duru Öğrenci", role: "STUDENT" as const },
    { id: ids.parent, email: "parent.e2e@example.com", fullName: "E2E Veli", role: "PARENT" as const },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash, mustChangePassword: false, status: "ACTIVE" },
      update: { passwordHash, fullName: user.fullName, role: user.role, status: "ACTIVE", mustChangePassword: false, failedAttempts: 0, lockedUntil: null },
    });
  }

  await prisma.teacherProfile.upsert({ where: { userId: ids.teacher }, create: { id: ids.teacherProfile, userId: ids.teacher, subjects: ["Matematik"] }, update: { subjects: ["Matematik"] } });
  await prisma.teacherProfile.upsert({ where: { userId: ids.otherTeacher }, create: { id: ids.otherTeacherProfile, userId: ids.otherTeacher, subjects: ["Fen"] }, update: { subjects: ["Fen"] } });

  const profiles = [
    { id: ids.studentProfile, userId: ids.student },
    { id: ids.foreignStudentProfile, userId: ids.foreignStudent },
    { id: ids.studentProfile3, userId: ids.student3 },
    { id: ids.studentProfile4, userId: ids.student4 },
  ];
  for (const profile of profiles) {
    await prisma.studentProfile.upsert({ where: { userId: profile.userId }, create: { ...profile, classLevel: "8. Sınıf", targetGoal: "LGS" }, update: { classLevel: "8. Sınıf", targetGoal: "LGS" } });
  }

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: ids.parent, studentId: ids.studentProfile } },
    create: { parentId: ids.parent, studentId: ids.studentProfile, relationship: "Veli" },
    update: { relationship: "Veli" },
  });

  await prisma.group.upsert({ where: { id: ids.group }, create: { id: ids.group, name: "E2E LGS Grubu", subject: "Matematik", level: "8. Sınıf", teacherId: ids.teacher }, update: { teacherId: ids.teacher, isActive: true } });
  await prisma.group.upsert({ where: { id: ids.foreignGroup }, create: { id: ids.foreignGroup, name: "Yabancı Grup", subject: "Fen", level: "8. Sınıf", teacherId: ids.otherTeacher }, update: { teacherId: ids.otherTeacher, isActive: true } });

  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) {
    await prisma.enrollment.upsert({ where: { groupId_studentId: { groupId: ids.group, studentId } }, create: { groupId: ids.group, studentId }, update: { endedAt: null } });
  }
  await prisma.enrollment.upsert({ where: { groupId_studentId: { groupId: ids.foreignGroup, studentId: ids.foreignStudentProfile } }, create: { groupId: ids.foreignGroup, studentId: ids.foreignStudentProfile }, update: { endedAt: null } });

  const startsAt = new Date(Date.now() + 60 * 60 * 1000);
  const previousStartsAt = new Date(Date.now() - 7 * 86400000);
  await prisma.lesson.upsert({ where: { id: ids.lesson }, create: { id: ids.lesson, groupId: ids.group, teacherId: ids.teacher, title: "E2E Hızlı Ders Özeti", startsAt, endsAt: new Date(startsAt.getTime() + 3600000), meetingUrl: "https://example.com/e2e-class" }, update: { startsAt, endsAt: new Date(startsAt.getTime() + 3600000), meetingUrl: "https://example.com/e2e-class", status: "PLANNED" } });
  await prisma.lesson.upsert({ where: { id: ids.previousLesson }, create: { id: ids.previousLesson, groupId: ids.group, teacherId: ids.teacher, title: "Önceki Ders", startsAt: previousStartsAt, endsAt: new Date(previousStartsAt.getTime() + 3600000), status: "COMPLETED" }, update: { startsAt: previousStartsAt, status: "COMPLETED" } });
  await prisma.lesson.upsert({ where: { id: ids.foreignLesson }, create: { id: ids.foreignLesson, groupId: ids.foreignGroup, teacherId: ids.otherTeacher, title: "Yabancı Ders", startsAt, endsAt: new Date(startsAt.getTime() + 3600000) }, update: { teacherId: ids.otherTeacher, status: "PLANNED" } });

  await prisma.attendance.deleteMany({ where: { lessonId: ids.lesson } });
  await prisma.lessonNote.deleteMany({ where: { lessonId: ids.lesson } });

  const previousNote = await prisma.lessonNote.findFirst({ where: { lessonId: ids.previousLesson, studentId: null } });
  if (previousNote) await prisma.lessonNote.update({ where: { id: previousNote.id }, data: { topic: "Üslü ifadeler", nextGoal: "Köklü ifadelerde dört işlem" } });
  else await prisma.lessonNote.create({ data: { lessonId: ids.previousLesson, topic: "Üslü ifadeler", nextGoal: "Köklü ifadelerde dört işlem" } });

  await prisma.assignment.upsert({ where: { id: ids.assignment }, create: { id: ids.assignment, groupId: ids.group, lessonId: ids.lesson, createdById: ids.teacher, title: "E2E Yeni Nesil Sorular", description: "1–12. soruları çöz ve yanlışlarını işaretle.", dueAt: new Date(Date.now() + 2 * 86400000) }, update: { isActive: true, dueAt: new Date(Date.now() + 2 * 86400000) } });
  for (const studentId of [ids.studentProfile, ids.foreignStudentProfile, ids.studentProfile3, ids.studentProfile4]) {
    await prisma.assignmentProgress.upsert({ where: { assignmentId_studentId: { assignmentId: ids.assignment, studentId } }, create: { assignmentId: ids.assignment, studentId }, update: { status: "TODO", completedAt: null } });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
