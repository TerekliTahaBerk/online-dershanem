import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/admin";
import { sendStudentWelcome } from "@/lib/email";

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

    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        code: code.trim(),
        type: "REGISTER",
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (!verificationCode) {
      return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kullanılıyor." }, { status: 400 });
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    });

    const phoneKey = normalizePhone(phone);
    const passwordHash = await bcrypt.hash(password, 12);
    const existingStudent = await prisma.student.findUnique({ where: { phoneKey } });

    if (existingStudent) {
      if (existingStudent.userId) {
        return NextResponse.json({ error: "Bu telefon numarası zaten kayıtlı." }, { status: 400 });
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
        data: { email: normalizedEmail, userId: user.id },
      });
    } else {
      const student = await prisma.student.create({
        data: { fullName, phone, phoneKey, email: normalizedEmail, status: "NEW", source: "register" },
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

    await sendStudentWelcome({ to: normalizedEmail, name: fullName, email: normalizedEmail, password });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kayıt tamamlanamadı." }, { status: 500 });
  }
}
