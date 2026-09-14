import type { ProductCode } from "@prisma/client";

/**
 * Ürün → pilot programı eşlemesi.
 *
 * Eskiden guard'larda `product === "ODK" ? odkPilot : odPilot` ikili dalı vardı:
 * enum dışı bir değer (ör. registry'den gelen "KPSS") sessizce OD pilotuna
 * düşerdi. `Record<ProductCode, …>` yeni enum değerinde derleme hatası verir;
 * çalışma zamanında tanımsız değer ise gürültülü hata fırlatır.
 */
export type PilotProgram = "od" | "odk";

/** KPSS'nin pilot programı yok (`null`): OD pilotuna düşürmek yerine hata verir. */
export const PRODUCT_PILOT_PROGRAM: Record<ProductCode, PilotProgram | null> = {
  OD: "od",
  OK: "od",
  ODK: "odk",
  KPSS: null,
};

export function pilotProgramForProduct(product: string): PilotProgram {
  const program = Object.hasOwn(PRODUCT_PILOT_PROGRAM, product) ? PRODUCT_PILOT_PROGRAM[product as ProductCode] : null;
  if (!program) {
    throw new Error(`UNSUPPORTED_PILOT_PRODUCT:${product}`);
  }
  return program;
}
