"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/admin";

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
