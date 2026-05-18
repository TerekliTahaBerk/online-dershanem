import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "re_missing");
  }
  return _resend;
}
const FROM = "Online Dershanem <noreply@onlinedershanem.com>";
const APP_URL = (process.env.NEXTAUTH_URL || "https://onlinedershanem.com").replace(/\/$/, "");

// ─── Base template wrapper ───────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Online Dershanem</title>
</head>
<body style="margin:0;padding:0;background:#F2F2EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2EF;padding:44px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#091413;border-radius:16px 16px 0 0;padding:22px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#ffffff;font-size:19px;font-weight:800;letter-spacing:-0.4px;">Online Dershanem</span>
                </td>
                <td align="right">
                  <a href="https://onlinedershanem.com" style="color:#546B41;font-size:12px;font-weight:500;text-decoration:none;">onlinedershanem.com</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Accent bar -->
        <tr>
          <td style="background:#546B41;height:3px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="background:#ffffff;padding:40px 32px;border-left:1px solid #E5E5E0;border-right:1px solid #E5E5E0;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F4F4F0;border-radius:0 0 16px 16px;border:1px solid #E5E5E0;border-top:none;padding:22px 32px;">
            <p style="margin:0 0 6px;font-size:12px;color:#76777A;line-height:1.7;">
              Bu e-posta <strong style="color:#444647;">Online Dershanem</strong> tarafından otomatik olarak gönderilmiştir.<br/>
              Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.
            </p>
            <p style="margin:10px 0 0;font-size:11px;color:#A8A9AC;">
              © 2026 Online Dershanem &nbsp;·&nbsp; Bir <a href="https://yula.co" style="color:#A8A9AC;text-decoration:underline;font-weight:500;">yula.co</a> markasıdır.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function heading(text: string): string {
  return `<h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#091413;letter-spacing:-0.4px;line-height:1.2;">${text}</h1>`;
}

function subheading(text: string): string {
  return `<h2 style="margin:28px 0 10px;font-size:14px;font-weight:700;color:#091413;text-transform:uppercase;letter-spacing:0.08em;">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-size:14px;line-height:1.75;color:#444647;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #EBEBE7;margin:28px 0;" />`;
}

function bulletList(items: string[]): string {
  const rows = items.map(
    (item) =>
      `<tr>
        <td style="padding:5px 0;vertical-align:top;width:20px;">
          <span style="color:#546B41;font-size:14px;font-weight:700;">·</span>
        </td>
        <td style="padding:5px 0 5px 8px;font-size:14px;line-height:1.6;color:#444647;">${item}</td>
      </tr>`
  ).join("");
  return `<table cellpadding="0" cellspacing="0" style="margin:12px 0 20px;">${rows}</table>`;
}

function signature(name = "Online Dershanem Ekibi"): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:32px;">
    <tr>
      <td style="border-left:3px solid #546B41;padding:4px 14px;">
        <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#091413;">Sevgiyle,</p>
        <p style="margin:0;font-size:13px;color:#6b6560;">${name}</p>
      </td>
    </tr>
  </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function infoBox(rows: { label: string; value: string }[]): string {
  const items = rows
    .map(
      ({ label, value }) =>
        `<tr>
          <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#6b6560;white-space:nowrap;width:1%;text-transform:uppercase;letter-spacing:0.05em;">${label}</td>
          <td style="padding:9px 14px;font-size:13px;color:#091413;font-weight:500;">${value}</td>
        </tr>`
    )
    .join('<tr><td colspan="2" style="padding:0 14px;"><hr style="border:none;border-top:1px solid #EBEBE7;margin:0;" /></td></tr>');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;border:1px solid #e7e5e0;border-radius:10px;margin:18px 0;overflow:hidden;">${items}</table>`;
}

function ctaButton(text: string, href: string): string {
  return `<div style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#546B41;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:9px;letter-spacing:0.1px;">${text}</a>
  </div>`;
}

function noteBox(text: string): string {
  return `<div style="background:#f0fdf8;border:1px solid #a7f3d0;border-radius:10px;padding:14px 18px;margin:18px 0;">
    <p style="margin:0;font-size:13px;color:#065f46;line-height:1.6;"><strong>Ders Notu:</strong> ${text}</p>
  </div>`;
}

