import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeBusinessRequest } from "@/lib/business/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
export async function GET() {
  const access = await authorizeBusinessRequest("integration:write");
  if (!access) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const accounts = await prisma.instagramAccount.findMany({ where: { businessUnitId: { in: access.units.map((unit) => unit.id) } }, select: { id: true, externalId: true, username: true, aiMode: true, isActive: true, tokenExpiresAt: true, connection: { select: { status: true, lastHealthAt: true, lastErrorCode: true } } } });
  return NextResponse.json({ accounts, secrets: { tokenConfigured: Boolean(process.env.META_INSTAGRAM_ACCESS_TOKEN), appSecretConfigured: Boolean(process.env.META_APP_SECRET), openAIConfigured: Boolean(process.env.OPENAI_API_KEY) } });
}
export async function PATCH(request: Request) {
  const access = await authorizeBusinessRequest("integration:write");
  if (!access) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const parsed = z.object({ accountId: z.string().cuid(), aiMode: z.enum(["OFF", "SUGGESTION", "AUTO_SAFE", "AUTO"]), isActive: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
  const updated = await prisma.instagramAccount.updateMany({ where: { id: parsed.data.accountId, businessUnitId: { in: access.units.map((unit) => unit.id) } }, data: { aiMode: parsed.data.aiMode, isActive: parsed.data.isActive } });
  if (!updated.count) return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });
  void logAudit({ actorUserId: access.session.userId, entityType: "InstagramAccount", entityId: parsed.data.accountId, action: "INSTAGRAM_SETTINGS_UPDATED", payload: { aiMode: parsed.data.aiMode, isActive: parsed.data.isActive } });
  return NextResponse.json({ ok: true });
}

