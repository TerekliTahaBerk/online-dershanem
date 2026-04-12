import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, type } = body as { email?: string; type?: string };

    if (!email || !type || !["REGISTER", "PASSWORD_RESET"].includes(type)) {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (type === "PASSWORD_RESET") {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        // Don't reveal whether the account exists
        return NextResponse.json({ ok: true });
      }
    }

    // Rate limit: max 3 codes per 10 minutes per email+type
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.verificationCode.count({
      where: {
        email: normalizedEmail,
        type: type as "REGISTER" | "PASSWORD_RESET",
        createdAt: { gte: tenMinutesAgo },
      },
    });

    if (recentCount >= 3) {
      return NextResponse.json(
        { error: "Çok fazla kod isteği gönderildi. Lütfen 10 dakika bekleyin." },
        { status: 429 }
      );
    }

    // Invalidate previous unused codes for this email+type
    await prisma.verificationCode.updateMany({
      where: {
        email: normalizedEmail,
        type: type as "REGISTER" | "PASSWORD_RESET",
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        email: normalizedEmail,
        code,
        type: type as "REGISTER" | "PASSWORD_RESET",
        expiresAt,
      },
    });

    await sendVerificationCode({ to: normalizedEmail, code, type: type as "REGISTER" | "PASSWORD_RESET" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kod gönderilemedi." }, { status: 500 });
  }
}