function credentialBox(email: string, password: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#091413;border-radius:10px;margin:18px 0;overflow:hidden;">
    <tr>
      <td style="padding:16px 18px 6px;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6ee7b7;">Giriş Bilgileriniz</p>
      </td>
    </tr>
    <tr>
      <td style="padding:6px 18px;">
        <p style="margin:0;font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.06em;">E-posta</p>
        <p style="margin:3px 0 12px;font-size:14px;font-weight:600;color:#ffffff;">${email}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:6px 18px 16px;">
        <p style="margin:0;font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.06em;">Şifre</p>
        <p style="margin:3px 0;font-size:15px;font-weight:700;color:#6ee7b7;font-family:monospace;letter-spacing:0.05em;">${password}</p>
      </td>
    </tr>
  </table>`;
}

// ─── Low-level sender ────────────────────────────────────────────────────────

// Maximum number of outbox-level delivery attempts before abandoning.
const MAX_OUTBOX_ATTEMPTS = 10;

/**
 * Attempt delivery via Resend with up to 3 in-process retries (exponential
 * backoff: immediate → 1 s → 4 s). Returns true on success.
 * Throws on permanent 4xx failures; re-throws last error after all retries exhausted.
 */
async function attemptResendDelivery(
  to: string | string[],
  subject: string,
  html: string,
): Promise<void> {
  const MAX_IN_PROCESS = 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_IN_PROCESS; attempt++) {
    try {
      await getResend().emails.send({ from: FROM, to, subject, html });
      return; // success
    } catch (err) {
      lastErr = err;
      // Don't retry on client errors (bad API key, invalid address, etc.)
      const status = (err as { statusCode?: number })?.statusCode;
      if (status && status >= 400 && status < 500) {
        console.error("[email] permanent failure, not retrying:", err);
        throw err;
      }
      if (attempt < MAX_IN_PROCESS - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(4, attempt))); // 1s, 4s
      }
    }
  }
  console.error(`[email] send failed after ${MAX_IN_PROCESS} in-process attempts:`, lastErr);
  throw lastErr;
}

/**
 * P1: DB-outbox email sender.
 *
 * Flow:
 *   1. Write an EmailOutbox row (PENDING) — guarantees at-least-once delivery
 *      even if the serverless function is killed after this point.
 *   2. Attempt delivery via Resend (with in-process retries).
 *   3. On success: mark the row SENT.
 *   4. On failure: mark FAILED + schedule a next retry; the /api/cron/email-retry
 *      route will pick it up later.
 *
 * If the DB write itself fails we fall back to a direct send (no outbox guarantee).
 */
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) return; // silently skip in dev if key not set

  const recipients = Array.isArray(to) ? to : [to];

  // 1. Write to outbox — fire-and-forget on DB error so email is never blocked
  let outboxId: string | null = null;
  try {
    const entry = await prisma.emailOutbox.create({
      data: { recipients: JSON.stringify(recipients), subject, html },
      select: { id: true },
    });
    outboxId = entry.id;
  } catch (dbErr) {
    console.error("[email] outbox write failed, attempting direct send:", dbErr);
  }

  // 2. Attempt delivery
  try {
    await attemptResendDelivery(recipients, subject, html);
    // 3. Mark sent
    if (outboxId) {
      prisma.emailOutbox
        .update({ where: { id: outboxId }, data: { status: "SENT", sentAt: new Date() } })
        .catch((e) => console.error("[email] outbox SENT update failed:", e));
    }
  } catch (err) {
    // 4. Mark failed — schedule retry with exponential backoff
    if (outboxId) {
      const attempts = 1; // this was the first outbox-level attempt
      const nextRetryAt = new Date(Date.now() + Math.min(60_000 * Math.pow(2, attempts), 3_600_000));
      prisma.emailOutbox
        .update({
          where: { id: outboxId },
          data: {
            status: attempts >= MAX_OUTBOX_ATTEMPTS ? "ABANDONED" : "FAILED",
            attempts,
            lastError: String(err).slice(0, 500),
            nextRetryAt: attempts >= MAX_OUTBOX_ATTEMPTS ? null : nextRetryAt,
          },
        })
        .catch((e) => console.error("[email] outbox FAILED update failed:", e));
    }
    throw err;
  }
}

function getLeadNotificationRecipients(): string[] {
  const raw = process.env.LEAD_NOTIFICATION_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// ─── Email functions ─────────────────────────────────────────────────────────

/** Sent to self-registered students after completing registration */
export async function sendSelfRegistrationWelcome({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const firstName = name.split(" ")[0];

  const html = baseTemplate(`
    ${heading(`Hoş geldin, ${firstName}! 🎉`)}
    ${paragraph(`<strong>${name}</strong>, Online Dershanem ailesine katıldığın için gerçekten çok mutluyuz. Bu adımı atmak kolay değil — ve bunu yaptığın için seni tebrik ediyoruz.`)}
    ${paragraph("Bundan böyle hedeflerine ulaşmak için ihtiyacın olan her şey bir tık uzağında. Deneyimli öğretmenlerimiz, sana özel ders planları ve sürekli güncellenen içeriklerimizle bu yolculukta her adımda yanındayız.")}
    ${divider()}
    ${subheading("Seni neler bekliyor?")}
    ${bulletList([
      "<strong>Bire bir online dersler</strong> — Alanında uzman öğretmenlerle, kendi programına göre.",
      "<strong>Kişiselleştirilmiş takip</strong> — Her dersin ardından notlar ve ilerleme özeti.",
      "<strong>Esnek çalışma özgürlüğü</strong> — İstediğin saatten, istediğin yerden.",
      "<strong>7/24 destek</strong> — Sorularında her zaman buradayız.",
    ])}
    ${divider()}
    ${paragraph("Hesabın hazır. Paneline giriş yaparak öğretmenlerinle tanışabilir, ders programını inceleyebilir ve ilk adımını atabilirsin.")}
    ${ctaButton("Panelime Giriş Yap →", `${APP_URL}/giris`)}
    ${paragraph('<span style="font-size:13px;color:#9c9589;">Herhangi bir sorun yaşarsan <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize ulaşabilirsin. Seni duymaktan her zaman mutluluk duyarız.</span>')}
    ${signature()}
  `);

  await sendEmail({
    to,
    subject: `Hoş geldin, ${firstName}! Online Dershanem'e kaydın tamamlandı.`,
    html,
  });
}

