import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { createPasswordResetToken, PASSWORD_RESET_TTL_MS } from "@/lib/auth/password-reset";
import { queueCustomerInformationEmail, queuePasswordResetEmail } from "@/lib/email";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email";
import { buildOdCustomerStart } from "./onboarding-customer";
import type { OdOnboardingStateValue } from "./onboarding-state";

/** Aynı hesap için callback/retry yalnız tek parola kurulum e-postası üretir. */
export async function queueOdAccountSetup(tx: Prisma.TransactionClient, userId: string) {
  const id = `od-account-setup:${userId}`;
  if (await tx.emailOutbox.findUnique({ where: { id }, select: { id: true } })) return;
  const user = await tx.user.findFirst({ where: { id: userId, role: { in: ["STUDENT", "PARENT"] }, status: "ACTIVE", mustChangePassword: true, inviteSentAt: null }, select: { id: true, email: true, fullName: true } });
  if (!user) return;
  const generated = await createPasswordResetToken();
  await tx.passwordResetToken.create({ data: { id: generated.id, userId, tokenHash: generated.tokenHash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) } });
  await queuePasswordResetEmail({ id, to: user.email, name: user.fullName, tokenId: generated.id, expiresInMinutes: PASSWORD_RESET_TTL_MS / 60_000, purpose: "ACCOUNT_SETUP" }, tx);
}

/** Geçiş kaydı ve e-postası aynı transaction'da kalır; iç notlar müşteriye aktarılmaz. */
export async function queueOdOnboardingUpdate(tx: Prisma.TransactionClient, input: { orderId: string; transitionId: string; state: OdOnboardingStateValue }) {
  const order = await tx.odOrder.findUniqueOrThrow({ where: { id: input.orderId }, select: {
    buyerInfo: true,
    user: { select: { id: true, email: true, status: true, studentProfile: { select: { parents: { where: { active: true, endedAt: null, canViewAcademic: true }, select: { parent: { select: { id: true, email: true, status: true } } } } } } } },
  } });
  const recipients = new Set<string>();
  if (order.user?.status === "ACTIVE") recipients.add(order.user.email);
  for (const link of order.user?.studentProfile?.parents ?? []) if (link.parent.status === "ACTIVE") recipients.add(link.parent.email);
  // Hesap henüz bağlanmadığında ödeme makbuzunun kullandığı alıcı adresi.
  if (!order.user) {
    const buyer = order.buyerInfo as Record<string, unknown> | null;
    for (const key of ["studentEmail", "email", "parentEmail"]) {
      const email = typeof buyer?.[key] === "string" ? normalizeEmail(buyer[key]) : null;
      if (email && isPlausibleEmail(email)) recipients.add(email);
    }
  }
  const copy = buildOdCustomerStart({ state: input.state, paidAt: null, role: "STUDENT" });
  for (const to of recipients) {
    // E-posta adresi anahtara konmaz; deterministik satır id'si aynı alıcıyı tekiller.
    const recipientKey = createHash("sha256").update(to).digest("hex");
    await queueCustomerInformationEmail({ id: `od-start:${input.transitionId}:${recipientKey}`, to, title: copy.title, body: copy.nextStep }, tx);
  }
}
