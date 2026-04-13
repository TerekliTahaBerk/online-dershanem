import { prisma } from "@/lib/prisma";

type LinkStatus = "linked" | "already-linked" | "not-found" | "conflict";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

export async function linkTeacherToExistingUserByEmail(teacherId: string, email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { status: "not-found" as LinkStatus };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      student: { select: { id: true } },
      teacher: { select: { id: true } }
    }
  });

  if (!existingUser) {
    return { status: "not-found" as LinkStatus };
  }

  if (existingUser.student) {
    return { status: "conflict" as LinkStatus, user: existingUser };
  }

  if (existingUser.teacher) {
    return {
      status: existingUser.teacher.id === teacherId ? "already-linked" : "conflict",
      user: existingUser
    };
  }

  if (existingUser.role === "STUDENT") {
    return { status: "conflict" as LinkStatus, user: existingUser };
  }

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { userId: existingUser.id }
  });

  return { status: "linked" as LinkStatus, user: existingUser };
}

export async function linkStudentToExistingUserByEmail(studentId: string, email?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { status: "not-found" as LinkStatus };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      student: { select: { id: true } },
      teacher: { select: { id: true } }
    }
  });

  if (!existingUser) {
    return { status: "not-found" as LinkStatus };
  }

  if (existingUser.teacher) {
    return { status: "conflict" as LinkStatus, user: existingUser };
  }

  if (existingUser.student) {
    return {
      status: existingUser.student.id === studentId ? "already-linked" : "conflict",
      user: existingUser
    };
  }

  if (existingUser.role !== "STUDENT") {
    return { status: "conflict" as LinkStatus, user: existingUser };
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { userId: existingUser.id }
  });

  return { status: "linked" as LinkStatus, user: existingUser };
}
