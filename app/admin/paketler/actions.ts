"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readString } from "@/lib/form-utils";

export async function createPackageAction(formData: FormData) {
  const name = readString(formData, "name");
  const type = readString(formData, "type") as "COURSE" | "EXAM";
  const description = readString(formData, "description") || null;
  const priceStr = readString(formData, "price");
  const lessonCountStr = readString(formData, "lessonCount");
  const subjects = readString(formData, "subjects");
  const paytrLink = readString(formData, "paytrLink") || null;
  const isActive = formData.get("isActive") === "on";

  if (!name || !priceStr || !lessonCountStr || !subjects) {
    redirect("/admin/paketler/yeni?error=missing");
  }

  const price = Math.round(parseFloat(priceStr) * 100);
  const lessonCount = parseInt(lessonCountStr, 10);

  if (isNaN(price) || isNaN(lessonCount)) {
    redirect("/admin/paketler/yeni?error=invalid");
  }

  await prisma.package.create({
    data: {
      name,
      type: type === "EXAM" ? "EXAM" : "COURSE",
      description,
      price,
      lessonCount,
      subjects,
      paytrLink,
      isActive,
    },
  });

  revalidatePath("/admin/paketler");
  redirect("/admin/paketler?updated=created");
}

export async function updatePackageAction(formData: FormData) {
  const packageId = readString(formData, "packageId");
  const name = readString(formData, "name");
  const type = readString(formData, "type") as "COURSE" | "EXAM";
  const description = readString(formData, "description") || null;
  const priceStr = readString(formData, "price");
  const lessonCountStr = readString(formData, "lessonCount");
  const subjects = readString(formData, "subjects");
  const paytrLink = readString(formData, "paytrLink") || null;
  const isActive = formData.get("isActive") === "on";

  if (!packageId || !name) {
    redirect("/admin/paketler?error=invalid");
  }

  const price = Math.round(parseFloat(priceStr) * 100);
  const lessonCount = parseInt(lessonCountStr, 10);

  await prisma.package.update({
    where: { id: packageId },
    data: {
      name,
      type: type === "EXAM" ? "EXAM" : "COURSE",
      description,
      price: isNaN(price) ? undefined : price,
      lessonCount: isNaN(lessonCount) ? undefined : lessonCount,
      subjects,
      paytrLink,
      isActive,
    },
  });

  revalidatePath("/admin/paketler");
  redirect("/admin/paketler?updated=package");
}

export async function togglePackageAction(formData: FormData) {
  const packageId = readString(formData, "packageId");
  const currentIsActive = formData.get("currentIsActive") === "true";

  if (!packageId) redirect("/admin/paketler");

  await prisma.package.update({
    where: { id: packageId },
    data: { isActive: !currentIsActive },
  });

  revalidatePath("/admin/paketler");
  redirect("/admin/paketler?updated=toggle");
}

export async function deletePackageAction(formData: FormData) {
  const packageId = readString(formData, "packageId");
  if (!packageId) redirect("/admin/paketler");

  await prisma.package.delete({ where: { id: packageId } });

  revalidatePath("/admin/paketler");
  redirect("/admin/paketler?updated=deleted");
}

export async function bulkAssignPackageAction(formData: FormData) {
  const packageId = readString(formData, "packageId");
  const studentIdsRaw = readString(formData, "studentIds");
  const expiresAtRaw = readString(formData, "expiresAt");

  if (!packageId || !studentIdsRaw) {
    redirect(`/admin/paketler/toplu-ata?error=missing`);
  }

  const studentIds = studentIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (studentIds.length === 0) {
    redirect(`/admin/paketler/toplu-ata?error=missing`);
  }

  // Guard: only active packages can be bulk-assigned (same rule as single assign)
  const pkg = await prisma.package.findUnique({ where: { id: packageId }, select: { isActive: true } });
  if (!pkg?.isActive) redirect("/admin/paketler/toplu-ata?error=inactive");

  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  await Promise.all(
    studentIds.map((studentId) =>
      prisma.studentPackage.upsert({
        where: { studentId_packageId: { studentId, packageId } },
        create: { studentId, packageId, expiresAt, revokedAt: null },
        update: { expiresAt, revokedAt: null, assignedAt: new Date() },
      }),
    ),
  );

  revalidatePath("/admin/ogrenciler");
  revalidatePath("/admin/paketler");
  redirect(`/admin/paketler/toplu-ata?updated=${studentIds.length}`);
}
