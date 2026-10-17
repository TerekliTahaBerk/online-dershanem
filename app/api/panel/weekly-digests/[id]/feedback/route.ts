import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAccountRole, requireApiAnyProductRole, requireApiProductPilot } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { listParentVisibleChildren } from "@/lib/panel/parent-product-policy";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";

const schema = z.object({ helpful: z.boolean().nullable(), anxietyPulse: z.number().int().min(1).max(5).nullable() }).strict().refine((value) => value.helpful !== null || value.anxietyPulse !== null);
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_NO_STORE });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const account = await requireApiAccountRole("STUDENT", "PARENT");
  if (!account.ok) return account.response;
  // Veli erişimi kendi üyeliğinden değil, talebin hedefindeki çocuğun ürün ve ilişkisinden gelir.
  const auth = account.session.role === "PARENT" ? await requireApiProductPilot(account, "OD") : await requireApiAnyProductRole(["OD", "OK"], "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return json({ error: "Haftalık özet şu an kullanıma kapalı, çok yakında açılacak.", code: "FEATURE_DISABLED" }, 404);
  const guard = await guardMutation({ action: "panel.weekly_digest.feedback", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:digest-feedback:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return json({ error: guard.message }, guard.code === "RATE_LIMIT" ? 429 : 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Lütfen geri bildirimi bir kez daha kontrol eder misiniz?" }, 400);
  const { id } = await context.params;
  const children = auth.session.role === "PARENT" ? (await listParentVisibleChildren(auth.session.userId, "academic")).filter((child) => child.products.some((product) => product === "OD" || product === "OK")) : [];
  const digest = await prisma.weeklyDigest.findFirst({
    where: { id, status: "PUBLISHED", ...(auth.session.role === "STUDENT" ? { student: { userId: auth.session.userId } } : { studentId: { in: children.map((child) => child.id) } }) }, select: { id: true },
  });
  if (!digest) return json({ error: "Özet bulunamadı; kaldırılmış ya da değişmiş olabilir." }, 404);
  const viewerRole = auth.session.role === "STUDENT" ? "STUDENT" as const : "PARENT" as const;
  await prisma.weeklyDigestFeedback.upsert({ where: { digestId_userId: { digestId: id, userId: auth.session.userId } }, create: { digestId: id, userId: auth.session.userId, viewerRole, ...parsed.data }, update: parsed.data });
  await recordPanelProductEvent({ name: "weekly_digest_feedback", properties: { actorRole: viewerRole, ...parsed.data } }, auth.session.role);
  return json({ saved: true });
}
