import { z } from "zod";

/**
 * Veli satın alımında "bu paket kimin için?" seçimi — SAF (client + server).
 *
 * - linked: hesaba bağlı öğrencinin `StudentProfile.id`'si
 * - pending: hesabı henüz açılmamış çocuğun `PendingChild.id`'si
 *
 * Yalnız bir SEÇİMDİR; sahiplik sunucuda doğrulanır
 * (`lib/commerce/account-purchase.ts#resolvePurchaseContext`).
 */
export const beneficiarySchema = z
  .object({
    type: z.enum(["linked", "pending"]),
    id: z.string().trim().min(1).max(64),
  })
  .optional()
  .nullable();

export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;
