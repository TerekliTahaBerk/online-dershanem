import assert from "node:assert/strict";
import test from "node:test";
import { resolveBookletFile, sessionBookletIssues } from "./booklet-access";

const whole = { id: "f-all", sessionKey: "" };
const sozel = { id: "f-sozel", sessionKey: "SOZEL" };
const sayisal = { id: "f-sayisal", sessionKey: "SAYISAL" };

test("oturumsuz sınav: tüm deneme kitapçığı", () => {
  assert.deepEqual(resolveBookletFile([whole], null), { ok: true, fileId: "f-all", scope: "EXAM" });
  assert.deepEqual(resolveBookletFile([], null), { ok: false, code: "BOOKLET_MISSING", status: 404 });
});

test("LGS Sözel açıkken yalnız Sözel kitapçığı; Sayısal açıkken yalnız Sayısal", () => {
  assert.deepEqual(resolveBookletFile([sozel, sayisal], { phase: "SESSION", currentKey: "SOZEL" }), { ok: true, fileId: "f-sozel", scope: "SESSION" });
  assert.deepEqual(resolveBookletFile([sozel, sayisal], { phase: "SESSION", currentKey: "SAYISAL" }), { ok: true, fileId: "f-sayisal", scope: "SESSION" });
});

test("ara ve bitişte kitapçık verilmez", () => {
  assert.deepEqual(resolveBookletFile([sozel, sayisal, whole], { phase: "BREAK", currentKey: "SAYISAL" }), { ok: false, code: "SESSION_BREAK", status: 403 });
  assert.deepEqual(resolveBookletFile([whole], { phase: "FINISHED", currentKey: null }), { ok: false, code: "SESSION_FINISHED", status: 403 });
});

test("oturum kitapçığı düzeninde eksik oturum birleşik dosyaya düşmez", () => {
  assert.deepEqual(resolveBookletFile([sozel, whole], { phase: "SESSION", currentKey: "SAYISAL" }), { ok: false, code: "BOOKLET_MISSING", status: 404 });
});

test("eski içerik: oturumlu sınavda yalnız birleşik kitapçık varsa açık oturumda verilir", () => {
  assert.deepEqual(resolveBookletFile([whole], { phase: "SESSION", currentKey: "SOZEL" }), { ok: true, fileId: "f-all", scope: "EXAM" });
});

test("hazırlık: oturum kitapçıkları eksiksiz olmalı; yalnız birleşik kitapçık uyarı", () => {
  assert.deepEqual(sessionBookletIssues([], [""]), []);
  assert.deepEqual(sessionBookletIssues(["SOZEL", "SAYISAL"], ["SOZEL", "SAYISAL"]), []);
  assert.deepEqual(sessionBookletIssues(["SOZEL", "SAYISAL"], ["SOZEL"]).map((issue) => [issue.level, issue.code]), [["error", "SESSION_BOOKLET_MISSING"]]);
  assert.deepEqual(sessionBookletIssues(["SOZEL", "SAYISAL"], [""]).map((issue) => [issue.level, issue.code]), [["warning", "SESSION_BOOKLET_RECOMMENDED"]]);
  assert.deepEqual(sessionBookletIssues(["SOZEL", "SAYISAL"], ["SOZEL", "SAYISAL", "ESKI"]).map((issue) => issue.code), ["BOOKLET_UNKNOWN_SESSION"]);
});

test("hazırlık kontrolü oturum kitapçığı kuralını uygular (LGS tam deneme)", async () => {
  const { validateVersionReadiness } = await import("./exam-domain");
  const base = { family: "LGS" as const, familyCode: "LGS", durationMinutes: 155, scoringPolicyCode: "LGS_FULL_V1", structureMode: "FULL_TEMPLATE" as const, templateCode: "LGS_FULL", requireOutcomes: false, sections: [], sessionKeys: ["SOZEL", "SAYISAL"] };
  const codes = (bookletSessionKeys: string[]) => validateVersionReadiness({ ...base, files: ["BOOKLET_PDF"], bookletSessionKeys }).filter((issue) => issue.code.includes("BOOKLET")).map((issue) => `${issue.level}:${issue.code}`);
  assert.deepEqual(codes(["SOZEL"]), ["error:SESSION_BOOKLET_MISSING"]);
  assert.deepEqual(codes([""]), ["warning:SESSION_BOOKLET_RECOMMENDED"]);
  assert.deepEqual(codes(["SOZEL", "SAYISAL"]), []);
});

test("çoklu kitapçık: öğrenci yalnız kendi kitapçık türünün PDF'ini alır; A ortak dosyaya düşebilir, B düşemez", () => {
  const files = [
    { id: "a-sozel", sessionKey: "SOZEL", bookletCode: "A" },
    { id: "b-sozel", sessionKey: "SOZEL", bookletCode: "B" },
    { id: "ortak", sessionKey: "", bookletCode: "" },
  ];
  const sozel = { phase: "SESSION" as const, currentKey: "SOZEL" };
  assert.deepEqual(resolveBookletFile(files, sozel, "B"), { ok: true, fileId: "b-sozel", scope: "SESSION" });
  assert.deepEqual(resolveBookletFile(files, sozel, "A"), { ok: true, fileId: "a-sozel", scope: "SESSION" });
  assert.deepEqual(resolveBookletFile([{ id: "ortak", sessionKey: "", bookletCode: "" }], null, "A"), { ok: true, fileId: "ortak", scope: "EXAM" });
  assert.deepEqual(resolveBookletFile([{ id: "ortak", sessionKey: "", bookletCode: "" }], null, "B"), { ok: false, code: "BOOKLET_MISSING", status: 404 });
});

test("hazırlık: çoklu kitapçıkta her kitapçığın (ve oturumun) PDF'i gerekir", async () => {
  const { bookletFileIssues } = await import("./booklet-access");
  assert.deepEqual(bookletFileIssues(["A"], [], [{ sessionKey: "", bookletCode: "" }]), []);
  assert.deepEqual(bookletFileIssues(["A", "B"], [], [{ sessionKey: "", bookletCode: "" }, { sessionKey: "", bookletCode: "B" }]), []);
  assert.deepEqual(bookletFileIssues(["A", "B"], [], [{ sessionKey: "", bookletCode: "" }]).map((issue) => issue.code), ["BOOKLET_TYPE_PDF_MISSING"]);
  assert.deepEqual(bookletFileIssues(["A", "B"], ["SOZEL", "SAYISAL"], [{ sessionKey: "SOZEL", bookletCode: "A" }, { sessionKey: "SAYISAL", bookletCode: "A" }, { sessionKey: "SOZEL", bookletCode: "B" }]).map((issue) => issue.message), ["B kitapçığının SAYISAL oturumu PDF'i yüklenmedi."]);
});