/** Sent when admin creates a student panel account */
export async function sendStudentWelcome({
  to,
  name,
  email,
  password,
}: {
  to: string;
  name: string;
  email: string;
  password: string;
}) {
  const firstName = name.split(" ")[0];

  const html = baseTemplate(`
    ${heading(`Hoş geldin, ${firstName}! 🎓`)}
    ${paragraph(`Merhaba <strong>${name}</strong>, Online Dershanem öğrenci paneliniz hazırlandı. Aşağıdaki giriş bilgilerinizi kullanarak platforma erişebilirsiniz.`)}
    ${credentialBox(email, password)}
    ${paragraph("Panele giriş yaptıktan sonra ders programınızı inceleyebilir, öğretmeninizle iletişime geçebilir ve tüm ders materyallerinize ulaşabilirsiniz.")}
    ${ctaButton("Panelime Giriş Yap →", `${APP_URL}/giris`)}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Güvenliğiniz için giriş yaptıktan sonra şifrenizi <a href="' + APP_URL + '/panel/profil" style="color:#546B41;text-decoration:none;">Profil sayfanızdan</a> değiştirmenizi öneririz.</span>')}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Herhangi bir sorunuz olursa <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize yazabilirsiniz.</span>')}
    ${signature()}
  `);

  await sendEmail({
    to,
    subject: `Hoş geldin, ${firstName}! Öğrenci paneliniz hazır.`,
    html,
  });
}

/** Sent when admin creates a teacher panel account */
export async function sendTeacherWelcome({
  to,
  name,
  email,
  password,
}: {
  to: string;
  name: string;
  email: string;
  password: string;
}) {
  const firstName = name.split(" ")[0];

  const html = baseTemplate(`
    ${heading(`Merhaba, ${firstName}! 👋`)}
    ${paragraph(`<strong>${name}</strong>, Online Dershanem öğretmen paneliniz oluşturuldu. Platforma aşağıdaki bilgilerle giriş yapabilirsiniz.`)}
    ${credentialBox(email, password)}
    ${paragraph("Panele giriş yaptıktan sonra size atanan öğrencileri görebilir, ders notlarınızı ekleyebilir ve ders programınızı yönetebilirsiniz.")}
    ${ctaButton("Panelime Giriş Yap →", `${APP_URL}/giris`)}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Güvenliğiniz için giriş yaptıktan sonra şifrenizi <a href="' + APP_URL + '/panel/profil" style="color:#546B41;text-decoration:none;">Profil sayfanızdan</a> değiştirmenizi öneririz.</span>')}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Herhangi bir sorunuz olursa <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize yazabilirsiniz.</span>')}
    ${signature()}
  `);

  await sendEmail({
    to,
    subject: `Hoş geldiniz, ${firstName}! Öğretmen paneliniz hazır.`,
    html,
  });
}

/** Sent to student + teacher when a lesson is scheduled */
export async function sendLessonScheduled({
  studentEmail,
  studentName,
  teacherEmail,
  teacherName,
  scheduledAt,
  duration,
  googleMeetLink,
  packageName,
}: {
  studentEmail: string | null | undefined;
  studentName: string;
  teacherEmail: string | null | undefined;
  teacherName: string;
  scheduledAt: Date;
  duration: number;
  googleMeetLink: string | null | undefined;
  packageName: string | null | undefined;
}) {
  const dateStr = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(new Date(scheduledAt));

  const rows = [
    { label: "Tarih", value: dateStr },
    { label: "Süre", value: `${duration} dakika` },
    ...(teacherName ? [{ label: "Öğretmen", value: teacherName }] : []),
    ...(packageName ? [{ label: "Paket", value: packageName }] : []),
  ];

  // To student
  if (studentEmail) {
    const html = baseTemplate(`
      ${heading("Yeni Ders Planlandı 📅")}
      ${paragraph(`Merhaba <strong>${studentName}</strong>, harika bir haber! Yeni bir dersiniz planlandı ve sizi bekliyoruz.`)}
      ${infoBox(rows)}
      ${googleMeetLink
        ? `${paragraph("Derse katılmak için aşağıdaki butona tıklayabilirsiniz. Ders saatinden birkaç dakika önce bağlanmaya hazır olmanızı öneririz.")}${ctaButton("Google Meet ile Derse Katıl →", googleMeetLink)}`
        : paragraph('<span style="font-size:13px;color:#9c9589;">Google Meet bağlantısı eklenir eklemez size ayrıca bildirim gönderilecektir.</span>')
      }
      ${divider()}
      ${paragraph('<span style="font-size:13px;color:#6b6560;">Derse katılamayacaksanız lütfen önceden <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> üzerinden bize bildirin.</span>')}
    `);
    await sendEmail({ to: studentEmail, subject: `Dersiniz Planlandı – ${dateStr}`, html });
  }

  // To teacher
  if (teacherEmail) {
    const teacherRows = [
      { label: "Öğrenci", value: studentName },
      { label: "Tarih", value: dateStr },
      { label: "Süre", value: `${duration} dakika` },
      ...(packageName ? [{ label: "Paket", value: packageName }] : []),
    ];
    const html = baseTemplate(`
      ${heading("Yeni Ders Atandı 📅")}
      ${paragraph(`Merhaba <strong>${teacherName}</strong>, size yeni bir ders atandı.`)}
      ${infoBox(teacherRows)}
      ${googleMeetLink ? ctaButton("Google Meet Linkine Git →", googleMeetLink) : ""}
      ${divider()}
      ${paragraph('<span style="font-size:13px;color:#6b6560;">Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.</span>')}
    `);
    await sendEmail({ to: teacherEmail, subject: `Yeni Ders Atandı – ${studentName} (${dateStr})`, html });
  }
}

