"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

/**
 * VELİ · PAKET DEĞİŞİKLİĞİ GÖRÜŞME TALEBİ (Panel.dc.html → pAcc).
 *
 * Tasarımdaki "Görüşme talebi oluştur" düğmesi. Yeni bir model UYDURULMADI:
 * talep mevcut `LeadSubmission` kuyruğuna düşer ve admin bunu zaten
 * `/panel/yonetim/isler` ekranında görüp durumunu ilerletebilir — yani düğme
 * gerçekten iş yaratır, dekoratif değildir.
 *
 * GÜVENLİK: hangi öğrenci için talep açıldığı `resolveParentScope` üzerinden
 * doğrulanır; velinin bağlı olmadığı bir öğrenci kimliği 404 ile reddedilir.
 */
export async function requestPackageMeeting(formData: FormData) {
  const session = await requirePanelRole("PARENT");
  await enforceMutation({
    action: "parent.package.meeting",
    userId: session.userId,
    requireSameOrigin: true,
    rateLimit: { max: 5, windowMs: 60 * 60_000 },
  });

  const { studentId } = z
    .object({ studentId: z.string().min(1) })
    .parse(Object.fromEntries(formData));

  // Bağlı olmayan öğrenci kimliği burada 404 olur.
  const { selected } = await resolveParentScope(session.userId, studentId);
  if (!selected) redirect("/panel/veli/hesap?talep=hata");

  const [parent, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { fullName: true, phone: true, email: true },
    }),
    prisma.studentProfile.findUnique({
      where: { id: selected.id },
      select: { classLevel: true, targetGoal: true },
    }),
  ]);

  await prisma.leadSubmission.create({
    data: {
      fullName: parent?.fullName || parent?.email || session.email,
      // Panel kaydında telefon boş olabilir; kuyrukta görünsün diye
      // e-postaya düşülür, uydurma numara yazılmaz.
      phone: parent?.phone || session.email,
      classLevel: profile?.classLevel || "belirtilmedi",
      examType: profile?.targetGoal || "belirtilmedi",
      targetGoal: `Paket değişikliği görüşmesi · ${selected.name}`,
      currentNet: "belirtilmedi",
      kvkkConsent: true,
      source: "panel-veli-paket-degisikligi",
      submittedAt: new Date(),
    },
  });

  await logAudit({
    actorUserId: session.userId,
    entityType: "LeadSubmission",
    entityId: selected.id,
    action: "parent.package.meeting.requested",
    summary: `Veli ${selected.name} için paket görüşmesi talep etti`,
  });

  redirect("/panel/veli/hesap?talep=alindi");
}
