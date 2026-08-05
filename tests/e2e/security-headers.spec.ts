import { expect, test } from "@playwright/test";

/**
 * Güvenlik header'ları ve CSP regresyon testi.
 *
 * Bu testin varlık sebebi: CSP daha önce production'da `'unsafe-eval'`
 * taşıyordu (gerekçe olarak framer-motion gösteriliyordu ama o paket bu
 * projede bağımlılık değil) ve `img-src` düz `http:` kabul ediyordu. Ayrıca
 * `components/analytics/pixels.tsx` içindeki Meta ve TikTok pixel script'leri
 * `script-src` listesinde OLMADIĞI için sessizce bloklanıyordu.
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

  test("CSP production'da unsafe-eval ve düz http: içermez", async ({ request }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"];

    // Gerileme koruması: bu ikisi geri gelirse test kırılmalı.
    expect(csp).not.toContain("'unsafe-eval'");
    const imgSrc = csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("img-src"));
    expect(imgSrc).toBeTruthy();
    expect(imgSrc).not.toMatch(/\bhttp:/);

    // Sıkılaştırma entegrasyonları bozmamalı.
    expect(csp).toContain("https://www.paytr.com");
    expect(csp).toContain("https://www.youtube.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("base-uri 'self'");
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
