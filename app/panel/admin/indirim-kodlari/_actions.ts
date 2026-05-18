"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/lib/auth";
import { CouponType, CouponService } from "@prisma/client";
import { normalizeCode } from "@/lib/discount";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function readIntOrZero(fd: FormData, key: string): number {
  const s = readStr(fd, key);
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function readDateOrNull(fd: FormData, key: string): Date | null {
  const s = readStr(fd, key);
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function createCouponAction(fd: FormData) {
  await requirePanelRole("admin");
  const session = await getServerAuthSession();
  const code = normalizeCode(readStr(fd, "code"));
  if (!code) throw new Error("Kod zorunlu");
  const type = (readStr(fd, "type") as CouponType) || "PERCENT";
  const service = (readStr(fd, "service") as CouponService) || "ALL";
  const valueRaw = parseInt(readStr(fd, "value") || "0", 10);
  if (!Number.isFinite(valueRaw) || valueRaw <= 0) throw new Error("Geçerli değer girin");
  if (type === "PERCENT" && (valueRaw < 1 || valueRaw > 100)) {
    throw new Error("Yüzde değeri 1-100 arası olmalı");
  }
  await prisma.coupon.create({
    data: {
      code,
      type,
      service,
      value: valueRaw,
      minOrderCents: readIntOrZero(fd, "minOrderCents"),
      maxDiscountCents: readIntOrZero(fd, "maxDiscountCents"),
      usageLimit: readIntOrZero(fd, "usageLimit"),
      perUserLimit: readIntOrZero(fd, "perUserLimit"),
      startsAt: readDateOrNull(fd, "startsAt"),
      expiresAt: readDateOrNull(fd, "expiresAt"),
      description: readStr(fd, "description") || null,
      isActive: fd.get("isActive") === "on",
      createdById: session?.user?.id ?? null,
    },
  });
  revalidatePath("/panel/admin/indirim-kodlari");
}

export async function updateCouponAction(id: string, fd: FormData) {
  await requirePanelRole("admin");
  const code = normalizeCode(readStr(fd, "code"));
  if (!code) throw new Error("Kod zorunlu");
  const type = (readStr(fd, "type") as CouponType) || "PERCENT";
  const service = (readStr(fd, "service") as CouponService) || "ALL";
  const valueRaw = parseInt(readStr(fd, "value") || "0", 10);
  if (!Number.isFinite(valueRaw) || valueRaw <= 0) throw new Error("Geçerli değer girin");
  if (type === "PERCENT" && (valueRaw < 1 || valueRaw > 100)) {
    throw new Error("Yüzde değeri 1-100 arası olmalı");
  }
  await prisma.coupon.update({
    where: { id },
    data: {
      code,
      type,
      service,
      value: valueRaw,
      minOrderCents: readIntOrZero(fd, "minOrderCents"),
      maxDiscountCents: readIntOrZero(fd, "maxDiscountCents"),
      usageLimit: readIntOrZero(fd, "usageLimit"),
      perUserLimit: readIntOrZero(fd, "perUserLimit"),
      startsAt: readDateOrNull(fd, "startsAt"),
      expiresAt: readDateOrNull(fd, "expiresAt"),
      description: readStr(fd, "description") || null,
      isActive: fd.get("isActive") === "on",
    },
  });
  revalidatePath("/panel/admin/indirim-kodlari");
  revalidatePath(`/panel/admin/indirim-kodlari/${id}/duzenle`);
}

export async function toggleCouponAction(id: string, isActive: boolean) {
  await requirePanelRole("admin");
  await prisma.coupon.update({ where: { id }, data: { isActive } });
  revalidatePath("/panel/admin/indirim-kodlari");
}

export async function deleteCouponAction(id: string) {
  await requirePanelRole("admin");
  // Cascade: redemption'lar onDelete: Cascade ile silinir.
  await prisma.coupon.delete({ where: { id } });
  revalidatePath("/panel/admin/indirim-kodlari");
}
