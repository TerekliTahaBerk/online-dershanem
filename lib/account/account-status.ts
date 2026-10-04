import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeProfileCompletion, type ProfileCompletion } from "@/lib/account/profile-completion";

/**
 * Hesap durumu: profil tamamlama oranı + Tally iletişim formu durumu.
 * Panel bandı, ürün seçici ve ayarlar başlığı aynı kaynaktan okur.
 */
export type AccountStatus = {
  completion: ProfileCompletion;
  contactFormSubmitted: boolean;
  contactFormSkipped: boolean;
  registrationSource: "ADMIN_INVITE" | "SELF_SIGNUP" | "PURCHASE";
};

export async function loadAccountStatus(userId: string, role: UserRole): Promise<AccountStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      phone: true,
      kvkkAcceptedAt: true,
      contactFormSubmittedAt: true,
      contactFormSkippedAt: true,
      profileCompletedAt: true,
      registrationSource: true,
      signupProfile: { select: { city: true, district: true, relationship: true } },
      studentProfile: { select: { classLevel: true, examType: true, schoolName: true, birthDate: true } },
      _count: { select: { parentStudents: { where: { active: true } }, pendingChildren: { where: { status: "PENDING" } } } },
    },
  });
  if (!user) return null;

  const completion = computeProfileCompletion({
    role,
    fullName: user.fullName,
    phone: user.phone,
    kvkkAcceptedAt: user.kvkkAcceptedAt,
    city: user.signupProfile?.city ?? null,
    district: user.signupProfile?.district ?? null,
    student: user.studentProfile,
    parent: { relationship: user.signupProfile?.relationship ?? null, childCount: user._count.parentStudents + user._count.pendingChildren },
  });

  // İlk tamamlanma anı bir kez yazılır (raporlama için); sonradan alan
  // silinirse geri alınmaz — yüzde zaten canlı hesaplanıyor.
  if (completion.complete && !user.profileCompletedAt) {
    await prisma.user.updateMany({ where: { id: userId, profileCompletedAt: null }, data: { profileCompletedAt: new Date() } });
  }

  return {
    completion,
    contactFormSubmitted: Boolean(user.contactFormSubmittedAt),
    contactFormSkipped: Boolean(user.contactFormSkippedAt),
    registrationSource: user.registrationSource,
  };
}
