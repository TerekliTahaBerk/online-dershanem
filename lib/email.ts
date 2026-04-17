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
<body style="margin:0;padding:0;background:#edeae4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeae4;padding:44px 16px;">
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
                  <a href="https://onlinedershanem.com" style="color:#408A71;font-size:12px;font-weight:500;text-decoration:none;">onlinedershanem.com</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Accent bar -->
        <tr>
          <td style="background:#408A71;height:3px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="background:#ffffff;padding:40px 32px;border-left:1px solid #e2dfd9;border-right:1px solid #e2dfd9;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f2ed;border-radius:0 0 16px 16px;border:1px solid #e2dfd9;border-top:none;padding:22px 32px;">
            <p style="margin:0 0 6px;font-size:12px;color:#7a766d;line-height:1.7;">
              Bu e-posta <strong style="color:#4a4640;">Online Dershanem</strong> tarafından otomatik olarak gönderilmiştir.<br/>
              Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.
            </p>
            <p style="margin:10px 0 0;font-size:11px;color:#ada89f;">
              © 2026 Online Dershanem &nbsp;·&nbsp; Bir <a href="https://yula.co" style="color:#ada89f;text-decoration:underline;font-weight:500;">yula.co</a> markasıdır.
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
  return `<p style="margin:0 0 18px;font-size:14px;line-height:1.75;color:#4a4640;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #f0ede8;margin:28px 0;" />`;
}

function bulletList(items: string[]): string {
  const rows = items.map(
    (item) =>
      `<tr>
        <td style="padding:5px 0;vertical-align:top;width:20px;">
          <span style="color:#408A71;font-size:14px;font-weight:700;">·</span>
        </td>
        <td style="padding:5px 0 5px 8px;font-size:14px;line-height:1.6;color:#4a4640;">${item}</td>
      </tr>`
  ).join("");
  return `<table cellpadding="0" cellspacing="0" style="margin:12px 0 20px;">${rows}</table>`;
}

function signature(name = "Online Dershanem Ekibi"): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:32px;">
    <tr>
      <td style="border-left:3px solid #408A71;padding:4px 14px;">
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
    .join('<tr><td colspan="2" style="padding:0 14px;"><hr style="border:none;border-top:1px solid #f0ede8;margin:0;" /></td></tr>');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f2;border:1px solid #e7e5e0;border-radius:10px;margin:18px 0;overflow:hidden;">${items}</table>`;
}

function ctaButton(text: string, href: string): string {
  return `<div style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#408A71;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:9px;letter-spacing:0.1px;">${text}</a>
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
    ${paragraph('<span style="font-size:13px;color:#9c9589;">Herhangi bir sorun yaşarsan <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize ulaşabilirsin. Seni duymaktan her zaman mutluluk duyarız.</span>')}
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
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Güvenliğiniz için giriş yaptıktan sonra şifrenizi <a href="' + APP_URL + '/panel/profil" style="color:#408A71;text-decoration:none;">Profil sayfanızdan</a> değiştirmenizi öneririz.</span>')}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Herhangi bir sorunuz olursa <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize yazabilirsiniz.</span>')}
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
    ${paragraph('<span style="font-size:12px;color:#9c9589;">Güvenliğiniz için giriş yaptıktan sonra şifrenizi <a href="' + APP_URL + '/panel/profil" style="color:#408A71;text-decoration:none;">Profil sayfanızdan</a> değiştirmenizi öneririz.</span>')}
    ${divider()}
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Herhangi bir sorunuz olursa <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize yazabilirsiniz.</span>')}
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
      ${paragraph('<span style="font-size:13px;color:#6b6560;">Derse katılamayacaksanız lütfen önceden <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> üzerinden bize bildirin.</span>')}
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
      ${paragraph('<span style="font-size:13px;color:#6b6560;">Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.</span>')}
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
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Teknik bir sorun yaşarsanız <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize ulaşabilirsiniz.</span>')}
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
      ${paragraph('<span style="font-size:13px;color:#6b6560;">Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.</span>')}
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
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Dersle ilgili bir sorunuz mu var? <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresinden bize yazabilirsiniz.</span>')}
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
    ${paragraph('<span style="font-size:13px;color:#6b6560;">Sorularınız için <a href="mailto:destek@onlinedershanem.com" style="color:#408A71;text-decoration:none;font-weight:500;">destek@onlinedershanem.com</a> adresine yazabilirsiniz.</span>')}
    ${signature()}
  `);

  await sendEmail({
    to,
    subject: `Sınav Sonuçların Açıklandı – ${examTitle}`,
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
