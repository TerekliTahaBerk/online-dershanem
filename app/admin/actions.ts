"use server";

import { IntakeStatus, PurchaseStatus, StudentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
  const returnTo = readString(formData, "returnTo") || "/admin?section=students";

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

  revalidatePath("/admin");
  redirect(withFlash(returnTo, "student"));
}

export async function updateLeadAction(formData: FormData) {
  const leadId = readString(formData, "leadId");
  const intakeStatus = readString(formData, "intakeStatus") as IntakeStatus;
  const adminNotes = readString(formData, "adminNotes");
  const taskLabel = readString(formData, "taskLabel");
  const nextActionAt = readOptionalDate(formData, "nextActionAt");
  const returnTo = readString(formData, "returnTo") || "/admin?section=forms";

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
  const returnTo = readString(formData, "returnTo") || "/admin?section=forms";

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

  revalidatePath("/admin");
  redirect(withFlash(returnTo, "purchase"));
}
