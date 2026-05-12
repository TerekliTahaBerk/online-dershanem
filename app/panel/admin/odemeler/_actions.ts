"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { PurchaseStatus } from "@prisma/client";

export async function setPurchaseStatusAction(id: string, status: PurchaseStatus) {
  await requirePanelRole("admin");
  await prisma.purchaseIntent.update({ where: { id }, data: { status } });
  revalidatePath("/panel/admin/odemeler");
}
