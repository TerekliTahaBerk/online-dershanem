import { Resend } from "resend";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { materializePasswordResetEmailHtml, passwordResetUrlMarker } from "@/lib/auth/password-reset";
import { ACCOUNT_CLAIM_TTL_MS, accountClaimUrlMarker, materializeAccountClaimEmailHtml } from "@/lib/od/account-claim";

let resend: Resend | null = null;
const sender = process.env.MAIL_FROM || "Online Dershanem <noreply@onlinedershanem.com>";
const emailMode = process.env.EMAIL_MODE || "receipts";

function client(): Resend {
  resend ??= new Resend(process.env.RESEND_API_KEY || "re_missing");
  return resend;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function template(title: string, body: string): string {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#f2f2ef;font-family:Arial,sans-serif"><div style="max-width:600px;margin:32px auto;background:#fff;padding:32px;border-radius:14px"><h1 style="color:#091413;font-size:24px">${title}</h1>${body}<p style="margin-top:32px;color:#777;font-size:12px">Online Dershanem · destek@onlinedershanem.com</p></div></body></html>`;
}

/**
 * Outbox HTML'indeki gizli-değer işaretlerini teslimden hemen ÖNCE gerçek
 * bağlantıya çevirir. Tek yerde durur ki yeni bir işaret türü eklendiğinde
 * cron ile anlık gönderim yolu birbirinden ayrışmasın.
 */
export function materializeOutboxHtml(html: string): string {
  return materializeAccountClaimEmailHtml(materializePasswordResetEmailHtml(html));
}

async function send(to: string | string[], subject: string, html: string): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  const row = await prisma.emailOutbox.create({ data: { recipients: JSON.stringify(recipients), subject, html }, select: { id: true } }).catch(() => null);
  // Makbuz önce outbox'a yazılır. Resend geçici olarak kapalıysa PENDING kayıt
  // cron tarafından anahtar yeniden sağlandığında gönderilebilir.
  if (!process.env.RESEND_API_KEY) return;
  try {
    await client().emails.send({ from: sender, to: recipients, subject, html: materializeOutboxHtml(html) });
    if (row) await prisma.emailOutbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date() } });
  } catch (error) {
    if (row) await prisma.emailOutbox.update({ where: { id: row.id }, data: { status: "FAILED", attempts: 1, lastError: String(error).slice(0, 500), nextRetryAt: new Date(Date.now() + 60_000) } }).catch(() => undefined);
    // Gönderim hatası ödeme/lead iş akışını bozmamalı. Kayıt outbox'ta kaldığı
    // için cron yeniden dener; hata ayrıca Vercel loglarında görünür.
    console.error("[email] send failed; queued for retry", { subject, error });
  }
}

function notificationRecipients(): string[] {
  return (process.env.LEAD_NOTIFICATION_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",").map((value) => value.trim()).filter(Boolean);
}

export async function sendLeadSubmissionNotification(input: {
  fullName: string; phone: string; classLevel: string; examType: string; targetGoal: string;
  currentNet: string; parentPhone?: string | null; source: string; submittedAt: Date;
}): Promise<void> {
  if (emailMode !== "all") return;
  const recipients = notificationRecipients();
  if (!recipients.length) return;
  const rows = [
    ["Ad Soyad", input.fullName], ["Telefon", input.phone], ["Sınıf", input.classLevel],
    ["Sınav", input.examType], ["Hedef", input.targetGoal], ["Net", input.currentNet],
    ["Veli Telefonu", input.parentPhone || "—"], ["Kaynak", input.source],
  ].map(([key, value]) => `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</p>`).join("");
  await send(recipients, `Yeni Form Başvurusu – ${input.fullName}`, template("Yeni Form Başvurusu", rows));
}

