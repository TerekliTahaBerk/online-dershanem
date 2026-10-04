import { z } from "zod";
import {
  CLASS_LEVELS,
  CONTACT_CHANNELS,
  CONTACT_TIMES,
  EXAM_TYPES,
  FIELD_TRACKS,
  HEARD_FROM,
  PRODUCT_INTERESTS,
  PURCHASE_STATUSES,
  RELATIONSHIPS,
  SCHOOL_TYPES,
  SUBJECTS,
} from "@/lib/account/dictionaries";
import { PASSWORD_MAX_LENGTH } from "@/lib/auth/password-policy";

/**
 * Kendi kendine kayıt şeması — SAF (client + server ortak).
 *
 * Client her adımda aynı parçaları doğrular; KARAR yine sunucunundur
 * (`app/api/auth/register/route.ts` aynı şemayla yeniden parse eder).
 *
 * GÜVENLİK: `accountType` yalnız STUDENT | PARENT olabilir. ADMIN / TEACHER
 * gibi bir değer şema seviyesinde reddedilir — rol yükseltme yüzeyi yok.
 */

/** TR cep telefonu: boşluk/parantez/tire serbest; 0 ile ya da +90 ile ya da çıplak 5xx. */
export function normalizeTrMobile(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("90") && digits.length === 12 ? digits.slice(2) : digits.startsWith("0") && digits.length === 11 ? digits.slice(1) : digits;
  return /^5\d{9}$/.test(local) ? `+90${local}` : null;
}

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const mobile = z
  .string()
  .trim()
  .max(24)
  .refine((value) => normalizeTrMobile(value) !== null, { message: "Geçerli bir cep telefonu girin (5xx xxx xx xx)." })
  .transform((value) => normalizeTrMobile(value) as string);

const optionalMobile = z
  .string()
  .trim()
  .max(24)
  .optional()
  .nullable()
  .refine((value) => !value || normalizeTrMobile(value) !== null, { message: "Telefon numarası geçersiz." })
  .transform((value) => (value ? normalizeTrMobile(value) : null));

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .optional()
  .nullable()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), { message: "E-posta geçersiz." })
  .transform((value) => (value ? value.toLowerCase() : null));

const currentYear = new Date().getFullYear();

/** Adım 2 — kişisel bilgiler (iki rol için ortak çekirdek). */
export const personalStepSchema = z.object({
  fullName: trimmed(2, 120),
  email: z.string().trim().min(3).max(254),
  phone: mobile,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  city: trimmed(2, 80),
  district: trimmed(2, 80),
});

/** Adım 3 (öğrenci) — eğitim bilgileri. */
export const studentEducationSchema = z.object({
  birthDate: z.iso.date().optional().nullable().or(z.literal("")).transform((value) => (value ? value : null)),
  classLevel: z.enum(CLASS_LEVELS),
  schoolName: optionalText(160),
  schoolType: z.enum(SCHOOL_TYPES).optional().nullable(),
  examType: z.enum(EXAM_TYPES),
  fieldTrack: z.enum(FIELD_TRACKS).optional().nullable(),
  targetRank: z.coerce.number().int().min(1).max(3_000_000).optional().nullable().or(z.literal("").transform(() => null)),
  weakSubjects: z.array(z.enum(SUBJECTS)).max(SUBJECTS.length).default([]),
  weeklyStudyHours: z.coerce.number().int().min(0).max(100).optional().nullable().or(z.literal("").transform(() => null)),
});

/** Adım 3b (öğrenci) — beyan edilen veli bilgisi. Erişim vermez; admin bağlantı için kullanır. */
export const guardianSchema = z.object({
  guardianName: optionalText(120),
  guardianPhone: optionalMobile,
  guardianEmail: optionalEmail,
});

/** Adım 3 (veli) — çocuk bilgisi. Hesap açılmaz; `PendingChild` olarak bekler. */
export const childSchema = z.object({
  fullName: trimmed(2, 120),
  classLevel: z.enum(CLASS_LEVELS),
  schoolName: optionalText(160),
  examType: z.enum(EXAM_TYPES),
  fieldTrack: z.enum(FIELD_TRACKS).optional().nullable(),
  birthYear: z.coerce.number().int().min(currentYear - 30).max(currentYear - 5).optional().nullable().or(z.literal("").transform(() => null)),
  email: optionalEmail,
  phone: optionalMobile,
});
export const MAX_CHILDREN_PER_SIGNUP = 5;

/** Adım 4 — ilgi, satın alma ve iletişim tercihi. */
export const interestStepSchema = z.object({
  interestedProducts: z.array(z.enum(PRODUCT_INTERESTS)).min(1, "En az bir ürün seçin.").max(3),
  purchaseStatus: z.enum(PURCHASE_STATUSES),
  existingOrderRef: optionalText(120),
  preferredChannel: z.enum(CONTACT_CHANNELS),
  preferredContactTime: z.enum(CONTACT_TIMES),
  heardFrom: z.enum(HEARD_FROM).optional().nullable(),
  note: optionalText(500),
});

/** Adım 5 — onaylar. KVKK ve koşullar zorunlu; ticari ileti isteğe bağlı. */
export const consentStepSchema = z.object({
  kvkkConsent: z.literal(true, { message: "KVKK aydınlatma metnini onaylamanız gerekiyor." }),
  termsConsent: z.literal(true, { message: "Kullanım koşullarını onaylamanız gerekiyor." }),
  marketingConsent: z.boolean().default(false),
});

const common = personalStepSchema.extend(interestStepSchema.shape).extend(consentStepSchema.shape);

export const studentRegisterSchema = common
  .extend(studentEducationSchema.shape)
  .extend(guardianSchema.shape)
  .extend({ accountType: z.literal("STUDENT") });

export const parentRegisterSchema = common.extend({
  accountType: z.literal("PARENT"),
  relationship: z.enum(RELATIONSHIPS),
  children: z.array(childSchema).min(1, "En az bir çocuk ekleyin.").max(MAX_CHILDREN_PER_SIGNUP),
});

export const registerSchema = z.discriminatedUnion("accountType", [studentRegisterSchema, parentRegisterSchema]);

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterData = z.output<typeof registerSchema>;
export type ChildInput = z.input<typeof childSchema>;
export type ChildData = z.output<typeof childSchema>;

/** İlk zod hatasını kullanıcıya gösterilecek Türkçe cümleye çevirir. */
export function firstIssueMessage(error: z.ZodError, fallback = "Lütfen işaretli alanları kontrol edin."): string {
  const issue = error.issues[0];
  if (!issue) return fallback;
  if (issue.message && !/^(Invalid|Too|Expected)/.test(issue.message)) return issue.message;
  return fallback;
}
