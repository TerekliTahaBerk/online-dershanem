import { z } from "zod";
import { authorizeBusinessRequest } from "@/lib/business/permissions";
import { prisma } from "@/lib/prisma";
import { queueAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { BUSINESS_INTEGRATION_API_PERMISSIONS } from "@/lib/business/permission-matrix";
import { API_ERROR_CODES, apiError, apiSuccess } from "@/lib/api/response";
export async function GET() {
  const access = await authorizeBusinessRequest(BUSINESS_INTEGRATION_API_PERMISSIONS.instagramStatus);
  if (!access) return apiError(401, API_ERROR_CODES.UNAUTHORIZED, "Yetkisiz.");
  const accounts = await prisma.instagramAccount.findMany({ where: { businessUnitId: { in: access.units.map((unit) => unit.id) } }, select: { id: true, externalId: true, username: true, aiMode: true, isActive: true, tokenExpiresAt: true, connection: { select: { status: true, lastHealthAt: true, lastErrorCode: true } } } });
  return apiSuccess({ accounts, secrets: { tokenConfigured: Boolean(process.env.META_INSTAGRAM_ACCESS_TOKEN), appSecretConfigured: Boolean(process.env.META_APP_SECRET), openAIConfigured: Boolean(process.env.OPENAI_API_KEY) } });
}
export async function PATCH(request: Request) {
  const access = await authorizeBusinessRequest(BUSINESS_INTEGRATION_API_PERMISSIONS.instagramSettings);
  if (!access) return apiError(401, API_ERROR_CODES.UNAUTHORIZED, "Yetkisiz.");
  const guard = await guardMutation({ action: "business.instagram.settings", userId: access.session.userId, headers: request.headers, requireSameOrigin: true, rateLimit: { max: 30, windowMs: 60_000 } });
  if (!guard.ok) return apiError(guard.code === "ORIGIN" ? 403 : 429, guard.code === "ORIGIN" ? API_ERROR_CODES.FORBIDDEN : API_ERROR_CODES.RATE_LIMITED, guard.message);
  const parsed = z.object({ accountId: z.string().cuid(), aiMode: z.enum(["OFF", "SUGGESTION", "AUTO_SAFE", "AUTO"]), isActive: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, API_ERROR_CODES.VALIDATION_ERROR, "Geçersiz veri.");
  const updated = await prisma.instagramAccount.updateMany({ where: { id: parsed.data.accountId, businessUnitId: { in: access.units.map((unit) => unit.id) } }, data: { aiMode: parsed.data.aiMode, isActive: parsed.data.isActive } });
  if (!updated.count) return apiError(404, API_ERROR_CODES.NOT_FOUND, "Hesap bulunamadı.");
  queueAudit({ actorUserId: access.session.userId, entityType: "InstagramAccount", entityId: parsed.data.accountId, action: "INSTAGRAM_SETTINGS_UPDATED", payload: { aiMode: parsed.data.aiMode, isActive: parsed.data.isActive } });
  return apiSuccess({ ok: true });
}
