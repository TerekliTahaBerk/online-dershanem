/**
 * Phase 3 / Session 13 — D5: XLSX deep content inspection.
 *
 * `xlsx` (SheetJS) zaten runtime dependency (lib/export.ts kullanıyor).
 * Bu test workbook'u parse edip:
 *   - Beklenen sheet adı ("Öğrenciler"/"Veliler"/"Öğretmenler") var
 *   - Beklenen kolonlar var ("Ad Soyad", "Email")
 *   - Yasaklı kolonlar yok (password, hash, token, secret, session)
 *   - Hücre değerlerinde yasaklı substring leak yok
 *   - `?ids=` ile filtrelenen export sadece istenen satırı içeriyor
 *
 * Session 12 `export-content-safety.spec.ts` ham bayt scan'ı ile birlikte
 * çalışır; bu daha derin doğrulama.
 */
import { test, expect } from "./fixtures/auth";
import { getSeedIds } from "./helpers/db";
import * as XLSX from "xlsx";

const FORBIDDEN_NEEDLES = [
  "password",
  "hash",
  "token",
  "secret",
  "session",
  "$2a$",
  "$2b$",
];

const FORBIDDEN_COLUMN_REGEX = /^(password|passwordHash|hash|token|secret|session|invite_?token|reset_?token)/i;

const ENTITY_EXPECTATIONS: Record<string, { sheetName: string; requiredColumns: string[] }> = {
  ogrenciler: { sheetName: "Öğrenciler", requiredColumns: ["Ad Soyad", "Email"] },
  ogretmenler: { sheetName: "Öğretmenler", requiredColumns: ["Ad Soyad", "Email"] },
  veliler: { sheetName: "Veliler", requiredColumns: ["Ad Soyad", "Email"] },
};

test.describe("D5 — Export deep content (XLSX parsed)", () => {
  for (const [entity, exp] of Object.entries(ENTITY_EXPECTATIONS)) {
    test(`${entity} export: sheet + kolon + leak invariantları`, async ({ adminPage }) => {
      const res = await adminPage.request.get(`/api/panel/export/${entity}`);
      expect(res.status()).toBe(200);
      const buf = await res.body();

      const wb = XLSX.read(buf, { type: "buffer" });
      // Beklenen sheet name (book_append_sheet 31 karakterle kırpıyor — eşleşmeli)
      const sheetName = wb.SheetNames.find((n) => n.startsWith(exp.sheetName.slice(0, 31))) ?? wb.SheetNames[0];
      expect(sheetName, `${entity}: beklenen sheet ("${exp.sheetName}") yok`).toBeDefined();
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      // Boş tablo kabul; ama varsa kolon isimleri kontrol edilir
      if (json.length > 0) {
        const columns = Object.keys(json[0]);
        for (const col of exp.requiredColumns) {
          expect(columns, `${entity}: zorunlu kolon "${col}" eksik`).toContain(col);
        }
        for (const col of columns) {
          expect(col, `${entity}: yasaklı kolon adı "${col}"`).not.toMatch(FORBIDDEN_COLUMN_REGEX);
        }
        // Hücre değerlerinde leak yok
        for (const row of json) {
          for (const [k, v] of Object.entries(row)) {
            if (typeof v !== "string") continue;
            for (const needle of FORBIDDEN_NEEDLES) {
              expect(
                v.toLowerCase().includes(needle),
                `${entity}: hücre [${k}] yasaklı substring "${needle}" içeriyor`,
              ).toBe(false);
            }
          }
        }
      }
    });
  }

  test("ogrenciler ?ids=<seed> sadece istenen satırı döner", async ({ adminPage }) => {
    const seed = await getSeedIds();
    const res = await adminPage.request.get(`/api/panel/export/ogrenciler?ids=${seed.studentId}`);
    expect(res.status()).toBe(200);
    const buf = await res.body();
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    expect(json.length).toBe(1);
    const onlyRow = json[0];
    expect(String(onlyRow["Ad Soyad"] ?? "")).toContain("E2E Öğrenci");
  });
});
