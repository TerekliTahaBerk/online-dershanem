import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";
import { sendPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().default("Test bildirimi"),
  body: z.string().default("Eğer bunu görüyorsan, push çalışıyor 🎉"),
});

/**
 * DEV / QA: cihaz kayıtlı olduktan sonra mevcut kullanıcıya test push gönderir.
 * Üretimde kapatmak için `MOBILE_TEST_PUSH_DISABLED=1`.
 */
export async function POST(req: Request) {
  if (process.env.MOBILE_TEST_PUSH_DISABLED === "1") {
    return jsonError(403, "DISABLED", "Test push devre dışı.");
  }
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, "BAD_REQUEST", "Geçersiz gövde.");

  const result = await sendPush({
    userIds: [auth.userId],
    title: parsed.data.title,
    body: parsed.data.body,
    data: { type: "TEST" },
    category: "SYSTEM",
    priority: "high",
  });

  return NextResponse.json({ data: result });
}
