import "server-only";

import type { ProductCode, UserRole } from "@prisma/client";
import { getAccessibleProducts } from "@/lib/auth/products";
import { pilotProgramForProduct } from "@/lib/auth/product-pilot";
import { checkPilotAccess } from "@/lib/pilot-access";
import { checkOdkPilotAccess } from "@/lib/odk/pilot-access";
import { prisma } from "@/lib/prisma";

/**
 * Ürün paneli seçici için durum.
 *
 * Her ürün kartı dört durumdan birindedir:
 *  - ACTIVE: üyelik var, pilot kapısı açık → "Panele gir".
 *  - PILOT_CLOSED: üyelik var ama pilot kapısı kapalı.
 *  - PREPARING: veli ödedi, çocuğun hesabını yönetim açacak (bekleyen sipariş).
 *  - LOCKED: üyelik yok → satın alma / tanışma bağlantısı.
 */
export const PANEL_PRODUCTS = ["OD", "OK", "ODK"] as const satisfies readonly ProductCode[];
export type PanelProduct = (typeof PANEL_PRODUCTS)[number];
export type ProductPanelState = "ACTIVE" | "PILOT_CLOSED" | "PREPARING" | "LOCKED";

export async function checkProductPanelPilot(userId: string, role: UserRole, product: ProductCode): Promise<boolean> {
  const program = pilotProgramForProduct(product);
  const decision = program === "odk" ? await checkOdkPilotAccess(userId, role) : await checkPilotAccess(userId, role);
  return decision.allowed;
}

export async function loadProductPanelStates(userId: string, role: UserRole): Promise<Record<PanelProduct, ProductPanelState>> {
  const accessible = await getAccessibleProducts(userId, role);
  const [odPilot, odkPilot, preparing] = await Promise.all([
    checkPilotAccess(userId, role).then((decision) => decision.allowed),
    checkOdkPilotAccess(userId, role).then((decision) => decision.allowed),
    role === "PARENT" ? preparingProducts(userId) : Promise.resolve(new Set<PanelProduct>()),
  ]);
  const states = {} as Record<PanelProduct, ProductPanelState>;
  for (const product of PANEL_PRODUCTS) {
    if (accessible.includes(product)) {
      states[product] = (product === "ODK" ? odkPilot : odPilot) ? "ACTIVE" : "PILOT_CLOSED";
    } else {
      states[product] = preparing.has(product) ? "PREPARING" : "LOCKED";
    }
  }
  return states;
}

/** Velinin, öğrenci hesabı henüz açılmamış çocuk için ödediği ürünler. */
async function preparingProducts(parentUserId: string): Promise<Set<PanelProduct>> {
  const [odOrders, odkOrders] = await Promise.all([
    prisma.odOrder.findMany({
      where: { buyerUserId: parentUserId, status: "PAID", pendingChild: { status: "PENDING" } },
      select: { lines: { select: { product: true } } },
    }),
    prisma.odkOrder.count({ where: { buyerUserId: parentUserId, status: "PAID", pendingChild: { status: "PENDING" } } }),
  ]);
  const set = new Set<PanelProduct>();
  for (const order of odOrders) {
    if (!order.lines.length) set.add("OD");
    for (const line of order.lines) if (line.product === "OD" || line.product === "OK" || line.product === "ODK") set.add(line.product);
  }
  if (odkOrders > 0) set.add("ODK");
  return set;
}
