import assert from "node:assert/strict";
import test from "node:test";

import { passwordResetUrlMarker } from "@/lib/auth/password-reset";
import {
  ACCOUNT_CLAIM_MAX_REMINDERS,
  ACCOUNT_CLAIM_REMINDER_STEPS_MS,
  accountClaimRejection,
  accountClaimReminderDue,
  accountClaimTokenId,
  accountClaimUrlMarker,
  createAccountClaimToken,
  materializeAccountClaimEmailHtml,
} from "./account-claim";

// Token gizli anahtarı ÇAĞRI anında okunur; import sırasında değil. Bu yüzden
// burada set etmek yeterlidir ve testler gerçek HMAC üzerinden koşar.
process.env.NEXTAUTH_SECRET ||= "unit-only-secret-0123456789abcdef0123456789abcdef";
process.env.NEXT_PUBLIC_APP_URL = "https://www.onlinedershanem.com";

const NOW = new Date("2026-08-30T12:00:00Z");
const activeUser = { status: "ACTIVE" as const };

test("davet token'ı kendi kimliğini doğrular, kurcalanmış kanıtı reddeder", async () => {
  const { id, token } = await createAccountClaimToken();
  assert.equal(accountClaimTokenId(token), id);

  const [tokenId, proof] = token.split(".");
  assert.equal(accountClaimTokenId(`${tokenId}.${proof.slice(0, -1)}x`), null, "kurcalanmış kanıt kabul edildi");
  assert.equal(accountClaimTokenId(tokenId), null, "kanıtsız token kabul edildi");
  assert.equal(accountClaimTokenId(`${tokenId}.${proof}.extra`), null);
  assert.equal(accountClaimTokenId("kısa"), null);
});

test("davet kanıtı parola sıfırlama kanıtıyla aynı DEĞİLDİR", async () => {
  const { id } = await createAccountClaimToken();
  // Aynı gizli anahtarla üretilseler de alan adları ayrı: bir akışın token'ı
  // diğerinin yerine geçemez.
  const claimHtml = materializeAccountClaimEmailHtml(accountClaimUrlMarker(id));
  const resetMarker = passwordResetUrlMarker(id);
  assert.match(claimHtml, /\/hesap-kur#token=/);
  assert.doesNotMatch(claimHtml, /parola-sifirla/);
  assert.notEqual(accountClaimUrlMarker(id), resetMarker);
});

test("outbox HTML'i gizli değer taşımaz; bağlantı yalnız teslimde oluşur", async () => {
  const { id, token } = await createAccountClaimToken();
  const stored = `<a href="${accountClaimUrlMarker(id)}">Hesabımı kur</a>`;
  assert.doesNotMatch(stored, /\./, "işaretin içinde kanıt görünüyor");
  assert.equal(stored.includes(token), false);

  const delivered = materializeAccountClaimEmailHtml(stored);
  assert.ok(delivered.includes(encodeURIComponent(token)), "teslimde gerçek token üretilmedi");
  // Fragment: erişim loglarına ve Referer başlığına düşmez.
  assert.match(delivered, /#token=/);
  assert.doesNotMatch(delivered, /\?token=/);
});

test("davet kullanılabilirliği durum ve saate göre reddedilir", () => {
  const pending = { status: "PENDING" as const, expiresAt: new Date("2026-09-05T12:00:00Z") };
  assert.equal(accountClaimRejection(pending, activeUser, NOW), null);

  assert.equal(accountClaimRejection(null, activeUser, NOW), "NOT_FOUND");
  assert.equal(accountClaimRejection({ ...pending, status: "CLAIMED" }, activeUser, NOW), "ALREADY_CLAIMED");
  assert.equal(accountClaimRejection({ ...pending, status: "SUPERSEDED" }, activeUser, NOW), "SUPERSEDED");
  assert.equal(accountClaimRejection({ ...pending, status: "EXPIRED" }, activeUser, NOW), "EXPIRED");
  assert.equal(accountClaimRejection(pending, { status: "SUSPENDED" }, NOW), "ACCOUNT_UNAVAILABLE");

  // Cron gecikse ve satır hâlâ PENDING olsa bile saat kazanır.
  assert.equal(accountClaimRejection({ status: "PENDING", expiresAt: NOW }, activeUser, NOW), "EXPIRED");
  assert.equal(accountClaimRejection({ status: "PENDING", expiresAt: new Date(NOW.getTime() + 1) }, activeUser, NOW), null);
});

test("hatırlatma basamakları oluşturma anına sabittir ve üst üste binmez", () => {
  const base = { status: "PENDING", expiresAt: new Date(NOW.getTime() + 5 * 86_400_000) };
  const createdAt = (msAgo: number) => new Date(NOW.getTime() - msAgo);

  assert.equal(accountClaimReminderDue({ ...base, createdAt: createdAt(0), reminderCount: 0 }, NOW), false);
  assert.equal(accountClaimReminderDue({ ...base, createdAt: createdAt(ACCOUNT_CLAIM_REMINDER_STEPS_MS[0]), reminderCount: 0 }, NOW), true);

  // İlk hatırlatma gönderildikten sonra ikinci basamak beklenir; gecikmiş bir
  // cron koşusu iki hatırlatmayı arka arkaya göndermez.
  assert.equal(accountClaimReminderDue({ ...base, createdAt: createdAt(ACCOUNT_CLAIM_REMINDER_STEPS_MS[0]), reminderCount: 1 }, NOW), false);
  assert.equal(accountClaimReminderDue({ ...base, createdAt: createdAt(ACCOUNT_CLAIM_REMINDER_STEPS_MS[1]), reminderCount: 1 }, NOW), true);

  assert.equal(
    accountClaimReminderDue({ ...base, createdAt: createdAt(30 * 86_400_000), reminderCount: ACCOUNT_CLAIM_MAX_REMINDERS }, NOW),
    false,
    "hatırlatma tavanı aşıldı",
  );
  assert.equal(accountClaimReminderDue({ ...base, status: "CLAIMED", createdAt: createdAt(10 * 86_400_000), reminderCount: 0 }, NOW), false);
  assert.equal(
    accountClaimReminderDue({ status: "PENDING", expiresAt: createdAt(1), createdAt: createdAt(20 * 86_400_000), reminderCount: 0 }, NOW),
    false,
    "süresi dolmuş davete hatırlatma gönderildi",
  );
});
