"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/admin";
import { sendStudentWelcome } from "@/lib/email";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function registerAction(formData: FormData) {
  const fullName = readString(formData, "fullName");
  const phone = readString(formData, "phone");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");

  if (!fullName || !phone || !email || !password) {
    redirect("/kayit?error=missing");
  }

  if (password.length < 6) {
    redirect("/kayit?error=password-short");
  }

  if (password !== confirmPassword) {
    redirect("/kayit?error=password-mismatch");
  }

  // Check email not already taken
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    redirect("/kayit?error=email-taken");
  }

  // Check phone not already taken
  const phoneKey = normalizePhone(phone);
  const existingStudent = await prisma.student.findUnique({ where: { phoneKey } });
  if (existingStudent) {
    // If they already have a user account, send to login
    if (existingStudent.userId) {
      redirect("/giris?error=already-registered");
    }
    // Student exists but no account yet — create and link
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        passwordHash,
        role: "STUDENT",
        student: { connect: { id: existingStudent.id } },
      },
    });
    await prisma.student.update({
      where: { id: existingStudent.id },
      data: { email, userId: user.id },
    });
    await sendStudentWelcome({ to: email, name: fullName, email, password });
    redirect("/giris?registered=1");
  }

  // Brand new student
  const passwordHash = await bcrypt.hash(password, 12);

  const student = await prisma.student.create({
    data: {
      fullName,
      phone,
      phoneKey,
      email,
      status: "NEW",
      source: "register",
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
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

  await sendStudentWelcome({ to: email, name: fullName, email, password });

  redirect("/giris?registered=1");
}