/** Sent when a lesson's Meet link is added/updated */
export async function sendMeetLinkUpdated({
  studentEmail,
  studentName,
  teacherName,
  scheduledAt,
  googleMeetLink,
}: {
  studentEmail: string | null | undefined;
  studentName: string;
  teacherName: string;
  scheduledAt: Date;
  googleMeetLink: string;
}) {
  if (!studentEmail) return;

  const dateStr = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(new Date(scheduledAt));

  const html = baseTemplate(`
    ${heading("Ders Bağlantınız Hazır 🎥")}
    ${paragraph(`Merhaba <strong>${studentName}</strong>, <strong>${dateStr}</strong> tarihli dersinizin Google Meet bağlantısı eklendi. Artık derse katılmaya hazırsınız!`)}
    ${infoBox([
      { label: "Öğretmen", value: teacherName },
      { label: "Tarih", value: dateStr },
    ])}
    ${paragraph("Ders saatinden 5 dakika önce bağlantıya tıklayarak hazır olmanızı öneririz.")}
    ${ctaButton("Derse Katıl →", googleMeetLink)}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Teknik bir sorun yaşarsanız <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize ulaşabilirsiniz.</span>')}
  `);

  await sendEmail({
    to: studentEmail,
    subject: `Ders Bağlantınız Hazır – ${dateStr}`,
    html,
  });
}

/** Sent to student + teacher when a lesson is cancelled */
export async function sendLessonCancelled({
  studentEmail,
  studentName,
  teacherEmail,
  teacherName,
  scheduledAt,
}: {
  studentEmail: string | null | undefined;
  studentName: string;
  teacherEmail: string | null | undefined;
  teacherName: string;
  scheduledAt: Date;
}) {
  const dateStr = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(new Date(scheduledAt));

  if (studentEmail) {
    const html = baseTemplate(`
      ${heading("Dersiniz İptal Edildi")}
      ${paragraph(`Merhaba <strong>${studentName}</strong>, <strong>${dateStr}</strong> tarihli dersinizin iptal edildiğini bildirmek istiyoruz.`)}
      ${infoBox([
        { label: "Öğretmen", value: teacherName },
        { label: "Tarih", value: dateStr },
      ])}
      ${paragraph("Yeni bir ders planlanması durumunda e-posta ile bilgilendirileceksiniz. Bu durum sizi olumsuz etkilediyse özür dileriz — sizin için en kısa sürede yeni bir ders ayarlamak istiyoruz.")}
      ${ctaButton("Destek ile İletişime Geç →", "mailto:destek@onlinedershanem.com")}
    `);
    await sendEmail({ to: studentEmail, subject: `Ders İptal Edildi – ${dateStr}`, html });
  }

  if (teacherEmail) {
    const html = baseTemplate(`
      ${heading("Ders İptal Edildi")}
      ${paragraph(`Merhaba <strong>${teacherName}</strong>, <strong>${studentName}</strong> ile <strong>${dateStr}</strong> tarihinde planlanan ders iptal edildi.`)}
      ${infoBox([
        { label: "Öğrenci", value: studentName },
        { label: "Tarih", value: dateStr },
      ])}
      ${paragraph('<span style="font-size:13px;color:#6b6560;">Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.</span>')}
    `);
    await sendEmail({ to: teacherEmail, subject: `Ders İptal – ${studentName} (${dateStr})`, html });
  }
}

/** Sent to student when a lesson is marked completed (with notes) */
export async function sendLessonCompleted({
  studentEmail,
  studentName,
  teacherName,
  scheduledAt,
  notes,
}: {
  studentEmail: string | null | undefined;
  studentName: string;
  teacherName: string;
  scheduledAt: Date;
  notes: string | null | undefined;
}) {
  if (!studentEmail) return;

  const dateStr = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul",
  }).format(new Date(scheduledAt));

  const html = baseTemplate(`
    ${heading("Ders Tamamlandı ✅")}
    ${paragraph(`Tebrikler <strong>${studentName}</strong>! <strong>${dateStr}</strong> tarihli dersiniz başarıyla tamamlandı. Her ders, hedefe bir adım daha yaklaşmak demek.`)}
    ${infoBox([
      { label: "Öğretmen", value: teacherName },
      { label: "Tarih", value: dateStr },
    ])}
    ${notes ? noteBox(notes) : ""}
    ${paragraph("Ders geçmişinizi ve öğretmeninizin notlarını panelinizden istediğiniz zaman inceleyebilirsiniz.")}
    ${ctaButton("Ders Geçmişimi Görüntüle →", `${APP_URL}/panel/dersler?tab=completed`)}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Dersle ilgili bir sorunuz mu var? <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize yazabilirsiniz.</span>')}
  `);

  await sendEmail({
    to: studentEmail,
    subject: `Ders Tamamlandı – ${dateStr}`,
    html,
  });
}

/** Sent to user for email verification (registration or password reset) */
export async function sendVerificationCode({
  to,
  code,
  type,
}: {
  to: string;
  code: string;
  type: "REGISTER" | "PASSWORD_RESET";
}) {
  const isReset = type === "PASSWORD_RESET";
  const subject = isReset ? "Şifre Sıfırlama Kodunuz" : "E-posta Doğrulama Kodunuz";
  const title = isReset ? "Şifre Sıfırlama" : "E-posta Doğrulaması";
  const description = isReset
    ? "Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu kullanın. Kod yalnızca <strong>2 dakika</strong> geçerlidir."
    : "Online Dershanem hesabınızı doğrulamak için aşağıdaki 6 haneli kodu girin. Kod yalnızca <strong>2 dakika</strong> geçerlidir.";

  const html = baseTemplate(`
    ${heading(title)}
    ${paragraph(description)}
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:#f0fdf8;border:2px solid #6ee7b7;border-radius:14px;padding:20px 40px;">
        <span style="font-size:40px;font-weight:800;letter-spacing:14px;color:#091413;font-family:monospace;">${code}</span>
      </div>
    </div>
    ${paragraph('<span style="font-size:13px;color:#9c9589;">Bu işlemi siz başlatmadıysanız bu e-postayı güvenle görmezden gelebilirsiniz. Hesabınızın güvenliği tehlikede değildir.</span>')}
  `);

  await sendEmail({ to, subject, html });
}

