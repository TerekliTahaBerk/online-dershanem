import { PurchaseStatus } from "@prisma/client";
import { z } from "zod";

const trimmedString = z.string().trim().min(1);
const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

export const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export const leadSubmissionSchema = z.object({
  fullName: trimmedString,
  phone: trimmedString,
  classLevel: trimmedString,
  examType: trimmedString,
  targetGoal: trimmedString,
  currentNet: trimmedString,
  parentPhone: optionalTrimmedString,
  kvkkConsent: z.literal(true),
  source: trimmedString,
  formType: z.enum(["FUNNEL", "INLINE"]),
  notes: optionalTrimmedString,
  submittedAt: z.string().datetime()
});

export const purchaseSubmissionSchema = z.object({
  studentFullName: trimmedString,
  studentPhone: trimmedString,
  studentEmail: z.string().trim().email(),
  schoolName: trimmedString,
  city: trimmedString,
  district: trimmedString,
  classLevel: trimmedString,
  department: optionalTrimmedString,
  examType: trimmedString,
  targetRanking: trimmedString,
  currentLevel: trimmedString,
  currentNet: trimmedString,
  weakLessons: trimmedString,
  strongLessons: optionalTrimmedString,
  needType: trimmedString,
  studyStatus: trimmedString,
  weeklyStudyHours: trimmedString,
  parentFullName: optionalTrimmedString,
  parentPhone: optionalTrimmedString,
  parentEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  packageName: trimmedString,
  paymentLink: optionalTrimmedString,
  source: trimmedString,
  notes: optionalTrimmedString,
  kvkkConsent: z.literal(true),
  paymentConsent: z.literal(true),
  submittedAt: z.string().datetime()
});

export const purchaseWebhookSchema = z.object({
  purchaseId: z.string().trim().optional(),
  provider: trimmedString,
  eventType: z.enum([
    "FORM_SUBMITTED",
    "PAYMENT_LINK_OPENED",
    "CALLBACK_RECEIVED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_FAILED"
  ]),
  status: z.nativeEnum(PurchaseStatus),
  providerReference: optionalTrimmedString,
  payload: z.record(z.string(), z.unknown()).optional()
});
