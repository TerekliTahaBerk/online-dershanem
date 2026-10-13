"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requirePanelRole } from "@/lib/auth/guards";
import { CommandError } from "@/lib/panel/command-receipt";
import { requestParentPackageMeeting } from "@/lib/panel/parent-package-meeting";
import { enforceMutation } from "@/lib/security/mutation-guard";

/**
 * VELİ · PAKET DEĞİŞİKLİĞİ GÖRÜŞME TALEBİ (Panel.dc.html → pAcc).
 *
 * Kural mobil uçla ORTAKTIR (`lib/panel/parent-package-meeting.ts`): talep
 * `LeadSubmission` kuyruğuna düşer; velinin bağlı olmadığı öğrenci 404.
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

  try {
    await requestParentPackageMeeting(session, studentId);
  } catch (error) {
    // Bağlı olmayan öğrenci kimliği 404 olur.
    if (error instanceof CommandError && error.status === 404) notFound();
    if (error instanceof CommandError) redirect("/panel/veli/hesap?talep=hata");
    throw error;
  }

  redirect("/panel/veli/hesap?talep=alindi");
}
