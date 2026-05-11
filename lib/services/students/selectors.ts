import type { Prisma } from "@prisma/client";

/** Reusable Prisma `select` objects — N+1 önler, aynı projeksiyonu tek yerde tut. */

export const studentListSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  classLevel: true,
  examType: true,
  city: true,
  status: true,
  activePackage: true,
  updatedAt: true,
  tags: {
    select: {
      tag: { select: { id: true, key: true, label: true, color: true } }
    }
  },
  _count: {
    select: { lessons: true }
  }
} satisfies Prisma.StudentSelect;

export const studentDetailSelect = {
  ...studentListSelect,
  district: true,
  schoolName: true,
  department: true,
  currentLevel: true,
  currentNet: true,
  targetGoal: true,
  targetSchool: true,
  targetRanking: true,
  strongLessons: true,
  weakLessons: true,
  needType: true,
  studyStatus: true,
  weeklyStudyHours: true,
  parentFullName: true,
  parentPhone: true,
  parentEmail: true,
  source: true,
  notes: true,
  taskLabel: true,
  nextActionAt: true,
  submittedAt: true,
  createdAt: true,
  user: { select: { id: true, email: true, name: true, role: true } }
} satisfies Prisma.StudentSelect;
