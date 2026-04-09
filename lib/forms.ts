import { z } from "zod";

const requiredText = z.string().trim().min(1);
const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const optionalUrl = z
  .union([z.string().trim().url(), z.literal(""), z.undefined()])
  .transform((value) => (value ? value : undefined));

export const leadSubmissionSchema = z.object({
  fullName: requiredText,
  phone: requiredText,
  classLevel: requiredText,
  examType: requiredText,
  targetGoal: requiredText,
  currentNet: requiredText,
  parentPhone: optionalText,
  kvkkConsent: z.coerce.boolean(),
  source: requiredText,
  submittedAt: z.string().trim().optional()
});

export const purchaseIntentSchema = z.object({
  submittedAt: z.string().trim().optional(),
  source: requiredText,
  packageName: requiredText,
  paymentLink: optionalUrl,
  studentFullName: requiredText,
  studentPhone: requiredText,
  studentEmail: z.string().trim().email(),
  schoolName: requiredText,
  city: requiredText,
  district: requiredText,
  classLevel: requiredText,
  department: optionalText,
  examType: requiredText,
  targetRanking: requiredText,
  currentLevel: requiredText,
  currentNet: requiredText,
  weakLessons: requiredText,
  strongLessons: optionalText,
  needType: requiredText,
  studyStatus: requiredText,
  weeklyStudyHours: requiredText,
  parentFullName: optionalText,
  parentPhone: optionalText,
  parentEmail: z.string().trim().email().optional().or(z.literal("")).transform((value) => value || undefined),
  notes: optionalText,
  kvkkConsent: z.coerce.boolean(),
  paymentConsent: z.coerce.boolean()
});

export const purchaseEventSchema = z.object({
  purchaseIntentId: z.string().trim().optional(),
  eventType: z.enum(["FORM_SUBMITTED", "PAYMENT_LINK_OPENED", "CALLBACK_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_FAILED"]),
  status: z.enum(["PENDING", "PAID", "FAILED"]).optional(),
  source: optionalText,
  packageName: optionalText,
  paymentLink: optionalUrl,
  provider: optionalText,
  providerReference: optionalText,
  payload: z.any().optional()
});

export function resolveSubmittedAt(value?: string) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
