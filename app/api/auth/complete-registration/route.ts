import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/auth-utils";
import { sendSelfRegistrationWelcome } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code, fullName, phone, password } = body as {
      email?: string;
      code?: string;
      fullName?: string;
      phone?: string;
      password?: string;
    };

    if (!email || !code || !fullName || !phone || !password) {
      return NextResponse.json({ error: "Eksik alanlar." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // P0: brute-force guard — find the active code first, then check the guess.
    // Increment attempts regardless; if attempts >= 5, invalidate the code.
    const MAX_CODE_ATTEMPTS = 5;
    const activeCode = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        type: "REGISTER",
        usedAt: null,
        expiresAt: { gte: new Date() },
        attempts: { lt: MAX_CODE_ATTEMPTS },
      },
      select: { id: true, code: true, attempts: true },
    });

    if (!activeCode || activeCode.code !== code.trim()) {
      // Increment attempt counter if a code exists (even on wrong guess)
      if (activeCode) {
        const newAttempts = (activeCode.attempts ?? 0) + 1;
        await prisma.verificationCode.update({
          where: { id: activeCode.id },
          data: {
            attempts: newAttempts,
            // Invalidate after hitting the limit
            ...(newAttempts >= MAX_CODE_ATTEMPTS ? { usedAt: new Date() } : {}),
          },
        });
      }
      return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş." }, { status: 400 });
    }

    const verificationCode = activeCode;

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      // Don't reveal that the account exists — use the same message as invalid code
      return NextResponse.json({ error: "Kayıt tamamlanamadı. Lütfen tekrar deneyin." }, { status: 400 });
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    });

    const phoneKey = normalizePhone(phone);
    // Store the normalized phone so UI displays a consistent format
    const normalizedPhone = phone.replace(/\D/g, "").replace(/^0/, "+90").replace(/^90/, "+90").replace(/^(\d{10})$/, "+90$1");
    const passwordHash = await bcrypt.hash(password, 12);
    const existingStudent = await prisma.student.findUnique({ where: { phoneKey } });

    if (existingStudent) {
      if (existingStudent.userId) {
        // Don't reveal phone ownership; generic message
        return NextResponse.json({ error: "Kayıt tamamlanamadı. Lütfen tekrar deneyin." }, { status: 400 });
      }
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: fullName,
          passwordHash,
          role: "STUDENT",
          student: { connect: { id: existingStudent.id } },
        },
      });
      await prisma.student.update({
        where: { id: existingStudent.id },
        data: { email: normalizedEmail, phone: normalizedPhone, userId: user.id },
      });
    } else {
      const student = await prisma.student.create({
        data: { fullName, phone: normalizedPhone, phoneKey, email: normalizedEmail, status: "NEW", source: "register" },
      });
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: fullName,
          passwordHash,
          role: "STUDENT",
          student: { connect: { id: student.id } },
        },
      });
      await prisma.student.update({
        where: { id: student.id },
        data: { userId: user.id },
      });
    }

    await sendSelfRegistrationWelcome({ to: normalizedEmail, name: fullName });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kayıt tamamlanamadı." }, { status: 500 });
  }
}
