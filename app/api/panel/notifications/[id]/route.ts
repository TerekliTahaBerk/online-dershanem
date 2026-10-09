import { NextResponse } from "next/server";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { prisma } from "@/lib/prisma";

/**
 * Tek bildirim (M5 push dokunuşu). Push yükü yalnız opak `notificationId`
 * taşır; uygulama hedefi BURADAN, kimlikli ve sahiplik kontrollü okur.
 * Başka kullanıcının veya gizli (`inAppVisible=false`) bildirimi 404.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const item = await prisma.notification.findFirst({
    where: { id: params.data.id, userId: auth.session.userId, inAppVisible: true },
    select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
  });
  if (!item) return NextResponse.json({ error: "Bildirim bulunamadı." }, { status: 404 });
  return NextResponse.json(
    { id: item.id, type: item.type, title: item.title, body: item.body, href: item.href, read: Boolean(item.readAt), createdAt: item.createdAt },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
