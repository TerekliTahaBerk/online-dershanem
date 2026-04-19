"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createPackageAction(formData: FormData) {
  const name = readString(formData, "name");
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
    data: { name, description, price, lessonCount, subjects, paytrLink, isActive }
  });

  revalidatePath("/admin/paketler");
  redirect("/admin/paketler?updated=created");
}

export async function updatePackageAction(formData: FormData) {
  const packageId = readString(formData, "packageId");
  const name = readString(formData, "name");
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
      description,
      price: isNaN(price) ? undefined : price,
      lessonCount: isNaN(lessonCount) ? undefined : lessonCount,
      subjects,
      paytrLink,
      isActive
    }
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
    data: { isActive: !currentIsActive }
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
