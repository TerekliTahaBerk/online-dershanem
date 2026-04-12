import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
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
<body style="margin:0;padding:0;background:#f5f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo bar -->
        <tr>
          <td style="background:#091413;border-radius:12px 12px 0 0;padding:20px 28px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Online Dershanem</span>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="background:#ffffff;padding:32px 28px;border-left:1px solid #e7e5e0;border-right:1px solid #e7e5e0;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0ede8;border-radius:0 0 12px 12px;border:1px solid #e7e5e0;border-top:none;padding:16px 28px;">
            <p style="margin:0;font-size:11px;color:#9c9589;line-height:1.5;">
              Bu e-posta Online Dershanem tarafından gönderilmiştir.<br/>
              Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.
            </p>
            <p style="margin:8px 0 0;font-size:10px;color:#b8b3aa;">Online Dershanem, bir <a href="https://yula.co" style="color:#b8b3aa;text-decoration:none;">yula.co</a> markasıdır.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#091413;letter-spacing:-0.3px;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4a4640;">${text}</p>`;
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
          <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6b6560;white-space:nowrap;width:1%;">${label}</td>
          <td style="padding:8px 12px;font-size:13px;color:#091413;font-weight:500;">${value}</td>
        </tr>`
    )
    .join('<tr><td colspan="2" style="padding:0 12px;"><hr style="border:none;border-top:1px solid #f0ede8;margin:0;" /></td></tr>');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;border:1px solid #e7e5e0;border-radius:8px;margin:16px 0;overflow:hidden;">${items}</table>`;
}

function ctaButton(text: string, href: string): string {
  return `<div style="margin:20px 0;">
    <a href="${href}" style="display:inline-block;background:#408A71;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:8px;letter-spacing:0.1px;">${text}</a>
  </div>`;
}

function noteBox(text: string): string {
  return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;"><strong>Ders Notu:</strong> ${text}</p>
  </div>`;
}

function credentialBox(email: string, password: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#091413;border-radius:8px;margin:16px 0;overflow:hidden;">
    <tr>
      <td style="padding:14px 16px 4px;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6ee7b7;">Giriş Bilgileriniz</p>
      </td>
    </tr>
    <tr>
      <td style="padding:4px 16px;">
        <p style="margin:0;font-size:12px;color:#a8a29e;">E-posta</p>
        <p style="margin:2px 0 10px;font-size:14px;font-weight:600;color:#ffffff;">${email}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:4px 16px 14px;">
        <p style="margin:0;font-size:12px;color:#a8a29e;">Şifre</p>
        <p style="margin:2px 0;font-size:14px;font-weight:600;color:#6ee7b7;font-family:monospace;">${password}</p>
      </td>
    </tr>
  </table>`;
}

// ─── Low-level sender ────────────────────────────────────────────────────────

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
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] send failed:", err);
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
  const html = baseTemplate(`
    ${heading(`Hoş geldin, ${name.split(" ")[0]}! 👋`)}
    ${paragraph("Online Dershanem öğrenci paneliniz hazır. Aşağıdaki bilgilerle giriş yapabilirsiniz.")}
    ${credentialBox(email, password)}
    ${ctaButton("Panele Giriş Yap", "https://onlinedershanem.com/giris")}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Şifrenizi giriş yaptıktan sonra Profilim sayfasından değiştirebilirsiniz.</span>')}
  `);

  await sendEmail({
    to,
    subject: "Online Dershanem Öğrenci Paneliniz Hazır",
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
  const html = baseTemplate(`
    ${heading(`Merhaba, ${name.split(" ")[0]}! 🎓`)}
    ${paragraph("Online Dershanem öğretmen paneliniz oluşturuldu. Aşağıdaki bilgilerle giriş yapabilirsiniz.")}
    ${credentialBox(email, password)}
    ${ctaButton("Panele Giriş Yap", "https://onlinedershanem.com/giris")}
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Şifrenizi giriş yaptıktan sonra Profilim sayfasından değiştirebilirsiniz.</span>')}
  `);

  await sendEmail({
    to,
    subject: "Online Dershanem Öğretmen Paneliniz Hazır",
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
      ${paragraph(`Merhaba <strong>${studentName}</strong>, yeni bir dersiniz planlandı.`)}
      ${infoBox(rows)}
      ${googleMeetLink
        ? ctaButton("Google Meet ile Derse Katıl", googleMeetLink)
        : paragraph('<span style="font-size:12px;color:#9c9589;">Google Meet linki yakında eklenecektir.</span>')
      }
    `);
    await sendEmail({ to: studentEmail, subject: `Ders Planlandı – ${dateStr}`, html });
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
      ${googleMeetLink ? ctaButton("Google Meet Linki", googleMeetLink) : ""}
    `);
    await sendEmail({ to: teacherEmail, subject: `Yeni Ders Atandı – ${studentName}`, html });
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
    ${heading("Google Meet Linkiniz Hazır 🎥")}
    ${paragraph(`Merhaba <strong>${studentName}</strong>, <strong>${dateStr}</strong> tarihli dersinizin Google Meet linki eklendi.`)}
    ${infoBox([
      { label: "Öğretmen", value: teacherName },
      { label: "Tarih", value: dateStr },
    ])}
    ${ctaButton("Derse Katıl", googleMeetLink)}
  `);

  await sendEmail({
    to: studentEmail,
    subject: `Meet Linki Hazır – ${dateStr}`,
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
      ${heading("Ders İptal Edildi")}
      ${paragraph(`Merhaba <strong>${studentName}</strong>, <strong>${dateStr}</strong> tarihli dersiniz iptal edildi.`)}
      ${infoBox([
        { label: "Öğretmen", value: teacherName },
        { label: "Tarih", value: dateStr },
      ])}
      ${paragraph("Yeni bir ders planlanması durumunda bilgilendirileceksiniz. Sorularınız için bizimle iletişime geçebilirsiniz.")}
    `);
    await sendEmail({ to: studentEmail, subject: `Ders İptal Edildi – ${dateStr}`, html });
  }

  if (teacherEmail) {
    const html = baseTemplate(`
      ${heading("Ders İptal Edildi")}
      ${paragraph(`Merhaba <strong>${teacherName}</strong>, <strong>${studentName}</strong> ile <strong>${dateStr}</strong> tarihli ders iptal edildi.`)}
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
    ${paragraph(`Merhaba <strong>${studentName}</strong>, <strong>${dateStr}</strong> tarihli dersiniz tamamlandı.`)}
    ${infoBox([
      { label: "Öğretmen", value: teacherName },
      { label: "Tarih", value: dateStr },
    ])}
    ${notes ? noteBox(notes) : ""}
    ${ctaButton("Ders Geçmişini Görüntüle", "https://onlinedershanem.com/panel/dersler?tab=completed")}
  `);

  await sendEmail({
    to: studentEmail,
    subject: `Ders Tamamlandı – ${dateStr}`,
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
    ${ctaButton("Admin Panelinde Aç", `${APP_URL}/admin/formlar`)}
  `);

  await sendEmail({
    to: recipients,
    subject: `Yeni Form Başvurusu – ${fullName}`,
    html,
  });
}
