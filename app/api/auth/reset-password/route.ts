import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // P0: brute-force guard — find the active code first, then verify the guess.
    const MAX_CODE_ATTEMPTS = 5;
    const activeCode = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        type: "PASSWORD_RESET",
        usedAt: null,
        expiresAt: { gte: new Date() },
        attempts: { lt: MAX_CODE_ATTEMPTS },
      },
      select: { id: true, code: true, attempts: true },
    });

    if (!activeCode || activeCode.code !== code.trim()) {
      if (activeCode) {
        const newAttempts = activeCode.attempts + 1;
        await prisma.verificationCode.update({
          where: { id: activeCode.id },
          data: {
            attempts: newAttempts,
            ...(newAttempts >= MAX_CODE_ATTEMPTS ? { usedAt: new Date() } : {}),
          },
        });
      }
      return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş." }, { status: 400 });
    }

    const verificationCode = activeCode;

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Şifre sıfırlanamadı." }, { status: 500 });
  }
}