/** Sent to students when exam results are released by admin */
export async function sendOdkResultsReleased({
  to,
  name,
  examTitle,
  score,
  examUrl,
}: {
  to: string;
  name: string;
  examTitle: string;
  score: number | null;
  examUrl: string;
}) {
  const firstName = name.split(" ")[0];
  const html = baseTemplate(`
    ${heading("Sınav Sonuçların Açıklandı! 🎉")}
    ${paragraph(`Merhaba <strong>${firstName}</strong>, <strong>${escapeHtml(examTitle)}</strong> sınavına ait sonuçlar artık görüntülenebilir.`)}
    ${score != null ? infoBox([{ label: "Netiniz", value: score.toFixed(2) }]) : ""}
    ${paragraph("Panelinize girerek bölüm bazlı analizinizi, doğru/yanlış dağılımınızı ve sıralama tablonuzu görebilirsiniz.")}
    ${ctaButton("Sonuçlarımı Gör →", `${APP_URL}${examUrl}`)}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.</span>')}
    ${signature()}
  `);

  await sendEmail({
    to,
    subject: `Sınav Sonuçların Açıklandı – ${examTitle}`,
    html,
  });
}

/** Sent to a student when an admin manually grants ODK access */
export async function sendOdkAccessGranted({
  to,
  name,
  tagTitle,
}: {
  to: string;
  name: string;
  tagTitle: string;
}) {
  const firstName = name.split(" ")[0];
  const html = baseTemplate(`
    ${heading("ODK Erişimin Açıldı! 🎉")}
    ${paragraph(`Merhaba <strong>${escapeHtml(firstName)}</strong>, <strong>${escapeHtml(tagTitle)}</strong> paketine erişimin tanımlandı.`)}
    ${paragraph("Artık Online Deneme Kulübü paneline giriş yaparak erişimine tanımlı sınavlara katılabilirsin.")}
    ${ctaButton("Sınavlara Git →", `${APP_URL}/odk/panel/sinavlar`)}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.</span>')}
    ${signature()}
  `);

  await sendEmail({
    to,
    subject: "ODK Erişimin Açıldı – Online Deneme Kulübü",
    html,
  });
}

/** Sent to admin recipients when a new lead form is submitted */
export async function sendLeadSubmissionNotification({
  fullName,
  phone,
  classLevel,
  examType,
  targetGoal,
  currentNet,
  parentPhone,
  source,
  submittedAt,
}: {
  fullName: string;
  phone: string;
  classLevel: string;
  examType: string;
  targetGoal: string;
  currentNet: string;
  parentPhone?: string | null;
  source: string;
  submittedAt: Date;
}) {
  const recipients = getLeadNotificationRecipients();
  if (recipients.length === 0) return;

  const safeName = escapeHtml(fullName);
  const safePhone = escapeHtml(phone);
  const safeClassLevel = escapeHtml(classLevel);
  const safeExamType = escapeHtml(examType);
  const safeTargetGoal = escapeHtml(targetGoal);
  const safeCurrentNet = escapeHtml(currentNet);
  const safeSource = escapeHtml(source);
  const safeParentPhone = parentPhone ? escapeHtml(parentPhone) : null;
  const dateStr = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(submittedAt));

  const html = baseTemplate(`
    ${heading("Yeni Form Başvurusu")}
    ${paragraph(`<strong>${safeName}</strong> adına yeni bir lead kaydı oluşturuldu.`)}
    ${infoBox([
      { label: "Ad Soyad", value: safeName },
      { label: "Telefon", value: safePhone },
      { label: "Sınıf", value: safeClassLevel },
      { label: "Sınav", value: safeExamType },
      { label: "Hedef", value: safeTargetGoal },
      { label: "Net", value: safeCurrentNet },
      ...(safeParentPhone ? [{ label: "Veli Telefonu", value: safeParentPhone }] : []),
      { label: "Kaynak", value: safeSource },
      { label: "Tarih", value: dateStr },
    ])}
    ${ctaButton("Admin Panelinde Aç →", `${APP_URL}/admin/formlar`)}
  `);

  await sendEmail({
    to: recipients,
    subject: `Yeni Form Başvurusu – ${fullName}`,
    html,
  });
}

/** Sent when admin invites a parent — includes credentials and child info. */
export async function sendParentInvite({
  to,
  parentName,
  email,
  password,
  childNames,
}: {
  to: string;
  parentName: string;
  email: string;
  password: string;
  childNames: string[];
}) {
  const firstName = parentName.split(" ")[0];
  const childList = childNames.length > 0
    ? childNames.map((n) => `<li style="margin:4px 0;">${n}</li>`).join("")
    : "<li>—</li>";

  const html = baseTemplate(`
    ${heading(`Hoş geldiniz, ${firstName}! 👨‍👩‍👧`)}
    ${paragraph(`<strong>${parentName}</strong>, Online Dershanem veli paneliniz oluşturuldu. Çocuğunuzun/çocuklarınızın ders, ödev, devamsızlık ve ödeme bilgilerini buradan takip edebilirsiniz.`)}
    ${paragraph(`<strong>Bağlı öğrenciler:</strong><ul style="margin:8px 0 16px 20px;padding:0;color:#091413;font-size:14px;">${childList}</ul>`)}
    ${credentialBox(email, password)}
    ${ctaButton("Veli Paneline Giriş Yap →", `${APP_URL}/giris?callbackUrl=%2Fveli`)}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Güvenliğiniz için giriş yaptıktan sonra şifrenizi <a href="' + APP_URL + '/veli/profil" style="color:#546B41;text-decoration:none;">Profil sayfanızdan</a> değiştirmenizi öneririz.</span>')}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize yazabilirsiniz.</span>')}
    ${signature()}
  `);

  await sendEmail({
    to,
    subject: `Hoş geldiniz, ${firstName}! Veli paneliniz hazır.`,
    html,
  });
}

