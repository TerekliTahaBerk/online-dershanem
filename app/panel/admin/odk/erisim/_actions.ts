"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { logAudit } from "@/lib/audit";
import type { AccessService } from "@prisma/client";

/** Slug-style key normalisation. */
function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
}

function parseService(value: FormDataEntryValue | null): AccessService {
  const v = String(value ?? "").toUpperCase();
  return v === "OD" ? "OD" : "ODK";
}

function readString(value: FormDataEntryValue | null, max = 200): string {
  return String(value ?? "").trim().slice(0, max);
}

function readOptionalString(value: FormDataEntryValue | null, max = 1000): string | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return v.slice(0, max);
}

// ── Tag CRUD ────────────────────────────────────────────────────────────────

export async function createAccessTagAction(formData: FormData) {
  const ctx = await requirePanelRole("admin");
  const title = readString(formData.get("title"), 120);
  const rawKey = readString(formData.get("key"), 64);
  const description = readOptionalString(formData.get("description"));
  const service = parseService(formData.get("service"));
  const isActive = String(formData.get("isActive") ?? "on") !== "off";

  if (!title) {
    throw new Error("Tag başlığı zorunlu.");
  }
  const key = normalizeKey(rawKey || title);
  if (!key) {
    throw new Error("Geçersiz tag anahtarı.");
  }

  // Anahtar çakışması kontrolü
  const existing = await prisma.odkAccessTag.findUnique({ where: { key } });
  if (existing) {
    throw new Error(`"${key}" anahtarı zaten kullanılıyor.`);
  }

  const tag = await prisma.odkAccessTag.create({
    data: { key, title, description, service, isActive },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkAccessTag",
    entityId: tag.id,
    action: "TAG_CREATE",
    summary: `${service} tag "${key}" oluşturuldu`,
  });

  revalidatePath("/panel/admin/odk/erisim");
  redirect("/panel/admin/odk/erisim");
}

export async function updateAccessTagAction(tagId: string, formData: FormData) {
  await requirePanelRole("admin");
  if (!tagId) throw new Error("Tag id gerekli.");

  const title = readString(formData.get("title"), 120);
  const description = readOptionalString(formData.get("description"));
  const service = parseService(formData.get("service"));
  const isActive = String(formData.get("isActive") ?? "on") !== "off";

  if (!title) throw new Error("Tag başlığı zorunlu.");

  await prisma.odkAccessTag.update({
    where: { id: tagId },
    data: { title, description, service, isActive },
  });

  revalidatePath("/panel/admin/odk/erisim");
  revalidatePath(`/panel/admin/odk/erisim/${tagId}/duzenle`);
  redirect("/panel/admin/odk/erisim");
}

export async function toggleAccessTagAction(tagId: string, makeActive: boolean) {
  await requirePanelRole("admin");
  if (!tagId) throw new Error("Tag id gerekli.");
  await prisma.odkAccessTag.update({
    where: { id: tagId },
    data: { isActive: makeActive },
  });
  revalidatePath("/panel/admin/odk/erisim");
}

export async function deleteAccessTagAction(tagId: string) {
  const ctx = await requirePanelRole("admin");
  if (!tagId) throw new Error("Tag id gerekli.");
  // Kullanılıyorsa silmek yerine pasifleştir.
  const counts = await prisma.odkAccessTag.findUnique({
    where: { id: tagId },
    select: { key: true, _count: { select: { userTags: true, examTags: true, packageTags: true } } },
  });
  const totalUsage =
    (counts?._count.userTags ?? 0) +
    (counts?._count.examTags ?? 0) +
    (counts?._count.packageTags ?? 0);
  if (totalUsage > 0) {
    await prisma.odkAccessTag.update({
      where: { id: tagId },
      data: { isActive: false },
    });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "OdkAccessTag",
      entityId: tagId,
      action: "TAG_DEACTIVATE",
      summary: `Tag "${counts?.key}" pasifleştirildi (kullanım: ${totalUsage})`,
    });
  } else {
    await prisma.odkAccessTag.delete({ where: { id: tagId } });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "OdkAccessTag",
      entityId: tagId,
      action: "TAG_DELETE",
      summary: `Tag "${counts?.key}" kalıcı silindi`,
    });
  }
  revalidatePath("/panel/admin/odk/erisim");
}

// ── User access grant / revoke ──────────────────────────────────────────────

export async function grantUserAccessAction(formData: FormData) {
  const ctx = await requirePanelRole("admin");
  const userId = readString(formData.get("userId"), 64);
  const accessTagId = readString(formData.get("accessTagId"), 64);
  const expiresAtRaw = readOptionalString(formData.get("expiresAt"));

  if (!userId || !accessTagId) {
    throw new Error("Kullanıcı ve tag seçimi zorunlu.");
  }

  // Tag aktif mi kontrol et
  const tag = await prisma.odkAccessTag.findUnique({
    where: { id: accessTagId },
    select: { id: true, isActive: true },
  });
  if (!tag) throw new Error("Tag bulunamadı.");
  if (!tag.isActive) throw new Error("Pasif tag verilemez.");

  let expiresAt: Date | null = null;
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw);
    if (!Number.isNaN(d.getTime())) expiresAt = d;
  }

  const ut = await prisma.odkUserAccessTag.upsert({
    where: { userId_accessTagId: { userId, accessTagId } },
    create: {
      userId,
      accessTagId,
      source: "MANUAL",
      grantedById: ctx.userId,
      expiresAt,
      revokedAt: null,
    },
    update: {
      revokedAt: null,
      expiresAt,
      grantedById: ctx.userId,
      source: "MANUAL",
    },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkUserAccessTag",
    entityId: ut.id,
    action: "ACCESS_GRANT",
    summary: `Kullanıcıya tag ${accessTagId.slice(0, 8)} manuel verildi`,
    payload: { userId, accessTagId, expiresAt: expiresAt?.toISOString() ?? null },
  });

  revalidatePath("/panel/admin/odk/erisim");
  revalidatePath("/panel/admin/odk/erisim/kullanicilar");
  revalidatePath(`/panel/admin/odk/erisim/kullanicilar/${userId}`);
}

export async function revokeUserAccessAction(userTagId: string, userId: string) {
  const ctx = await requirePanelRole("admin");
  if (!userTagId) throw new Error("Tag id gerekli.");
  await prisma.odkUserAccessTag.update({
    where: { id: userTagId },
    data: { revokedAt: new Date() },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkUserAccessTag",
    entityId: userTagId,
    action: "ACCESS_REVOKE",
    summary: `Kullanıcı erişimi revoke edildi`,
    payload: { userId },
  });
  revalidatePath("/panel/admin/odk/erisim");
  revalidatePath("/panel/admin/odk/erisim/kullanicilar");
  if (userId) {
    revalidatePath(`/panel/admin/odk/erisim/kullanicilar/${userId}`);
  }
}

export async function restoreUserAccessAction(userTagId: string, userId: string) {
  const ctx = await requirePanelRole("admin");
  if (!userTagId) throw new Error("Tag id gerekli.");
  await prisma.odkUserAccessTag.update({
    where: { id: userTagId },
    data: { revokedAt: null },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkUserAccessTag",
    entityId: userTagId,
    action: "ACCESS_RESTORE",
    summary: `Kullanıcı erişimi geri açıldı`,
    payload: { userId },
  });
  revalidatePath("/panel/admin/odk/erisim");
  revalidatePath("/panel/admin/odk/erisim/kullanicilar");
  if (userId) {
    revalidatePath(`/panel/admin/odk/erisim/kullanicilar/${userId}`);
  }
}
