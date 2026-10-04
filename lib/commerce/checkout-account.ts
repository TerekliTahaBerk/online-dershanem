import "server-only";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import type { BuyerInfoFormDefaults, CheckoutAccount } from "@/components/checkout/buyer-info-form";

/**
 * Ödeme formu için oturum bağlamı: giriş yapmış öğrenci/veli formu hesap
 * bilgileriyle ön doldurur; veli ayrıca "bu paket kimin için?" seçer.
 * Anonim ziyaretçi ve personel için null — eski akış aynen sürer.
 */
export async function loadCheckoutAccount(): Promise<{ account: CheckoutAccount; defaults: BuyerInfoFormDefaults } | null> {
  const session = await getSession().catch(() => null);
  if (!session || (session.role !== "STUDENT" && session.role !== "PARENT")) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      fullName: true,
      email: true,
      phone: true,
      signupProfile: { select: { city: true, district: true, guardianName: true, guardianPhone: true, guardianEmail: true, billingAddress: true } },
      studentProfile: { select: { classLevel: true, schoolName: true, examType: true, fieldTrack: true } },
      parentStudents: {
        where: { active: true, endedAt: null },
        select: { student: { select: { id: true, classLevel: true, schoolName: true, examType: true, user: { select: { fullName: true, email: true } } } } },
      },
      pendingChildren: { where: { status: "PENDING" }, select: { id: true, fullName: true, classLevel: true, schoolName: true, examType: true } },
    },
  });
  if (!user) return null;

  const base: BuyerInfoFormDefaults = {
    fullName: user.fullName ?? "",
    email: user.email,
    phone: user.phone ?? "",
    city: user.signupProfile?.city ?? "",
    district: user.signupProfile?.district ?? "",
    address: user.signupProfile?.billingAddress ?? "",
  };

  if (session.role === "STUDENT") {
    return {
      account: { role: "STUDENT", displayName: user.fullName || user.email, email: user.email, beneficiaries: [] },
      defaults: {
        ...base,
        schoolName: user.studentProfile?.schoolName ?? "",
        classLevel: user.studentProfile?.classLevel ?? "",
        examType: user.studentProfile?.examType ?? "",
        department: user.studentProfile?.fieldTrack ?? "",
        parentFullName: user.signupProfile?.guardianName ?? "",
        parentPhone: user.signupProfile?.guardianPhone ?? "",
        parentEmail: user.signupProfile?.guardianEmail ?? "",
      },
    };
  }

  const beneficiaries: CheckoutAccount["beneficiaries"] = [
    ...user.parentStudents.map((link) => ({
      type: "linked" as const,
      id: link.student.id,
      label: link.student.user.fullName || link.student.user.email,
      hint: "Hesabı açık",
      classLevel: link.student.classLevel,
      schoolName: link.student.schoolName,
      examType: link.student.examType,
    })),
    ...user.pendingChildren.map((child) => ({
      type: "pending" as const,
      id: child.id,
      label: child.fullName,
      hint: "Öğrenci hesabını biz açacağız",
      classLevel: child.classLevel,
      schoolName: child.schoolName,
      examType: child.examType,
    })),
  ];
  const first = beneficiaries[0];
  return {
    account: { role: "PARENT", displayName: user.fullName || user.email, email: user.email, beneficiaries },
    defaults: {
      ...base,
      schoolName: first?.schoolName ?? "",
      classLevel: first?.classLevel ?? "",
      examType: first?.examType ?? "",
      parentFullName: user.fullName ?? "",
      parentPhone: user.phone ?? "",
      parentEmail: user.email,
    },
  };
}
