import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { totpCode } from "../../lib/auth/mfa-crypto";

const prisma = new PrismaClient();
const email = "security-admin-mfa.e2e@example.com";
const password = "Mfa-E2E-Secure-Password-42";

async function passwordLogin(page: Page) {
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
  await page.waitForURL(/\/giris\/mfa|\/panel/);
}

async function browserPost<T>(page: Page, url: string, body: unknown): Promise<{ status: number; data: T }> {
  const response = await page.request.post(url, {
    data: body,
    headers: { origin: new URL(page.url()).origin },
  });
  return { status: response.status(), data: await response.json() as T };
}

async function resetMfaState() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.rateLimitEntry.deleteMany();
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.mfaChallenge.deleteMany({ where: { userId: user.id } });
  await prisma.mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
  await prisma.passkeyCredential.deleteMany({ where: { userId: user.id } });
  await prisma.adminMfa.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", failedAttempts: 0, lockedUntil: null } });
}

test.describe.serial("admin MFA, recovery, replay and step-up", () => {
  test.skip(process.env.PANEL_E2E_ADMIN_MFA_BYPASS !== "false", "Run with npm run e2e:mfa so the dedicated server enforces MFA.");
  test.setTimeout(90_000);

  test.beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, mustChangePassword: false, role: "ADMIN", status: "ACTIVE", fullName: "MFA E2E Admin" },
      update: { passwordHash, mustChangePassword: false, role: "ADMIN", status: "ACTIVE", failedAttempts: 0, lockedUntil: null },
    });
    await resetMfaState();
  });

  test.afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  test("passkey enrollment, login, and assertion replay rejection", async ({ page }) => {
    await resetMfaState();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    try {
      await passwordLogin(page);
      await page.getByRole("button", { name: /geçiş anahtarı kaydet/i }).click();
      await expect(page.getByRole("heading", { name: /kurtarma kodlarını şimdi kaydedin/i })).toBeVisible();
      await page.getByRole("button", { name: /güvenli alana devam et/i }).click();
      await page.waitForURL(/\/panel/);

      await page.request.post("/api/auth/logout");
      await passwordLogin(page);
      let assertionBody: unknown;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/auth/mfa/passkey/verify")) {
          const body = request.postDataJSON() as { purpose?: string };
          if (body.purpose === "AUTHENTICATE") assertionBody = body;
        }
      });
      await page.getByRole("button", { name: /geçiş anahtarıyla doğrula/i }).click();
      await page.waitForURL(/\/panel/);
      expect(assertionBody).toBeTruthy();
      const replay = await browserPost<{ error: string }>(page, "/api/auth/mfa/passkey/verify", assertionBody);
      expect(replay.status).toBe(409);
    } finally {
      await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId }).catch(() => undefined);
      await cdp.detach().catch(() => undefined);
    }
  });

  test("enrollment, failure, lost-device recovery, replay, step-up, and suspension", async ({ page }) => {
    await resetMfaState();
    await passwordLogin(page);
    await expect(page).toHaveURL(/\/giris\/mfa\/enroll/);

    const begin = await page.evaluate(async () => {
      const response = await fetch("/api/auth/mfa/totp/enroll", { method: "PUT" });
      return { status: response.status, data: await response.json() as { secret: string } };
    });
    expect(begin.status).toBe(200);
    const invalid = await browserPost<{ error: string }>(page, "/api/auth/mfa/totp/enroll", { code: "000000" });
    expect(invalid.status).toBe(400);
    const counter = BigInt(Math.floor(Date.now() / 30_000));
    const enrolled = await browserPost<{ recoveryCodes: string[] }>(page, "/api/auth/mfa/totp/enroll", { code: totpCode(begin.data.secret, counter) });
    expect(enrolled.status).toBe(200);
    expect(enrolled.data.recoveryCodes).toHaveLength(10);

    await page.request.post("/api/auth/logout");
    await passwordLogin(page);
    await expect(page).toHaveURL(/\/giris\/mfa$/);
    const recovered = await browserPost<{ verified: boolean }>(page, "/api/auth/mfa/code/verify", { purpose: "AUTHENTICATE", method: "RECOVERY", code: enrolled.data.recoveryCodes[0] });
    expect(recovered.status).toBe(200);

    await page.request.post("/api/auth/logout");
    await passwordLogin(page);
    const replay = await browserPost<{ error: string }>(page, "/api/auth/mfa/code/verify", { purpose: "AUTHENTICATE", method: "RECOVERY", code: enrolled.data.recoveryCodes[0] });
    expect(replay.status).toBe(400);
    const recoveredAgain = await browserPost<{ verified: boolean }>(page, "/api/auth/mfa/code/verify", { purpose: "AUTHENTICATE", method: "RECOVERY", code: enrolled.data.recoveryCodes[1] });
    expect(recoveredAgain.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id, revokedAt: null }, orderBy: { createdAt: "desc" } });
    await prisma.session.update({ where: { id: session.id }, data: { stepUpAt: new Date(0) } });
    const blocked = await browserPost<{ code: string }>(page, "/api/panel/users", {});
    expect(blocked.status).toBe(428);
    expect(blocked.data.code).toBe("STEP_UP_REQUIRED");

    await prisma.adminMfa.update({ where: { userId: user.id }, data: { totpLastCounter: null } });
    const stepUp = await browserPost<{ verified: boolean }>(page, "/api/auth/mfa/code/verify", { purpose: "STEP_UP", method: "TOTP", code: totpCode(begin.data.secret, BigInt(Math.floor(Date.now() / 30_000))) });
    expect(stepUp.status).toBe(200);
    await prisma.session.update({ where: { id: session.id }, data: { stepUpAt: new Date(0) } });
    const totpReplay = await browserPost<{ error: string }>(page, "/api/auth/mfa/code/verify", { purpose: "STEP_UP", method: "TOTP", code: totpCode(begin.data.secret, BigInt(Math.floor(Date.now() / 30_000))) });
    expect(totpReplay.status).toBe(400);

    await page.request.post("/api/auth/logout");
    await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    await page.goto("/giris");
    await page.getByRole("textbox", { name: "E-posta" }).fill(email);
    await page.getByLabel("Parola").fill(password);
    await page.getByRole("button", { name: /^Giriş yap$/ }).click();
    await expect(page.getByText(/hesabınız askıya alınmış/i)).toBeVisible();
  });
});
