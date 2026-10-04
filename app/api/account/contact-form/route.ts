import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { PRODUCT_SELECTOR_PATH } from "@/lib/auth/roles";

/**
 * Tally iletişim formu durumu (kullanıcı tarafı).
 *
 * - `submitted`: gömülü formun `Tally.FormSubmitted` olayı geldi. Bu, tarayıcı
 *   beyanıdır; KESİN kayıt imzalı webhook'tur (`/api/integrations/tally`).
 *   Beyan yalnız hatırlatma bandını kapatır, başka hiçbir yetki vermez.
 * - `skipped`: "Sonra dolduracağım". Bant panelde kalmaya devam eder.
 */
const bodySchema = z.object({ action: z.enum(["submitted", "skipped"]) });

export async function POST(request: Request) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "account.contact_form",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `account:contact-form:${auth.session.userId}`,
    rateLimit: { max: 20, windowMs: 15 * 60_000 },
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "İstek okunamadı." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });

  const now = new Date();
  if (parsed.data.action === "submitted") {
    await prisma.user.updateMany({
      where: { id: auth.session.userId, contactFormSubmittedAt: null },
      data: { contactFormSubmittedAt: now },
    });
  } else {
    await prisma.user.updateMany({
      where: { id: auth.session.userId, contactFormSubmittedAt: null },
      data: { contactFormSkippedAt: now },
    });
  }

  return NextResponse.json({ redirect: PRODUCT_SELECTOR_PATH });
}
