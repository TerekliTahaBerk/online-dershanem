import { z } from "zod";
import {
  addChildSchema,
  billingSettingsSchema,
  consentSettingsSchema,
  contactSettingsSchema,
  educationSettingsSchema,
  profileSettingsSchema,
} from "@/lib/account/settings-schema";
import type { SettingsSection } from "@/lib/account/settings-sections";

/**
 * HESAP AYARLARI KOMUTLARI (P5.2) — SAF.
 *
 * Web Server Action'ları (`app/panel/ayarlar/actions.ts`) FormData'yı aynı
 * alan şemalarıyla çözer; mobil JSON gövdesi burada katı biçimde doğrulanır.
 * Her komut yalnız oturumdaki kullanıcının kendi kaydını yazar — gövdede
 * kullanıcı kimliği YOKTUR.
 */
export const settingsCommandSchema = z.discriminatedUnion("type", [
  profileSettingsSchema.extend({ type: z.literal("profile") }).strict(),
  educationSettingsSchema.extend({ type: z.literal("education") }).strict(),
  contactSettingsSchema.extend({ type: z.literal("contact") }).strict(),
  billingSettingsSchema.extend({ type: z.literal("billing") }).strict(),
  consentSettingsSchema.extend({ type: z.literal("consents") }).strict(),
  addChildSchema.extend({ type: z.literal("addChild") }).strict(),
  z.object({ type: z.literal("cancelChild"), childId: z.string().min(1).max(64) }).strict(),
]);

export type SettingsCommand = z.output<typeof settingsCommandSchema>;
export type SettingsCommandType = SettingsCommand["type"];

export const settingsRequestSchema = z
  .object({
    command: settingsCommandSchema,
    idempotencyKey: z.string().uuid().optional(),
    expectedRevision: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .strict();

/** Komutun ait olduğu bölüm: rol bu bölümü görmüyorsa komut reddedilir. */
export const SETTINGS_COMMAND_SECTION: Record<SettingsCommandType, SettingsSection> = {
  profile: "profil",
  education: "egitim",
  contact: "iletisim",
  billing: "fatura",
  consents: "onaylar",
  addChild: "cocuklarim",
  cancelChild: "cocuklarim",
};

/** Formun tamamını yeniden yazan komutlar Bearer'da `expectedRevision` taşır. */
export const SETTINGS_REVISIONED: ReadonlySet<SettingsCommandType> = new Set(["profile", "education", "contact", "billing", "consents"]);
