import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

let resend: Resend | null = null;
const sender = "Online Dershanem <noreply@onlinedershanem.com>";
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

async function send(to: string | string[], subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const recipients = Array.isArray(to) ? to : [to];
  const row = await prisma.emailOutbox.create({ data: { recipients: JSON.stringify(recipients), subject, html }, select: { id: true } }).catch(() => null);
  try {
    await client().emails.send({ from: sender, to: recipients, subject, html });
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
  await send(input.to, "Ödemeniz alındı – Online Dershanem", template("Ödemeniz başarıyla alındı", `<p>Merhaba ${escapeHtml(input.name || "")},</p><p><strong>${escapeHtml(input.packageName)}</strong> siparişiniz için ${escapeHtml(total)} tutarındaki ödeme kaydedildi.</p><p>Sipariş: ${escapeHtml(input.orderId)}</p><p>Ekibimiz gerekli bilgilendirme için sizinle iletişime geçecektir.</p>`));
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
