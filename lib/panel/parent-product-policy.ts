import "server-only";

import type { ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccessibleProductCodes } from "@/lib/auth/products";
import { isStudentParentVisible, parentVisibleProducts } from "@/lib/products/parent-visibility";

export type ParentChild = {
  /** StudentProfile.id */
  id: string;
  userId: string;
  name: string;
  /** Bu öğrencinin kendi, veliye açık ürün erişimleri (velinin değil). */
  products: ProductCode[];
};

/**
 * Veli kapsamının amacı.
 *
 * - `academic` (varsayılan): ders, ödev, gelişim, koçluk, deneme… Bağlantı
 *   `canViewAcademic = true` olmalıdır.
 * - `account`: hesap/paket ekranı (bağlı öğrenci adı + ürün listesi, paket
 *   görüşmesi talebi). Akademik veri DEĞİLDİR; `canViewAcademic = false` olan
 *   ama ödeme/hesap ilişkisini sürdüren veli bu ekranı kullanmaya devam eder.
 */
export type ParentScopePurpose = "academic" | "account";

/**
 * Velinin aktif bağlantılarından veliye GÖRÜNÜR çocuklar.
 *
 * VELİ-FREE ÜRÜNLER: yalnızca KPSS üyeliği olan öğrenci listeye HİÇ girmez.
 * KPSS + OD öğrencisi yalnız OD bağlamıyla görünür; KPSS kodu `products`
 * listesine sızmaz. (`next/navigation` içermez; `resolveParentScope` bunu sarar.)
 *
 * AKADEMİK İZİN: varsayılan amaç `academic`tır ve `canViewAcademic = false`
 * bağlantıları listeye almaz. Bağlantının varlığı akademik veri için yetmez.
 */
export async function listParentVisibleChildren(
  parentUserId: string,
  purpose: ParentScopePurpose = "academic",
): Promise<ParentChild[]> {
  const links = await prisma.parentStudent.findMany({
    where: {
      parentId: parentUserId,
      active: true,
      endedAt: null,
      ...(purpose === "academic" ? { canViewAcademic: true } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          user: { select: { fullName: true, email: true, role: true } },
        },
      },
    },
    orderBy: { student: { user: { fullName: "asc" } } },
  });

  const candidates = await Promise.all(
    links.map(async (link) => ({
      link,
      // Çocuğun ürün erişimi kendi üyeliklerinden gelir (registry ürünleri dahil).
      productCodes: await getAccessibleProductCodes(link.student.userId, link.student.user.role),
    })),
  );

  return candidates
    .filter(({ productCodes }) => isStudentParentVisible(productCodes))
    .map(({ link, productCodes }) => ({
      id: link.student.id,
      userId: link.student.userId,
      name: link.student.user.fullName || link.student.user.email,
      products: parentVisibleProducts(productCodes),
    }));
}

/**
 * Veli-free ürün politikasının sunucu kapısı (bkz. `lib/products/parent-visibility.ts`).
 *
 * Yalnızca veli-free ürünlere (KPSS) üyeliği olan öğrenci veli akışlarına
 * dahil edilmez: veli kapsamı, izleyici kapsamı, veli–öğrenci bağlantısı
 * oluşturma ve veli takvim akışı bu fonksiyonu kullanır.
 */
export async function isStudentUserVisibleToParents(studentUserId: string, now = new Date()): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: studentUserId }, select: { role: true } });
  if (!user) return false;
  return isStudentParentVisible(await getAccessibleProductCodes(studentUserId, user.role, now));
}
