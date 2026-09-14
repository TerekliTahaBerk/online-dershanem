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
 * Velinin aktif bağlantılarından veliye GÖRÜNÜR çocuklar.
 *
 * VELİ-FREE ÜRÜNLER: yalnızca KPSS üyeliği olan öğrenci listeye HİÇ girmez.
 * KPSS + OD öğrencisi yalnız OD bağlamıyla görünür; KPSS kodu `products`
 * listesine sızmaz. (`next/navigation` içermez; `resolveParentScope` bunu sarar.)
 */
export async function listParentVisibleChildren(parentUserId: string): Promise<ParentChild[]> {
  const links = await prisma.parentStudent.findMany({
    where: { parentId: parentUserId, active: true, endedAt: null },
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