// ─── Notification email channel ──────────────────────────────────────────────

/**
 * Lightweight notification mailer — kullanıcının bildirim tercihinde
 * `email` kanalı açıksa lib/notifications.ts buradan tetikler.
 *
 * Tasarım: minimal şablon, başlık + body + opsiyonel "Görüntüle" CTA.
 * Outbox üzerinden atılır, retry-safe.
 */
export async function sendNotificationEmail({
  to,
  title,
  body,
  href,
  priority,
}: {
  to: string;
  title: string;
  body: string;
  href?: string | null;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}) {
  const isUrgent = priority === "URGENT";
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br/>");
  const cta = href
    ? ctaButton("Görüntüle →", href.startsWith("http") ? href : `${APP_URL}${href}`)
    : "";
  const priorityBadge = isUrgent
    ? `<div style="display:inline-block;background:#FBE9E9;color:#A04A4A;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:14px;">ACİL</div>`
    : "";
  const html = baseTemplate(`
    ${priorityBadge}
    ${heading(safeTitle)}
    ${paragraph(safeBody)}
    ${cta}
    ${divider()}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Bu e-postayı bildirim tercihlerinize göre alıyorsunuz. Tercihleri değiştirmek için <a href="' + APP_URL + '/v2/bildirim-tercihleri" style="color:#546B41;text-decoration:none;">Bildirim Tercihleri</a> sayfanızı ziyaret edin.</span>')}
  `);
  await sendEmail({
    to,
    subject: isUrgent ? `[ACİL] ${title}` : title,
    html,
  });
}

/**
 * Günlük dijital özet — son 24 saatte oluşan okunmamış bildirimleri tek bir
 * e-postada toplar. /api/cron/notification-digest tarafından her sabah çalışır.
 */
