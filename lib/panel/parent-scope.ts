import "server-only";

import type { ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccessibleProducts } from "@/lib/auth/products";

/**
 * VELİ KAPSAMI — hangi öğrencinin verisi gösterilebilir?
 *
 * GÜVENLİK SINIRI: seçili öğrenci HER ZAMAN velinin `ParentStudent`
 * bağlantıları arasından çözülür. URL'den gelen `studentId` doğrudan
 * kullanılmaz; yalnızca bağlı öğrenciler arasında ARANIR. Bağlı olmayan bir
 * kimlik verilirse sessizce ilk bağlı öğrenciye düşülür — başka bir ailenin
 * verisi hiçbir koşulda çekilmez.
 *
 * §23: birden çok çocuk varsa veriler KARIŞTIRILMAZ; her zaman tek bir
 * seçili öğrencinin bağlamı döner.
 */

export type ParentChild = {
  /** StudentProfile.id */
  id: string;
  userId: string;
  name: string;
  /** Bu öğrencinin kendi ürün erişimleri (velinin değil). */
  products: ProductCode[];
};

export type ParentScope = {
  children: ParentChild[];
  selected: ParentChild | null;
};

export async function resolveParentScope(
  parentUserId: string,
  requestedStudentId?: string,
): Promise<ParentScope> {
  const links = await prisma.parentStudent.findMany({
    where: { parentId: parentUserId },
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

  const children: ParentChild[] = await Promise.all(
    links.map(async (link) => ({
      id: link.student.id,
      userId: link.student.userId,
      name: link.student.user.fullName || link.student.user.email,
      // Çocuğun ürün erişimi kendi üyeliklerinden gelir.
      products: await getAccessibleProducts(link.student.userId, link.student.user.role),
    })),
  );

  const selected =
    (requestedStudentId ? children.find((c) => c.id === requestedStudentId) : undefined) ??
    children[0] ??
    null;

  return { children, selected };
}