export async function sendOrderPaidUserEmail(input: {
  to: string; name?: string | null; service: "OD" | "ODK"; orderId: string;
  packageName: string; totalCents: number;
}): Promise<void> {
  const total = (input.totalCents / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
  await send(input.to, "Ödemeniz alındı – Online Dershanem", template("Ödemeniz başarıyla alındı", `<p>Merhaba ${escapeHtml(input.name || "")},</p><p><strong>${escapeHtml(input.packageName)}</strong> siparişiniz için ${escapeHtml(total)} tutarındaki ödeme kaydedildi.</p><p>Sipariş: ${escapeHtml(input.orderId)}</p><p>Hesabınızı kurmanız için ayrı bir davet e-postası gönderiyoruz; oradaki bağlantıdan kendi parolanızı belirleyebilirsiniz.</p>`));
}

export async function sendOrderPaidAdminEmail(input: {
  service: "OD" | "ODK"; orderId: string; packageName: string; totalCents: number;
  buyer: Record<string, string | null | undefined>;
}): Promise<void> {
  if (emailMode !== "all") return;
  const recipients = notificationRecipients();
  if (!recipients.length) return;
  const total = (input.totalCents / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
  await send(recipients, `[${input.service}] Yeni satış – ${input.buyer.fullName || "Müşteri"}`, template("Yeni Satış", `<p><strong>Sipariş:</strong> ${escapeHtml(input.orderId)}</p><p><strong>Paket:</strong> ${escapeHtml(input.packageName)}</p><p><strong>Tutar:</strong> ${escapeHtml(total)}</p><p><strong>Müşteri:</strong> ${escapeHtml(input.buyer.fullName || "—")}</p><p><strong>E-posta:</strong> ${escapeHtml(input.buyer.email || "—")}</p><p><strong>Telefon:</strong> ${escapeHtml(input.buyer.phone || "—")}</p>`));
}

export async function sendPanelNotificationEmail(input: {
  to: string;
  name?: string | null;
  title: string;
  body: string;
  href?: string | null;
}): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.onlinedershanem.com").replace(/\/$/, "");
  const href = input.href?.startsWith("/") ? `${baseUrl}${input.href}` : input.href;
  const action = href
    ? `<p style="margin-top:24px"><a href="${escapeHtml(href)}" style="display:inline-block;background:#3a4a2c;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Panelde görüntüle</a></p>`
    : "";
  await send(
    input.to,
    `${input.title} – Online Dershanem`,
    template(
      input.title,
      `<p>Merhaba ${escapeHtml(input.name || "")},</p><p style="line-height:1.6">${escapeHtml(input.body)}</p>${action}<p style="margin-top:24px;color:#666;font-size:13px">Bildirim tercihlerinizi paneldeki Bildirim Merkezi'nden değiştirebilirsiniz.</p>`,
    ),
  );
}

/**
 * Persist a reset message for the retry worker. The credential itself is not
 * persisted: the HTML contains only a non-secret record id marker. The worker
 * derives the HMAC proof in memory immediately before handing the mail to
 * Resend, so database/outbox dumps never contain a usable reset token.
 */
export async function queuePasswordResetEmail(input: {
  to: string;
  name?: string | null;
  tokenId: string;
  expiresInMinutes: number;
}, db: Pick<Prisma.TransactionClient, "emailOutbox"> = prisma): Promise<void> {
  const resetUrl = passwordResetUrlMarker(input.tokenId);
  const html = template(
    "Parolanızı yenileyin",
    `<p>Merhaba ${escapeHtml(input.name || "")},</p><p>Online Dershanem hesabınız için parola yenileme isteği aldık.</p><p style="margin-top:24px"><a href="${resetUrl}" style="display:inline-block;background:#3a4a2c;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Yeni parola belirle</a></p><p style="line-height:1.6">Bu bağlantı ${input.expiresInMinutes} dakika geçerlidir ve yalnızca bir kez kullanılabilir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz.</p>`,
  );
  await db.emailOutbox.create({
    data: {
      recipients: JSON.stringify([input.to]),
      subject: "Parolanızı yenileyin – Online Dershanem",
      html,
    },
  });
}


/**
 * Hesap devralma daveti.
 *
 * `queuePasswordResetEmail` ile aynı gizlilik kuralı: HTML'e gizli değer
 * DEĞİL, yalnız kayıt kimliği işareti yazılır. Gerçek bağlantı teslimden hemen
 * önce bellekte üretilir (`materializeOutboxHtml`), böylece veritabanı ya da
 * outbox dökümü kullanılabilir bir davet içermez.
 *
 * Anlık gönderim DENENİR ama başarısızlığı çağıranı etkilemez: satır outbox'ta
 * kaldığı için `email-retry` cron'u yeniden dener. Ödeme akışı bir e-posta
 * hatası yüzünden bozulmaz.
 */
export async function queueAccountClaimEmail(input: {
  to: string;
  name?: string | null;
  tokenId: string;
  audience: "STUDENT" | "PARENT";
  /** Hatırlatma gönderimlerinde konu ve metin değişir. */
  reminder?: boolean;
}, db: Pick<Prisma.TransactionClient, "emailOutbox"> = prisma): Promise<void> {
  const claimUrl = accountClaimUrlMarker(input.tokenId);
  const days = Math.round(ACCOUNT_CLAIM_TTL_MS / 86_400_000);
  const intro = input.audience === "PARENT"
    ? "Veli hesabınız hazır. Aşağıdaki bağlantıdan parolanızı belirleyip çocuğunuzun bağlantısını onaylayabilirsiniz."
    : "Öğrenci hesabınız hazır. Aşağıdaki bağlantıdan kendi parolanızı belirleyebilirsiniz.";
  const title = input.reminder ? "Hesabınız sizi bekliyor" : "Hesabınızı kurun";
  const nudge = input.reminder
    ? "<p style=\"line-height:1.6\">Daha önce gönderdiğimiz davet henüz kullanılmadı. Bir sorun yaşıyorsanız bu e-postayı yanıtlamanız yeterli.</p>"
    : "";
  const html = template(
    title,
    `<p>Merhaba ${escapeHtml(input.name || "")},</p><p style="line-height:1.6">${intro}</p>${nudge}<p style="margin-top:24px"><a href="${claimUrl}" style="display:inline-block;background:#3a4a2c;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Hesabımı kur</a></p><p style="line-height:1.6">Bu bağlantı ${days} gün geçerlidir ve yalnızca bir kez kullanılabilir. Kurulum bir dakikadan kısa sürer.</p>`,
  );
  const subject = `${title} – Online Dershanem`;
  const row = await db.emailOutbox.create({
    data: { recipients: JSON.stringify([input.to]), subject, html },
    select: { id: true },
  });

  // Transaction içindeyken anlık gönderim denenmez: commit olmayabilir ve
  // gönderilmiş bir davet geri alınamaz. Cron 15 dakika içinde teslim eder.
  if (db !== prisma || !process.env.RESEND_API_KEY) return;
  try {
    await client().emails.send({ from: sender, to: [input.to], subject, html: materializeOutboxHtml(html) });
    await prisma.emailOutbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date() } });
  } catch (error) {
    await prisma.emailOutbox
      .update({ where: { id: row.id }, data: { status: "FAILED", attempts: 1, lastError: String(error).slice(0, 500), nextRetryAt: new Date(Date.now() + 60_000) } })
      .catch(() => undefined);
    console.error("[email] account claim send failed; queued for retry", { error });
  }
}