export async function sendNotificationDigestEmail({
  to,
  recipientName,
  items,
}: {
  to: string;
  recipientName?: string | null;
  items: Array<{
    title: string;
    body: string;
    href?: string | null;
    createdAt: Date;
    typeLabel: string;
  }>;
}) {
  if (items.length === 0) return;
  const greet = recipientName ? `Merhaba ${escapeHtml(recipientName)},` : "Merhaba,";
  const list = items
    .slice(0, 25)
    .map((it) => {
      const href = it.href
        ? it.href.startsWith("http")
          ? it.href
          : `${APP_URL}${it.href}`
        : null;
      const titleHtml = href
        ? `<a href="${href}" style="color:#546B41;text-decoration:none;font-weight:600;">${escapeHtml(it.title)}</a>`
        : `<span style="font-weight:600;">${escapeHtml(it.title)}</span>`;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee5d3;">
            <div style="font-size:11px;color:#9c9589;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(it.typeLabel)}</div>
            <div style="font-size:14px;margin-top:4px;">${titleHtml}</div>
            <div style="font-size:13px;color:#5a544a;margin-top:4px;">${escapeHtml(it.body)}</div>
          </td>
        </tr>`;
    })
    .join("");
  const more = items.length > 25 ? `<p style="font-size:12px;color:#9c9589;text-align:center;margin-top:14px;">... ve ${items.length - 25} bildirim daha. <a href="${APP_URL}/v2" style="color:#546B41;">Panele git →</a></p>` : "";
  const html = baseTemplate(`
    ${heading("Günlük özet")}
    ${paragraph(`${greet} son 24 saatte ${items.length} okunmamış bildiriminiz oldu:`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">${list}</table>
    ${more}
    ${ctaButton("Bildirim merkezine git →", `${APP_URL}/v2`)}
    ${divider()}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Günlük özetleri kapatmak için <a href="' + APP_URL + '/v2/bildirim-tercihleri" style="color:#546B41;text-decoration:none;">Bildirim Tercihleri</a> sayfanızı ziyaret edin.</span>')}
  `);
  await sendEmail({
    to,
    subject: `Günlük özet — ${items.length} bildirim`,
    html,
  });
}

// ─── Round 5 — Parent weekly digest ─────────────────────────────────────────

/**
 * Veliye haftalık özet e-postası. Her çocuk için kart-benzeri blok
 * (devamsızlık / bekleyen ödev / son puan / yaklaşan ders / son ODK net)
 * + kritik uyarılar üstte. Pazartesi 08:00 cron.
 */
export async function sendParentWeeklyDigestEmail({
  to,
  parentName,
  children,
}: {
  to: string;
  parentName?: string | null;
  children: Array<{
    fullName: string;
    classLevel: string | null;
    attendance7: { total: number; present: number; absent: number; late: number };
    pendingAssignments: number;
    overdueAssignments: number;
    lastGradedScore: number | null;
    lastGradedTitle: string | null;
    upcomingLessons7: number;
    lastOdkNet: number | null;
    lastOdkExam: string | null;
    alerts: Array<{ severity: "info" | "warning" | "critical"; message: string }>;
  }>;
}) {
  if (children.length === 0) return;
  const greet = parentName ? `Merhaba ${escapeHtml(parentName)},` : "Merhaba,";

  const criticalAll = children.flatMap((c) =>
    c.alerts.filter((a) => a.severity === "critical").map((a) => ({ child: c.fullName, message: a.message })),
  );

  const criticalBlock =
    criticalAll.length > 0
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin:8px 0 20px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#991b1b;">🚨 Acil dikkat</p>
          ${criticalAll
            .map(
              (a) =>
                `<p style="margin:4px 0;font-size:13px;color:#7f1d1d;">• <strong>${escapeHtml(a.child)}:</strong> ${escapeHtml(a.message)}</p>`,
            )
            .join("")}
        </div>`
      : "";

  function metric(label: string, value: string, tone: "ok" | "warn" | "bad" | "neutral" = "neutral"): string {
    const color = tone === "bad" ? "#991b1b" : tone === "warn" ? "#92400e" : tone === "ok" ? "#065f46" : "#5a544a";
    const bg = tone === "bad" ? "#fef2f2" : tone === "warn" ? "#fffbeb" : tone === "ok" ? "#f0fdf4" : "#f8f8f5";
    return `<div style="background:${bg};border-radius:8px;padding:8px 10px;flex:1;min-width:120px;">
      <div style="font-size:10px;color:#9c9589;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
      <div style="font-size:15px;font-weight:700;color:${color};margin-top:2px;">${value}</div>
    </div>`;
  }

  const childCards = children
    .map((c) => {
      const attRate = c.attendance7.total > 0 ? Math.round((c.attendance7.present / c.attendance7.total) * 100) : null;
      const attTone: "ok" | "warn" | "bad" | "neutral" =
        attRate == null ? "neutral" : attRate >= 90 ? "ok" : attRate >= 70 ? "warn" : "bad";
      const overdueTone: "ok" | "warn" | "bad" | "neutral" =
        c.overdueAssignments >= 2 ? "bad" : c.overdueAssignments >= 1 ? "warn" : "ok";
      const warningAlerts = c.alerts.filter((a) => a.severity !== "critical");
      const warningBlock = warningAlerts.length
        ? `<div style="margin-top:8px;font-size:12px;color:#92400e;">
            ${warningAlerts.map((a) => `<div>⚠ ${escapeHtml(a.message)}</div>`).join("")}
          </div>`
        : "";
      return `
        <div style="border:1px solid #E5E5E0;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:16px;font-weight:800;color:#091413;">${escapeHtml(c.fullName)}</h3>
            <span style="font-size:11px;color:#9c9589;">${escapeHtml(c.classLevel ?? "—")}</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
            ${metric("7g devam", attRate != null ? `%${attRate}` : "—", attTone)}
            ${metric("Bekleyen ödev", String(c.pendingAssignments), c.pendingAssignments >= 3 ? "warn" : "neutral")}
            ${metric("Geciken", String(c.overdueAssignments), overdueTone)}
            ${metric("Bu hafta ders", String(c.upcomingLessons7), "neutral")}
            ${
              c.lastGradedScore != null
                ? metric("Son ödev", `${c.lastGradedScore}/100`, c.lastGradedScore >= 70 ? "ok" : c.lastGradedScore >= 50 ? "warn" : "bad")
                : ""
            }
            ${c.lastOdkNet != null ? metric("Son ODK net", String(c.lastOdkNet), "neutral") : ""}
          </div>
          ${warningBlock}
        </div>`;
    })
    .join("");

  const html = baseTemplate(`
    ${heading("Haftalık özet")}
    ${paragraph(`${greet} çocuklarınızın geçtiğimiz haftadaki durumu aşağıdadır.`)}
    ${criticalBlock}
    ${childCards}
    ${ctaButton("Veli paneline git →", `${APP_URL}/panel/veli`)}
    ${divider()}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Haftalık özetleri kapatmak için bildirim tercihlerinizi güncelleyebilirsiniz.</span>')}
  `);

  const subjectSuffix =
    criticalAll.length > 0 ? ` — ${criticalAll.length} acil dikkat` : ` — ${children.length} çocuk`;
  await sendEmail({
    to,
    subject: `Haftalık özet${subjectSuffix}`,
    html,
  });
}


// ─── Order paid notifications (OD + ODK) ────────────────────────────────────

function formatTry(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

type OrderPaidItem = {
  name: string;
  qty?: number;
  priceCents: number;
};

/**
 * Kullanıcıya gönderilen "Ödemeniz alındı" e-postası.
 * Hem OD hem ODK için kullanılır; `service` etiket olarak görünür.
 */
export async function sendOrderPaidUserEmail({
  to,
  name,
  service,
  orderId,
  packageName,
  items,
  totalCents,
  panelHref,
}: {
  to: string;
  name?: string | null;
  service: "OD" | "ODK";
  orderId: string;
  packageName: string;
  items?: OrderPaidItem[];
  totalCents: number;
  panelHref?: string;
}) {
  const firstName = (name || "").split(" ")[0] || "değerli öğrencimiz";
  const serviceLabel = service === "ODK" ? "Online Deneme Kulübü" : "Online Dershanem";
  const itemsRows =
    items && items.length > 0
      ? items
          .map(
            (it) => `
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#091413;">
            ${escapeHtml(it.name)}${it.qty && it.qty > 1 ? ` <span style="color:#9c9589;">× ${it.qty}</span>` : ""}
          </td>
          <td style="padding:10px 14px;font-size:13px;color:#091413;text-align:right;white-space:nowrap;">
            ${formatTry(it.priceCents * (it.qty ?? 1))}
          </td>
        </tr>`,
          )
          .join('<tr><td colspan="2" style="padding:0 14px;"><hr style="border:none;border-top:1px solid #EBEBE7;margin:0;"/></td></tr>')
      : `<tr>
          <td style="padding:10px 14px;font-size:13px;color:#091413;">${escapeHtml(packageName)}</td>
          <td style="padding:10px 14px;font-size:13px;color:#091413;text-align:right;">${formatTry(totalCents)}</td>
        </tr>`;
  const orderTable = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;border:1px solid #e7e5e0;border-radius:10px;margin:18px 0;overflow:hidden;">
      <tr>
        <td colspan="2" style="padding:10px 14px;background:#091413;color:#fff;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">
          Sipariş Detayı
          <span style="float:right;color:#6ee7b7;font-family:monospace;">#${escapeHtml(orderId.slice(-10).toUpperCase())}</span>
        </td>
      </tr>
      ${itemsRows}
      <tr><td colspan="2" style="padding:0 14px;"><hr style="border:none;border-top:1px solid #EBEBE7;margin:0;"/></td></tr>
      <tr>
        <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#091413;">Toplam</td>
        <td style="padding:12px 14px;font-size:16px;font-weight:800;color:#546B41;text-align:right;">${formatTry(totalCents)}</td>
      </tr>
    </table>`;

  const nextStep = service === "ODK"
    ? "Erişiminiz panelinize tanımlandı. Hemen sınavlara başlayabilirsiniz."
    : "Hocalarımız 24 saat içinde sizinle iletişime geçerek ders programınızı planlayacak.";
  const cta = panelHref || (service === "ODK" ? "/odk/panel/sinavlar" : "/panel/ogrenci");
  const ctaLabel = service === "ODK" ? "Sınavlara Git →" : "Panele Git →";

  const html = baseTemplate(`
    ${heading("Ödemeniz başarıyla alındı 🎉")}
    ${paragraph(`Merhaba <strong>${escapeHtml(firstName)}</strong>, <strong>${escapeHtml(serviceLabel)}</strong> üzerinden gerçekleştirdiğiniz ödeme onaylandı.`)}
    ${orderTable}
    ${paragraph(`<strong>Sıradaki adım:</strong> ${nextStep}`)}
    ${ctaButton(ctaLabel, `${APP_URL}${cta}`)}
    ${divider()}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Bu siparişle ilgili sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#546B41;text-decoration:none;">destek@onlinedershanem.com</a> adresinden bize yazabilirsiniz.</span>')}
    ${signature()}
  `);

  await sendEmail({
    to,
    subject: `Ödemeniz alındı – ${serviceLabel}`,
    html,
  });
}

/**
 * Admin ekibine gönderilen "Yeni satış" bildirimi.
 * LEAD_NOTIFICATION_EMAILS / ADMIN_EMAIL alıcılarına gider.
 */
export async function sendOrderPaidAdminEmail({
  service,
  orderId,
  packageName,
  items,
  totalCents,
  buyer,
}: {
  service: "OD" | "ODK";
  orderId: string;
  packageName: string;
  items?: OrderPaidItem[];
  totalCents: number;
  buyer: {
    fullName: string;
    email: string;
    phone?: string | null;
    city?: string | null;
    district?: string | null;
    classLevel?: string | null;
    examType?: string | null;
    schoolName?: string | null;
    parentPhone?: string | null;
  };
}) {
  const recipients = getLeadNotificationRecipients();
  if (recipients.length === 0) return;

  const serviceLabel = service === "ODK" ? "ODK" : "OD";
  const adminPath = service === "ODK" ? "/panel/admin/odk-orders" : "/panel/admin/odk-orders";

  const itemsBlock =
    items && items.length > 1
      ? `<div style="margin:6px 0 14px;font-size:13px;color:#091413;">
          <strong>Sepet kalemleri (${items.length}):</strong>
          <ul style="margin:6px 0 0 20px;padding:0;">
            ${items.map((it) => `<li>${escapeHtml(it.name)} — ${formatTry(it.priceCents * (it.qty ?? 1))}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const html = baseTemplate(`
    ${heading(`Yeni ${serviceLabel} Satışı 💸`)}
    ${paragraph(`<strong>${escapeHtml(buyer.fullName)}</strong> tarafından yeni bir ödeme alındı.`)}
    ${itemsBlock}
    ${infoBox([
      { label: "Servis", value: serviceLabel },
      { label: "Sipariş ID", value: escapeHtml(orderId) },
      { label: "Paket", value: escapeHtml(packageName) },
      { label: "Tutar", value: formatTry(totalCents) },
      { label: "Ad Soyad", value: escapeHtml(buyer.fullName) },
      { label: "E-posta", value: escapeHtml(buyer.email) },
      ...(buyer.phone ? [{ label: "Telefon", value: escapeHtml(buyer.phone) }] : []),
      ...(buyer.classLevel ? [{ label: "Sınıf", value: escapeHtml(buyer.classLevel) }] : []),
      ...(buyer.examType ? [{ label: "Sınav", value: escapeHtml(buyer.examType) }] : []),
      ...(buyer.schoolName ? [{ label: "Okul", value: escapeHtml(buyer.schoolName) }] : []),
      ...(buyer.city || buyer.district
        ? [{ label: "Şehir", value: escapeHtml([buyer.district, buyer.city].filter(Boolean).join(", ")) }]
        : []),
      ...(buyer.parentPhone ? [{ label: "Veli Tel", value: escapeHtml(buyer.parentPhone) }] : []),
    ])}
    ${ctaButton("Admin Panelinde Aç →", `${APP_URL}${adminPath}`)}
  `);

  await sendEmail({
    to: recipients,
    subject: `[${serviceLabel}] Yeni satış – ${buyer.fullName} – ${formatTry(totalCents)}`,
    html,
  });
}
