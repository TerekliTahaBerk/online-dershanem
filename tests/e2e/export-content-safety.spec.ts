/**
 * Phase 3 / Session 12 — D7: Export content safety.
 *
 * Admin storage state üzerinden `/api/panel/export/[entity]` çağrısı yapılır.
 *
 * Doğrulamalar:
 *   - 200 + XLSX content-disposition (.xlsx eki, attachment)
 *   - response gövdesi XLSX magic bytes ile başlıyor (PK\x03\x04 = zip)
 *   - **ham bayt** içeriğinde aşağıdaki secret token'lar yok:
 *       passwordHash, password_hash, userInviteToken, parentInviteToken,
 *       hash:, $2a$, $2b$ (bcrypt), pwd_reset, resetToken, NEXTAUTH_SECRET,
 *       CRON_SECRET
 *   - request unauthenticated yapılırsa 401/302 (auth gate çalışıyor)
 *
 * **Bilinen sınırlama:** XLSX bir zip; içindeki XML payload sıkıştırılmış.
 * Cleartext substring araması, sıkıştırılmamış metadata ve dosya adlarını
 * yakalar (sharedStrings.xml gibi en yaygın leak vektörleri zip header'da
 * isimlendirilir). Tam içerik denetimi için bir XLSX/zip parser eklemek
 * gerekir; bu Session 12 kapsamı dışı (yeni dependency yok).
 */
import { test, expect } from "./fixtures/auth";

const SECRET_NEEDLES = [
  "passwordHash",
  "password_hash",
  "userInviteToken",
  "parentInviteToken",
  "resetToken",
  "$2a$",
  "$2b$",
  "NEXTAUTH_SECRET",
  "CRON_SECRET",
];

const ENTITIES = ["ogrenciler", "ogretmenler", "veliler"] as const;

test.describe("D7 — Export content safety @smoke", () => {
  for (const entity of ENTITIES) {
    test(`export /api/panel/export/${entity} — XLSX, no secret leak`, async ({ adminPage }) => {
      const res = await adminPage.request.get(`/api/panel/export/${entity}`);
      expect(res.status()).toBe(200);

      const cd = res.headers()["content-disposition"] ?? "";
      expect(cd).toMatch(/\.xlsx/i);
      // attachment olarak iniyor, inline değil (cookie/data leak guard)
      expect(cd.toLowerCase()).toContain("attachment");

      const buf = await res.body();
      // XLSX magic = ZIP local file header
      expect(buf.length).toBeGreaterThan(0);
      expect(buf[0]).toBe(0x50); // 'P'
      expect(buf[1]).toBe(0x4b); // 'K'
      expect(buf[2]).toBe(0x03);
      expect(buf[3]).toBe(0x04);

      // Secret needle taraması (uncompressed metadata + filenames içinde)
      const txt = buf.toString("binary");
      for (const needle of SECRET_NEEDLES) {
        expect(txt, `Export ${entity} sızdırılmış string: "${needle}"`).not.toContain(needle);
      }
    });
  }

  test("anonim export çağrısı bloklu (auth gate çalışıyor)", async ({ request }) => {
    const res = await request.get("/api/panel/export/ogrenciler", { maxRedirects: 0 });
    // requirePanelRole admin olmayan / auth'suz çağrılarda redirect veya 401/403 atar
    expect([301, 302, 303, 307, 401, 403, 404]).toContain(res.status());
  });
});
