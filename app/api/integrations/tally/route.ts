import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { extractTallyFields, tallyWebhookSchema, verifyTallyRef, verifyTallySignature } from "@/lib/integrations/tally";
import { notifyActiveAdmins, recordBusinessLead } from "@/lib/leads/create-lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tally webhook — kayıt sonrası iletişim formu yanıtları.
 *
 * Güvenlik:
 *  - `Tally-Signature` = base64(HMAC-SHA256(ham gövde, TALLY_SIGNING_SECRET)).
 *    Sır tanımlı değilse uç KAPALIDIR (503); imzasız istek kabul edilmez.
 *  - Kullanıcı bağlantısı yalnız imzalı `ref` gizli alanıyla kurulur
 *    (`verifyTallyRef`). URL'deki e-posta ya da isim kimlik sayılmaz.
 *  - İdempotent: `externalResponseId` tekil. Tally yeniden denerse ikinci
 *    teslim 200 döner ve yan etki üretmez.
 */
export async function POST(request: Request) {
  if (!process.env.TALLY_SIGNING_SECRET?.trim()) {
    return NextResponse.json({ error: "Entegrasyon kapalı." }, { status: 503 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 500_000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  const raw = await request.text();
  if (raw.length > 500_000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });

  if (!verifyTallySignature(raw, request.headers.get("tally-signature"))) {
    return NextResponse.json({ error: "Geçersiz imza." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }
  const parsed = tallyWebhookSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Beklenmeyen yük." }, { status: 400 });
  const payload = parsed.data;
  if (payload.eventType !== "FORM_RESPONSE") return NextResponse.json({ ok: true, ignored: true });

  const fields = extractTallyFields(payload);
  const verifiedUserId = verifyTallyRef(fields.hidden.ref);
  const user = verifiedUserId
    ? await prisma.user.findUnique({ where: { id: verifiedUserId }, select: { id: true, fullName: true, email: true, phone: true } })
    : null;

  try {
    await prisma.contactFormSubmission.create({
      data: {
        provider: "TALLY",
        externalResponseId: payload.data.responseId,
        formId: payload.data.formId ?? null,
        userId: user?.id ?? null,
        email: fields.email ?? user?.email ?? null,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw error;
  }

  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { contactFormSubmittedAt: new Date() } });
  }

  await logAudit({
    actorType: "SYSTEM",
    entityType: "ContactFormSubmission",
    entityId: payload.data.responseId,
    action: "integration.tally.response",
    summary: user ? "Tally iletişim formu dolduruldu" : "Tally yanıtı (hesap eşleşmedi)",
    payload: { userId: user?.id ?? null, formId: payload.data.formId ?? null },
  });

  try {
    await recordBusinessLead({
      source: "TALLY_FORM",
      fullName: fields.name ?? user?.fullName ?? "Tally yanıtı",
      phone: fields.phone ?? user?.phone ?? null,
      email: fields.email ?? user?.email ?? null,
      tags: ["tally", ...(fields.hidden.role ? [fields.hidden.role.toLowerCase()] : [])],
      consentMetadata: { source: "tally", responseId: payload.data.responseId },
      relatedOdUserId: user?.id ?? null,
    });
    await notifyActiveAdmins({
      title: "İletişim formu dolduruldu",
      body: `${fields.name ?? user?.fullName ?? "Bilinmeyen kişi"}${fields.phone ? ` · ${fields.phone}` : ""}`,
      href: "/panel/yonetim/basvurular",
    });
  } catch (error) {
    log.error("tally.webhook.side_effects_failed", error, { responseId: payload.data.responseId });
  }

  return NextResponse.json({ ok: true });
}
