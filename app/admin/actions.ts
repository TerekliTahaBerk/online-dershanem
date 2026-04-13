"use server";

import { IntakeStatus, PurchaseStatus, StudentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/admin";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function withFlash(returnTo: string, updated: string) {
  const [pathname, queryString = ""] = returnTo.split("?");
  const params = new URLSearchParams(queryString);
  params.set("updated", updated);
  return `${pathname}?${params.toString()}`;
}

export async function updateStudentAction(formData: FormData) {
  const studentId = readString(formData, "studentId");
  const status = readString(formData, "status") as StudentStatus;
  const activePackage = readString(formData, "activePackage");
  const notes = readString(formData, "notes");
  const taskLabel = readString(formData, "taskLabel");
  const nextActionAt = readOptionalDate(formData, "nextActionAt");
  const returnTo = readString(formData, "returnTo") || "/admin/ogrenciler";

  if (!studentId || !Object.values(StudentStatus).includes(status)) {
    redirect(withFlash(returnTo, "student-error"));
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      status,
      activePackage: activePackage || null,
      notes: notes || null,
      taskLabel: taskLabel || null,
      nextActionAt
    }
  });

  revalidatePath("/admin/ogrenciler");
  revalidatePath("/admin");
  redirect(withFlash(returnTo, "student"));
}

export async function updateStudentInfoAction(formData: FormData) {
  const studentId = readString(formData, "studentId");
  const returnTo = readString(formData, "returnTo") || "/admin/ogrenciler";

  if (!studentId) redirect(withFlash(returnTo, "student-error"));

  const get = (key: string) => readString(formData, key) || null;

  const fullName = readString(formData, "fullName");
  if (!fullName) redirect(withFlash(returnTo, "student-error"));

  const phone = readString(formData, "phone");
  const phoneKey = phone ? normalizePhone(phone) : undefined;

  // If phone changed, check for duplicate
  if (phoneKey) {
    const existing = await prisma.student.findUnique({ where: { phoneKey } });
    if (existing && existing.id !== studentId) {
      redirect(withFlash(returnTo, "phone-taken"));
    }
  }

  await prisma.student.update({
    where: { id: studentId },
    data: {
      fullName,
      ...(phone && { phone, phoneKey }),
      email:         get("email"),
      city:          get("city"),
      district:      get("district"),
      schoolName:    get("schoolName"),
      classLevel:    get("classLevel"),
      examType:      get("examType"),
      department:    get("department"),
      targetGoal:    get("targetGoal"),
      targetSchool:  get("targetSchool"),
      targetRanking: get("targetRanking"),
      currentNet:    get("currentNet"),
      strongLessons: get("strongLessons"),
      weakLessons:   get("weakLessons"),
      parentFullName: get("parentFullName"),
      parentPhone:    get("parentPhone"),
      parentEmail:    get("parentEmail"),
    },
  });

  revalidatePath(`/admin/ogrenciler/${studentId}`);
  revalidatePath("/admin/ogrenciler");
  redirect(withFlash(returnTo, "student"));
}

export async function updateLeadAction(formData: FormData) {
  const leadId = readString(formData, "leadId");
  const intakeStatus = readString(formData, "intakeStatus") as IntakeStatus;
  const adminNotes = readString(formData, "adminNotes");
  const taskLabel = readString(formData, "taskLabel");
  const nextActionAt = readOptionalDate(formData, "nextActionAt");
  const returnTo = readString(formData, "returnTo") || "/admin/formlar";

  if (!leadId || !Object.values(IntakeStatus).includes(intakeStatus)) {
    redirect(withFlash(returnTo, "lead-error"));
  }

  await prisma.leadSubmission.update({
    where: { id: leadId },
    data: {
      intakeStatus,
      adminNotes: adminNotes || null,
      taskLabel: taskLabel || null,
      nextActionAt
    }
  });

  revalidatePath("/admin/formlar");
  revalidatePath("/admin");
  redirect(withFlash(returnTo, "lead"));
}

export async function updatePurchaseAction(formData: FormData) {
  const purchaseId = readString(formData, "purchaseId");
  const intakeStatus = readString(formData, "intakeStatus") as IntakeStatus;
  const status = readString(formData, "status") as PurchaseStatus;
  const packageName = readString(formData, "packageName");
  const adminNotes = readString(formData, "adminNotes");
  const taskLabel = readString(formData, "taskLabel");
  const nextActionAt = readOptionalDate(formData, "nextActionAt");
  const linkedStudentId = readString(formData, "linkedStudentId");
  const returnTo = readString(formData, "returnTo") || "/admin/odemeler";

  if (
    !purchaseId ||
    !Object.values(IntakeStatus).includes(intakeStatus) ||
    !Object.values(PurchaseStatus).includes(status)
  ) {
    redirect(withFlash(returnTo, "purchase-error"));
  }

  await prisma.purchaseIntent.update({
    where: { id: purchaseId },
    data: {
      intakeStatus,
      status,
      packageName,
      adminNotes: adminNotes || null,
      taskLabel: taskLabel || null,
      nextActionAt
    }
  });

  if (linkedStudentId) {
    await prisma.student.update({
      where: { id: linkedStudentId },
      data: {
        activePackage: packageName || null
      }
    });
  }

  revalidatePath("/admin/odemeler");
  revalidatePath("/admin");
  redirect(withFlash(returnTo, "purchase"));
}
