"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";

async function requireAdmin() {
  const session = await getServerAuthSession();
  if (!getPanelAccess(session?.user).hasAdminPanel) redirect("/giris");
}

export async function createCampAction(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const detail = formData.get("detail") as string;
  const category = formData.get("category") as string;
  const quota = parseInt(formData.get("quota") as string) || 8;
  const price = Math.round(parseFloat(formData.get("price") as string) * 100);
  const originalPrice = Math.round(parseFloat(formData.get("originalPrice") as string) * 100);
  const paytrLink = (formData.get("paytrLink") as string) || null;
  const isActive = formData.get("isActive") === "true";
  const startDateRaw = formData.get("startDate") as string;
  const endDateRaw = formData.get("endDate") as string;

  await prisma.camp.create({
    data: {
      name: name.trim(),
      detail: detail.trim(),
      category: category as "AYT" | "TYT" | "LGS",
      quota,
      price,
      originalPrice,
      paytrLink: paytrLink?.trim() || null,
      isActive,
      startDate: startDateRaw ? new Date(startDateRaw) : null,
      endDate: endDateRaw ? new Date(endDateRaw) : null,
    },
  });

  revalidatePath("/admin/kamplar");
  revalidatePath("/kamplar");
  redirect("/admin/kamplar");
}

export async function updateCampAction(id: string, formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const detail = formData.get("detail") as string;
  const category = formData.get("category") as string;
  const quota = parseInt(formData.get("quota") as string) || 8;
  const price = Math.round(parseFloat(formData.get("price") as string) * 100);
  const originalPrice = Math.round(parseFloat(formData.get("originalPrice") as string) * 100);
  const paytrLink = (formData.get("paytrLink") as string) || null;
  const isActive = formData.get("isActive") === "true";
  const startDateRaw = formData.get("startDate") as string;
  const endDateRaw = formData.get("endDate") as string;

  await prisma.camp.update({
    where: { id },
    data: {
      name: name.trim(),
      detail: detail.trim(),
      category: category as "AYT" | "TYT" | "LGS",
      quota,
      price,
      originalPrice,
      paytrLink: paytrLink?.trim() || null,
      isActive,
      startDate: startDateRaw ? new Date(startDateRaw) : null,
      endDate: endDateRaw ? new Date(endDateRaw) : null,
    },
  });

  revalidatePath("/admin/kamplar");
  revalidatePath("/kamplar");
  redirect("/admin/kamplar");
}

export async function deleteCampAction(id: string) {
  await requireAdmin();
  await prisma.camp.delete({ where: { id } });
  revalidatePath("/admin/kamplar");
  revalidatePath("/kamplar");
  redirect("/admin/kamplar");
}
