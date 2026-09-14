import "server-only";

import { notFound } from "next/navigation";
import { listParentVisibleChildren, type ParentChild } from "@/lib/panel/parent-product-policy";

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
 * VELİ-FREE ÜRÜNLER: yalnızca KPSS üyeliği olan öğrenci kapsamda yoktur, bu
 * yüzden URL ile istense de 404 döner (bkz. `listParentVisibleChildren`).
 *
 * §23: birden çok çocuk varsa veriler KARIŞTIRILMAZ; her zaman tek bir
 * seçili öğrencinin bağlamı döner.
 */

export type { ParentChild };

export type ParentScope = {
  children: ParentChild[];
  selected: ParentChild | null;
};

export async function resolveParentScope(
  parentUserId: string,
  requestedStudentId?: string,
): Promise<ParentScope> {
  const children = await listParentVisibleChildren(parentUserId);

  if (requestedStudentId) {
    const requested = children.find((c) => c.id === requestedStudentId);
    // Bağlı olmayan kimlik: veri döndürmek yerine 404. Saldırgana bu velinin
    // kaç çocuğu olduğu hakkında da bilgi vermez.
    if (!requested) notFound();
    return { children, selected: requested };
  }

  return { children, selected: children[0] ?? null };
}
