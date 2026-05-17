"use server";
import { prisma } from "@/lib/prisma";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function s(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}
function b(fd: FormData, k: string): boolean {
  return fd.get(k) === "on" || fd.get(k) === "true";
}
function n(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (!v) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function buildPackageData(fd: FormData, isCreate: boolean) {
  const title = s(fd, "title");
  if (!title) throw new Error("Paket adı zorunludur.");
  const priceTry = n(fd, "priceTry");
  if (priceTry === null || priceTry < 0) throw new Error("Geçerli bir fiyat giriniz.");
  const originalPriceTry = n(fd, "originalPriceTry");
  const slugRaw = s(fd, "slug") || slugify(title);
  return {
    title,
    slug: slugRaw,
    description: s(fd, "description") || null,
    priceCents: Math.round(priceTry * 100),
    originalPriceCents:
      originalPriceTry !== null && originalPriceTry > 0
        ? Math.round(originalPriceTry * 100)
        : null,
    durationDays: n(fd, "durationDays"),
    isActive: isCreate ? true : b(fd, "isActive"),
    isFeatured: b(fd, "isFeatured"),
    ctaText: s(fd, "ctaText") || null,
  };
}

export async function createOdkPackageAction(fd: FormData) {
  const ctx = await requireOdkPanel("admin");
  const data = await buildPackageData(fd, true);
  const pkg = await prisma.odkPackage.create({ data });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkPackage",
    entityId: pkg.id,
    action: "ODK_PACKAGE_CREATE",
    summary: `${data.title} oluşturuldu (${(data.priceCents / 100).toFixed(2)} TL)`,
  });
  revalidatePath("/panel/admin/odk/paketler");
  redirect(`/panel/admin/odk/paketler/${pkg.id}`);
}

export async function updateOdkPackageAction(id: string, fd: FormData) {
  const ctx = await requireOdkPanel("admin");
  const data = await buildPackageData(fd, false);
  await prisma.odkPackage.update({ where: { id }, data });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkPackage",
    entityId: id,
    action: "ODK_PACKAGE_UPDATE",
    summary: `${data.title} güncellendi`,
  });
  revalidatePath("/panel/admin/odk/paketler");
  revalidatePath(`/panel/admin/odk/paketler/${id}`);
  redirect(`/panel/admin/odk/paketler/${id}`);
}

export async function toggleOdkPackageActiveAction(id: string) {
  const ctx = await requireOdkPanel("admin");
  const pkg = await prisma.odkPackage.findUnique({ where: { id }, select: { isActive: true, title: true } });
  if (!pkg) throw new Error("Paket bulunamadı.");
  await prisma.odkPackage.update({ where: { id }, data: { isActive: !pkg.isActive } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkPackage",
    entityId: id,
    action: pkg.isActive ? "ODK_PACKAGE_DEACTIVATE" : "ODK_PACKAGE_ACTIVATE",
    summary: `${pkg.title} ${pkg.isActive ? "pasifleştirildi" : "aktifleştirildi"}`,
  });
  revalidatePath("/panel/admin/odk/paketler");
  revalidatePath(`/panel/admin/odk/paketler/${id}`);
}

export async function setOdkPackageTagsAction(id: string, fd: FormData) {
  await requireOdkPanel("admin");
  const tagIds = fd.getAll("tagIds").filter((v): v is string => typeof v === "string");
  await prisma.$transaction(async (tx) => {
    await tx.odkPackageAccessTag.deleteMany({ where: { packageId: id } });
    if (tagIds.length > 0) {
      await tx.odkPackageAccessTag.createMany({
        data: tagIds.map((accessTagId) => ({ packageId: id, accessTagId })),
        skipDuplicates: true,
      });
    }
  });
  revalidatePath(`/panel/admin/odk/paketler/${id}`);
}

export async function setOdkPackageExamsAction(id: string, fd: FormData) {
  await requireOdkPanel("admin");
  const examIds = fd.getAll("examIds").filter((v): v is string => typeof v === "string");
  await prisma.$transaction(async (tx) => {
    await tx.odkPackageExam.deleteMany({ where: { packageId: id } });
    if (examIds.length > 0) {
      await tx.odkPackageExam.createMany({
        data: examIds.map((examId, idx) => ({ packageId: id, examId, sortOrder: idx })),
        skipDuplicates: true,
      });
    }
  });
  revalidatePath(`/panel/admin/odk/paketler/${id}`);
}

export async function deleteOdkPackageAction(id: string) {
  const ctx = await requireOdkPanel("admin");
  // Sipariş/entitlement bağlıysa silmek yerine pasifleştir (veri kaybı koruması).
  const count = await prisma.odkOrder.count({ where: { packageId: id } });
  if (count > 0) {
    await prisma.odkPackage.update({ where: { id }, data: { isActive: false } });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "OdkPackage",
      entityId: id,
      action: "ODK_PACKAGE_DEACTIVATE",
      summary: `Sipariş bağlı (${count}) — silmek yerine pasifleştirildi`,
    });
    revalidatePath("/panel/admin/odk/paketler");
    redirect("/panel/admin/odk/paketler");
  }
  await prisma.odkPackage.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkPackage",
    entityId: id,
    action: "ODK_PACKAGE_DELETE",
    summary: `Paket kalıcı silindi`,
  });
  revalidatePath("/panel/admin/odk/paketler");
  redirect("/panel/admin/odk/paketler");
}
