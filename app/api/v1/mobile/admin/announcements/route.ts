import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";
import { notifyUser } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(5000),
  href: z.string().url().optional(),
  audience: z.enum(["ALL", "STUDENTS", "TEACHERS", "PARENTS"]).default("ALL"),
});

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") return jsonError(403, "FORBIDDEN", "Yetkisiz.");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "BAD_REQUEST", "Geçersiz gövde.");

  const where = parsed.data.audience === "ALL"
    ? {}
    : parsed.data.audience === "STUDENTS" ? { role: "STUDENT" as const }
    : parsed.data.audience === "TEACHERS" ? { role: "TEACHER" as const }
    : { role: "PARENT" as const };

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
    take: 5000,
  });

  // Fan-out (paralel limit yok — Promise.all tüm kullanıcılar için tetiklenir;
  // Pusher + Push push.ts içinde batch'lenir).
  let sent = 0;
  for (const u of users) {
    try {
      await notifyUser({
        userId: u.id,
        title: parsed.data.title,
        body: parsed.data.body,
        href: parsed.data.href ?? null,
        type: "ANNOUNCEMENT",
        priority: "HIGH",
      });
      sent += 1;
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ data: { audience: parsed.data.audience, sent } });
}
