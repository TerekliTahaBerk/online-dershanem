import { z } from "zod";
import {
  CLASS_LEVELS,
  CONTACT_CHANNELS,
  CONTACT_TIMES,
  EXAM_TYPES,
  FIELD_TRACKS,
  RELATIONSHIPS,
  SCHOOL_TYPES,
  SUBJECTS,
} from "@/lib/account/dictionaries";
import { childSchema, normalizeTrMobile } from "@/lib/auth/register-schema";

/**
 * Panel ayarları form şemaları — SAF.
 *
 * Server action'lar `FormData`'yı burada parse eder. Boş string "silindi"
 * anlamına gelir ve null'a çevrilir; zorunlu alanlar (ad, telefon) boş
 * bırakılamaz.
 */

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(blankToNull, schema.nullable().optional());

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(120),
  phone: z
    .string()
    .trim()
    .max(24)
    .refine((value) => normalizeTrMobile(value) !== null, { message: "Geçerli bir cep telefonu girin (5xx xxx xx xx)." })
    .transform((value) => normalizeTrMobile(value) as string),
  city: optional(z.string().trim().max(80)),
  district: optional(z.string().trim().max(80)),
  birthDate: optional(z.iso.date()),
  relationship: optional(z.enum(RELATIONSHIPS)),
});

export const educationSettingsSchema = z.object({
  classLevel: z.enum(CLASS_LEVELS, { message: "Sınıfını seç." }),
  examType: z.enum(EXAM_TYPES, { message: "Hedef sınavını seç." }),
  fieldTrack: optional(z.enum(FIELD_TRACKS)),
  schoolName: optional(z.string().trim().max(160)),
  schoolType: optional(z.enum(SCHOOL_TYPES)),
  targetRank: optional(z.coerce.number().int().min(1).max(3_000_000)),
  weeklyStudyHours: optional(z.coerce.number().int().min(0).max(100)),
  weakSubjects: z.array(z.enum(SUBJECTS)).max(SUBJECTS.length).default([]),
  guardianName: optional(z.string().trim().max(120)),
  guardianPhone: optional(
    z
      .string()
      .trim()
      .max(24)
      .refine((value) => normalizeTrMobile(value) !== null, { message: "Veli telefonu geçersiz." })
      .transform((value) => normalizeTrMobile(value) as string),
  ),
  guardianEmail: optional(z.string().trim().toLowerCase().max(254).email("Veli e-postası geçersiz.")),
});

export const contactSettingsSchema = z.object({
  preferredChannel: z.enum(CONTACT_CHANNELS),
  preferredContactTime: z.enum(CONTACT_TIMES),
  note: optional(z.string().trim().max(500)),
});

export const billingSettingsSchema = z.object({
  billingAddress: optional(z.string().trim().max(500)),
});

export const consentSettingsSchema = z.object({
  kvkkConsent: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()),
  marketingConsent: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()),
});

export const addChildSchema = childSchema;

/** FormData → düz nesne; aynı adlı çoklu alanlar (checkbox) dizi olur. */
export function formDataObject(formData: FormData, arrayKeys: readonly string[] = []): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    result[key] = arrayKeys.includes(key) ? formData.getAll(key) : formData.get(key);
  }
  for (const key of arrayKeys) if (!(key in result)) result[key] = [];
  return result;
}

export type SettingsActionState = { ok: boolean; message: string | null; savedAt?: number };
export const initialSettingsState: SettingsActionState = { ok: false, message: null };
