import { expect, test } from "@playwright/test";

/**
 * Güvenlik header'ları ve CSP regresyon testi.
 *
 * Bu test nonce tabanlı script politikasını, dar görsel allowlist'ini ve
 * analitik/ödeme entegrasyonlarının gerekli origin'lerini korur.
 */

const ROUTES = ["/", "/yks", "/sss", "/iletisim", "/giris", "/sepet"];

test.describe("güvenlik header'ları", () => {
  test("bütün ana route'larda CSP ve sertleştirme header'ları bulunur", async ({ request }) => {
    for (const route of ROUTES) {
      const response = await request.get(route);
      expect(response.status(), route).toBeLessThan(400);
      const headers = response.headers();

      expect(headers["content-security-policy"], `${route} CSP yok`).toBeTruthy();
      expect(headers["x-content-type-options"], route).toBe("nosniff");
      expect(headers["x-frame-options"], route).toBe("SAMEORIGIN");
      expect(headers["referrer-policy"], route).toBe("strict-origin-when-cross-origin");
      expect(headers["permissions-policy"], route).toContain("camera=()");
    }
  });

  test("CSP production'da nonce kullanır ve geniş script/görsel izni vermez", async ({ request }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"];
    const directives = csp.split(";").map((part) => part.trim());
    const scriptSrc = directives.find((part) => part.startsWith("script-src"));
    const imgSrc = directives.find((part) => part.startsWith("img-src"));

    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(imgSrc).toBeTruthy();
    expect(imgSrc).not.toMatch(/\bhttp:/);
    expect(imgSrc?.split(/\s+/)).not.toContain("https:");

    // Sıkılaştırma entegrasyonları bozmamalı.
    expect(csp).toContain("https://www.paytr.com");
    expect(csp).toContain("https://www.youtube.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("base-uri 'self'");
  });

  test("nonce her istekte yenilenir ve inline script'lere uygulanır", async ({ page, request }) => {
    const first = (await request.get("/")).headers()["content-security-policy"];
    const second = (await request.get("/")).headers()["content-security-policy"];
    const firstNonce = first.match(/'nonce-([^']+)'/)?.[1];
    const secondNonce = second.match(/'nonce-([^']+)'/)?.[1];

    expect(firstNonce).toBeTruthy();
    expect(secondNonce).toBeTruthy();
    expect(firstNonce).not.toBe(secondNonce);

    const response = await page.goto("/yks", { waitUntil: "networkidle" });
    const responseNonce = response?.headers()["content-security-policy"]?.match(/'nonce-([^']+)'/)?.[1];
    const inlineNonces = await page.locator("script:not([src])").evaluateAll((scripts) =>
      scripts.map((script) => (script as HTMLScriptElement).nonce),
    );

    expect(responseNonce).toBeTruthy();
    expect(inlineNonces.length).toBeGreaterThan(0);
    expect(inlineNonces.every((nonce) => nonce === responseNonce)).toBe(true);
  });

  test("analitik pixel origin'leri script-src içinde tanımlıdır", async ({ request }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"];
    const scriptSrc = csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("script-src"));

    // pixels.tsx bu üçünden script yüklüyor; listede yoksa sessizce bloklanır.
    for (const origin of [
      "https://www.googletagmanager.com",
      "https://connect.facebook.net",
      "https://analytics.tiktok.com",
    ]) {
      expect(scriptSrc, `${origin} script-src'de yok`).toContain(origin);
    }
  });

  test("sayfa yüklenirken CSP ihlali oluşmaz", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (/Content Security Policy|Refused to (load|execute|connect)/i.test(text)) violations.push(text);
    });

    for (const route of ["/", "/yks", "/giris"]) {
      await page.goto(route, { waitUntil: "networkidle" });
    }

    expect(violations, `CSP ihlalleri:\n${violations.join("\n")}`).toEqual([]);
  });
});
