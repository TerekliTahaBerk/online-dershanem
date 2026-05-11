"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import { publishInboxBroadcast } from "@/lib/inbox";
import { auditLog } from "@/lib/audit";

const BroadcastSchema = z.object({
  title: z.string().trim().min(2, "Başlık en az 2 karakter").max(160),
  body: z.string().trim().min(2, "İçerik en az 2 karakter").max(2000),
  audience: z.enum(["ALL_STUDENTS", "ALL_TEACHERS", "ALL_PARENTS", "ALL_USERS"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  href: z.string().trim().max(500).optional().or(z.literal("")),
});

export type BroadcastResult =
  | { ok: true; recipients: number }
  | { ok: false; error: string };

export async function sendBroadcast(formData: FormData): Promise<BroadcastResult> {
  const session = await getServerAuthSession();
  if (!session || !getPanelAccess(session.user).hasAdminPanel) {
    redirect("/giris");
  }

  const parsed = BroadcastSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
    priority: formData.get("priority") || "NORMAL",
    href: formData.get("href") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const { audience, title, body, priority, href } = parsed.data;

  // Hedef kitleyi User.role üzerinden filtrele
  const where =
    audience === "ALL_STUDENTS" ? { role: "STUDENT" as const } :
    audience === "ALL_TEACHERS" ? { role: "TEACHER" as const } :
    audience === "ALL_PARENTS" ? { role: "PARENT" as const } :
    {};

  const users = await prisma.user.findMany({
    where: { ...where, passwordHash: { not: null } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const result = await publishInboxBroadcast(userIds, {
    category: "ANNOUNCEMENT",
    priority,
    title,
    body,
    href: href || undefined,
    createdById: session.user!.id,
  });

  await auditLog({
    actorUserId: session.user!.id,
    action: "INBOX_BROADCAST",
    entityType: "InboxMessage",
    entityId: "broadcast",
    summary: `Duyuru gönderildi: ${audience} (${userIds.length} alıcı)`,
    payload: { audience, recipients: userIds.length, title, priority },
  });

  revalidatePath("/admin/inbox");

  return { ok: true, recipients: result.count ?? userIds.length };
}
