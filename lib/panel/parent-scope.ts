import "server-only";

import { notFound } from "next/navigation";
import type { ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccessibleProducts } from "@/lib/auth/products";

/**
 * VELİ KAPSAMI — hangi öğrencinin verisi gösterilebilir?
 *
 * GÜVENLİK SINIRI: seçili öğrenci HER ZAMAN velinin `ParentStudent`
 * bağlantıları arasından çözülür. URL'den gelen `studentId` doğrudan
 * kullanılmaz; yalnızca bağlı öğrenciler arasında ARANIR.
 *
 * BAĞLI OLMAYAN KİMLİK → 404. Önce sessizce ilk bağlı öğrenciye düşülüyordu.
 * Başka ailenin verisi o hâlde de sızmıyordu, ama iki çocuklu bir velide
 * ekran SESSİZCE ÖTEKİ ÇOCUĞU gösteriyordu: veli yanlış çocuğun verisini
 * doğru sanabilirdi. Yanlış kimlik artık açıkça reddedilir.
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

  const children: ParentChild[] = await Promise.all(
    links.map(async (link) => ({
      id: link.student.id,
      userId: link.student.userId,
      name: link.student.user.fullName || link.student.user.email,
      // Çocuğun ürün erişimi kendi üyeliklerinden gelir.
      products: await getAccessibleProducts(link.student.userId, link.student.user.role),
    })),
  );

  if (requestedStudentId) {
    const requested = children.find((c) => c.id === requestedStudentId);
    // Bağlı olmayan kimlik: veri döndürmek yerine 404. Saldırgana bu velinin
    // kaç çocuğu olduğu hakkında da bilgi vermez.
    if (!requested) notFound();
    return { children, selected: requested };
  }

  return { children, selected: children[0] ?? null };
}
