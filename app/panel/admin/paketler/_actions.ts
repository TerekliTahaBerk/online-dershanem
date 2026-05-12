"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { PackageType } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createPackageAction(fd: FormData) {
  await requirePanelRole("admin");
  const name = readStr(fd, "name");
  if (!name) throw new Error("Ad zorunlu");
  const price = parseInt(readStr(fd, "price") || "0", 10);
  const lessonCount = parseInt(readStr(fd, "lessonCount") || "0", 10);
  await prisma.package.create({
    data: {
      name,
      type: (readStr(fd, "type") as PackageType) || "COURSE",
      description: readStr(fd, "description") || null,
      price: Number.isFinite(price) ? price : 0,
      paytrLink: readStr(fd, "paytrLink") || null,
      lessonCount: Number.isFinite(lessonCount) ? lessonCount : 0,
      subjects: readStr(fd, "subjects"),
      isActive: fd.get("isActive") === "on",
    },
  });
  revalidatePath("/panel/admin/paketler");
}

export async function updatePackageAction(id: string, fd: FormData) {
  await requirePanelRole("admin");
  const name = readStr(fd, "name");
  if (!name) throw new Error("Ad zorunlu");
  const price = parseInt(readStr(fd, "price") || "0", 10);
  const lessonCount = parseInt(readStr(fd, "lessonCount") || "0", 10);
  await prisma.package.update({
    where: { id },
    data: {
      name,
      type: (readStr(fd, "type") as PackageType) || "COURSE",
      description: readStr(fd, "description") || null,
      price: Number.isFinite(price) ? price : 0,
      paytrLink: readStr(fd, "paytrLink") || null,
      lessonCount: Number.isFinite(lessonCount) ? lessonCount : 0,
      subjects: readStr(fd, "subjects"),
      isActive: fd.get("isActive") === "on",
    },
  });
  revalidatePath("/panel/admin/paketler");
}

export async function togglePackageAction(id: string, isActive: boolean) {
  await requirePanelRole("admin");
  await prisma.package.update({ where: { id }, data: { isActive } });
  revalidatePath("/panel/admin/paketler");
}

export async function deletePackageAction(id: string) {
  await requirePanelRole("admin");
  await prisma.package.delete({ where: { id } });
  revalidatePath("/panel/admin/paketler");
}
