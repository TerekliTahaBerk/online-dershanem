"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/admin";
import { sendStudentWelcome } from "@/lib/email";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createStudentAction(formData: FormData) {
  const fullName = readString(formData, "fullName");
  const phone = readString(formData, "phone");
  const email = readString(formData, "email") || null;
  const city = readString(formData, "city") || null;
  const district = readString(formData, "district") || null;
  const schoolName = readString(formData, "schoolName") || null;
  const classLevel = readString(formData, "classLevel") || null;
  const examType = readString(formData, "examType") || null;
  const targetGoal = readString(formData, "targetGoal") || null;
  const weakLessons = readString(formData, "weakLessons") || null;
  const activePackage = readString(formData, "activePackage") || null;
  const parentFullName = readString(formData, "parentFullName") || null;
  const parentPhone = readString(formData, "parentPhone") || null;
  const notes = readString(formData, "notes") || null;

  if (!fullName || !phone) {
    redirect("/admin/ogrenciler/yeni?error=missing");
  }

  const phoneKey = normalizePhone(phone);

  // Check if student already exists with this phone
  const existing = await prisma.student.findUnique({ where: { phoneKey } });
  if (existing) {
    redirect(`/admin/ogrenciler/${existing.id}?updated=already-exists`);
  }

  const student = await prisma.student.create({
    data: {
      fullName,
      phone,
      phoneKey,
      email,
      city,
      district,
      schoolName,
      classLevel,
      examType,
      targetGoal,
      weakLessons,
      activePackage,
      parentFullName,
      parentPhone,
      notes,
      status: "NEW",
      source: "admin"
    }
  });

  revalidatePath("/admin/ogrenciler");
  revalidatePath("/admin");
  redirect(`/admin/ogrenciler/${student.id}?updated=created`);
}

export async function createStudentAccountAction(formData: FormData) {
  const studentId = readString(formData, "studentId");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");

  if (!studentId || !email || !password || password.length < 6) {
    redirect(`/admin/ogrenciler/${studentId}?updated=account-error`);
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) redirect("/admin/ogrenciler");

  // Check if student already has an account
  if (student.userId) {
    redirect(`/admin/ogrenciler/${studentId}?updated=account-exists`);
  }

  // Check if email is already taken
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    redirect(`/admin/ogrenciler/${studentId}?updated=email-taken`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name: student.fullName,
      passwordHash,
      role: "STUDENT",
      student: { connect: { id: studentId } },
    },
  });

  await prisma.student.update({
    where: { id: studentId },
    data: { userId: user.id },
  });

  await sendStudentWelcome({ to: email, name: student.fullName, email, password });

  revalidatePath(`/admin/ogrenciler/${studentId}`);
  redirect(`/admin/ogrenciler/${studentId}?updated=account-created`);
}
