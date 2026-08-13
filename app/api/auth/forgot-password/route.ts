import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/auth/email";
import { createPasswordResetToken, PASSWORD_RESET_TTL_MS } from "@/lib/auth/password-reset";
import { queuePasswordResetEmail } from "@/lib/email";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { getRateLimitKeyFromIp } from "@/lib/security/rate-limit";

const schema = z.object({ email: z.string().min(3).max(254) });
const GENERIC_MESSAGE = "E-posta hesabımızda kayıtlıysa parola yenileme bağlantısını gönderdik.";
const RESPONSE_FLOOR_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  if (!PANEL_ENABLED) return NextResponse.json({ error: "Panel şu anda kapalı." }, { status: 503 });

  const ipGuard = await guardMutation({
    action: "auth.forgot_password",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: getRateLimitKeyFromIp(request.headers, "auth.forgot-password"),
    rateLimit: { max: 5, windowMs: 60 * 60_000, message: "Çok fazla istek. Bir süre sonra tekrar deneyin." },
  });
  if (!ipGuard.ok) return mutationGuardResponse(ipGuard);

  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = schema.safeParse(body);
  const email = parsed.success ? normalizeEmail(parsed.data.email) : "";

  // This floor also covers invalid/nonexistent accounts, keeping the observable
  // response profile close to a successful outbox write.
  const responseFloor = delay(RESPONSE_FLOOR_MS);

  const emailKey = createHash("sha256").update(email || "invalid-email").digest("hex");
  const emailGuard = await guardMutation({
    action: "auth.forgot_password.email",
    rateLimitKey: `auth:forgot-password:email:${emailKey}`,
    rateLimit: { max: 3, windowMs: 60 * 60_000, message: "Çok fazla istek. Bir süre sonra tekrar deneyin." },
  });
  if (!emailGuard.ok) {
    await responseFloor;
    return mutationGuardResponse(emailGuard);
  }

  if (parsed.success) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.status === "ACTIVE") {
      const now = new Date();
      const generated = createPasswordResetToken();
      try {
        await prisma.$transaction(async (tx) => {
          await tx.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: now },
          });
          await tx.passwordResetToken.create({
            data: {
              id: generated.id,
              userId: user.id,
              tokenHash: generated.tokenHash,
              expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
            },
          });
          await queuePasswordResetEmail({
            to: user.email,
            name: user.fullName,
            tokenId: generated.id,
            expiresInMinutes: PASSWORD_RESET_TTL_MS / 60_000,
          }, tx);
        });
      } catch (error) {
        // The public response remains generic. Never include the token or email.
        console.error("[auth] password reset request could not be queued", { userId: user.id, error });
      }
    }
  }

  await responseFloor;
  return NextResponse.json({ message: GENERIC_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
}
