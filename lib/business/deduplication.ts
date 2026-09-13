import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";

export type LeadIdentity = { id?: string; phone?: string | null; email?: string | null; instagramScopedId?: string | null; relatedUserId?: string | null };
export function leadMatchConfidence(left: LeadIdentity, right: LeadIdentity) {
  const phone = normalizePhone(left.phone) && normalizePhone(left.phone) === normalizePhone(right.phone);
  const email = normalizeEmail(left.email) && normalizeEmail(left.email) === normalizeEmail(right.email);
  const instagram = Boolean(left.instagramScopedId && left.instagramScopedId === right.instagramScopedId);
  const user = Boolean(left.relatedUserId && left.relatedUserId === right.relatedUserId);
  if (user || instagram || (phone && email)) {
    return {
      confidence: 1,
      autoMerge: true,
      reasons: [user ? "USER" : null, instagram ? "INSTAGRAM" : null, phone ? "PHONE" : null, email ? "EMAIL" : null].filter(
        (reason): reason is string => Boolean(reason),
      ),
    };
  }
  if (phone || email) return { confidence: 0.78, autoMerge: false, reasons: [phone ? "PHONE" : "EMAIL"] };
  return { confidence: 0, autoMerge: false, reasons: [] as string[] };
}
