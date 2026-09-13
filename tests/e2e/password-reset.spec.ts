import { scrypt } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword, needsRehash } from "../../lib/auth/password";
import { materializePasswordResetEmailHtml } from "../../lib/auth/password-reset";

const prisma = new PrismaClient();
const email = "password-reset.e2e@example.com";
const oldPassword = "Password-Reset-Old-42";
const newPassword = "Password-Reset-New-84";

function lowCostHash(password: string): Promise<string> {
  const salt = Buffer.from("password-reset-e2e-salt");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 1024, r: 8, p: 1, maxmem: 32 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(`scrypt$1024$8$1$${salt.toString("base64")}$${key.toString("base64")}`);
    });
  });
}

async function login(page: Page, password: string) {
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(email);
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click();
}

async function requestReset(page: Page, requestedEmail: string) {
  await page.goto("/parolami-unuttum");
  await page.getByRole("textbox", { name: "E-posta" }).fill(requestedEmail);
  await page.getByRole("button", { name: /yenileme bağlantısı gönder/i }).click();
  await expect(page.getByText(/e-posta hesabımızda kayıtlıysa/i)).toBeVisible();
}

async function latestToken() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const reset = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const outbox = await prisma.emailOutbox.findFirstOrThrow({ where: { subject: "Parolanızı yenileyin – Online Dershanem" }, orderBy: { createdAt: "desc" } });
  const delivered = materializePasswordResetEmailHtml(outbox.html);
  const encoded = delivered.match(/\/parola-sifirla#token=([^"<]+)/)?.[1];
  if (!encoded) throw new Error("Reset token was not materialized");
  const token = decodeURIComponent(encoded);
  expect(outbox.html).not.toContain(token);
  expect(reset.tokenHash).not.toBe(token);
  return { user, reset, token };
}

test.describe.serial("self-service password reset", () => {
  test.beforeAll(async () => {
    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash: await hashPassword(oldPassword), mustChangePassword: false, inviteAcceptedAt: new Date(), role: "STUDENT", status: "ACTIVE", fullName: "Password Reset E2E" },
      update: { passwordHash: await hashPassword(oldPassword), mustChangePassword: false, inviteAcceptedAt: new Date(), status: "ACTIVE", failedAttempts: 0, lockedUntil: null },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.rateLimitEntry.deleteMany();
    await prisma.emailOutbox.deleteMany({ where: { subject: "Parolanızı yenileyin – Online Dershanem" } });
  });

  test.afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.emailOutbox.deleteMany({ where: { subject: "Parolanızı yenileyin – Online Dershanem" } });
    await prisma.$disconnect();
  });

  test("generic request, expiry, reset, replay, session revocation, login, and rehash", async ({ browser, page }) => {
    test.setTimeout(90_000);

    await requestReset(page, "missing-password-reset.e2e@example.com");

    const oldContext: BrowserContext = await browser.newContext();
    const oldSessionPage = await oldContext.newPage();
    await login(oldSessionPage, oldPassword);
    await oldSessionPage.waitForURL(/\/panel/);

    await requestReset(page, email);
    let current = await latestToken();
    await prisma.passwordResetToken.update({ where: { id: current.reset.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
    const expired = await page.request.post("/api/auth/reset-password", { data: { token: current.token, newPassword }, headers: { origin: new URL(page.url()).origin } });
    expect(expired.status()).toBe(400);

    await prisma.rateLimitEntry.deleteMany();
    await requestReset(page, email);
    current = await latestToken();
    await page.goto(`/parola-sifirla#token=${encodeURIComponent(current.token)}`);
    await page.getByLabel("Yeni parola", { exact: true }).fill(newPassword);
    await page.getByLabel("Yeni parola (tekrar)").fill(newPassword);
    await page.getByRole("button", { name: "Parolayı yenile" }).click();
    await page.waitForURL(/\/giris\?password-reset=success/);
    await expect(page.getByText(/parolanız yenilendi/i)).toBeVisible();

    const replay = await page.request.post("/api/auth/reset-password", { data: { token: current.token, newPassword: "Password-Reset-Replay-99" }, headers: { origin: new URL(page.url()).origin } });
    expect(replay.status()).toBe(400);

    await oldSessionPage.goto("/panel");
    await oldSessionPage.waitForURL(/\/giris/);
    await oldContext.close();

    await login(page, oldPassword);
    await expect(
      page.getByRole("alert").filter({ hasText: /e-posta veya parola hatalı/i }),
    ).toContainText(/e-posta veya parola hatalı/i);
    await login(page, newPassword);
    await page.waitForURL(/\/panel/);

    await page.request.post("/api/auth/logout", { headers: { origin: new URL(page.url()).origin } });
    const legacyHash = await lowCostHash(newPassword);
    expect(needsRehash(legacyHash)).toBe(true);
    await prisma.user.update({ where: { id: current.user.id }, data: { passwordHash: legacyHash } });
    await login(page, newPassword);
    await page.waitForURL(/\/panel/);
    const upgraded = await prisma.user.findUniqueOrThrow({ where: { id: current.user.id }, select: { passwordHash: true } });
    expect(needsRehash(upgraded.passwordHash)).toBe(false);
    expect(upgraded.passwordHash).not.toBe(legacyHash);
  });
});
