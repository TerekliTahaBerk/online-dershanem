import assert from "node:assert/strict";
import test from "node:test";
import { csvCell, csvDocument } from "./csv";

test("CSV hücresi formül enjeksiyonunu etkisizleştirir", () => {
  for (const value of ["=SUM(A1:A2)", "+cmd", "-2+3", "@IMPORTXML(A1)"]) {
    assert.equal(csvCell(value).startsWith('"\''), true);
  }
});

test("CSV tırnak ve satır sonlarını güvenli biçime çevirir", () => {
  assert.equal(csvCell('Ada "Öğrenci"\n8. sınıf'), '"Ada ""Öğrenci"" 8. sınıf"');
});

test("CSV belgesi UTF-8 BOM ve CRLF taşır", () => {
  assert.equal(csvDocument([["Başlık"], ["İçerik"]]), '\uFEFF"Başlık"\r\n"İçerik"\r\n');
});
