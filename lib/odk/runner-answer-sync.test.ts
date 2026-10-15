import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { pendingStorageKey, readPendingAnswers, reconcileAnswerResponse, restorePendingAnswers, writePendingAnswers, type PendingAnswer } from "./runner-answer-sync";

/** P0-6 / P0-7 / P0-8 (docs/roadmaps/odk-exam-experience-overhaul.md). */

const intent = (overrides: Partial<PendingAnswer> = {}): PendingAnswer => ({ questionId: "q1", selectedOption: "C", isMarked: false, revision: 3, ...overrides });

test("başarılı kayıt bekleyen cevabı kapatır", () => {
  assert.deepEqual(reconcileAnswerResponse(intent(), { ok: true, answer: { selectedOption: "C", isMarked: false, revision: 3 } }), { action: "SETTLED", revision: 3 });
});

test("çakışmada sunucu eski cevaptaysa yerel niyet sunucu revizyonunun üstüne yeniden gönderilir", () => {
  // Senaryo: A (rev1) kaydedildi, B (rev2) ağda kayboldu, C (rev3) → sunucu rev2 bekliyor.
  const decision = reconcileAnswerResponse(intent(), { ok: false, code: "REVISION_CONFLICT", answer: { selectedOption: "A", isMarked: false, revision: 1 } });
  assert.deepEqual(decision, { action: "RESEND", payload: intent({ revision: 2 }) });
});

test("çakışmada sunucu zaten yerel niyetteyse (başka sekme aynı cevabı yazdı) kapanır", () => {
  assert.deepEqual(reconcileAnswerResponse(intent(), { ok: false, code: "REVISION_CONFLICT", answer: { selectedOption: "C", isMarked: false, revision: 7 } }), { action: "SETTLED", revision: 7 });
});

test("çakışmada sunucuda kayıt yoksa revizyon 1 ile yeniden gönderilir", () => {
  assert.deepEqual(reconcileAnswerResponse(intent({ revision: 4 }), { ok: false, code: "REVISION_CONFLICT", answer: null }), { action: "RESEND", payload: intent({ revision: 1 }) });
});

test("kalıcı reddedilen kayıt (oturum kapalı) düşürülür; geçici hata beklemede kalır", () => {
  assert.deepEqual(reconcileAnswerResponse(intent(), { ok: false, code: "SESSION_LOCKED" }), { action: "DROP" });
  assert.deepEqual(reconcileAnswerResponse(intent(), { ok: false, code: "ATTEMPT_CLOSED" }), { action: "DROP" });
  // Canlı sınavda revizyonla iptal edilen soru: kayıt hiç kabul edilmeyecek, teslimi engellememeli.
  assert.deepEqual(reconcileAnswerResponse(intent(), { ok: false, code: "QUESTION_NOT_IN_VERSION" }), { action: "DROP" });
  assert.deepEqual(reconcileAnswerResponse(intent(), { ok: false, code: null }), { action: "RETRY_LATER" });
});

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

test("bekleyen cevaplar deneme bazlı saklanır ve geri okunur; boş liste kaydı siler", () => {
  const storage = memoryStorage();
  writePendingAnswers(storage, "att-1", { q1: intent(), q2: intent({ questionId: "q2", selectedOption: null, isMarked: true, revision: 1 }) });
  assert.deepEqual(Object.keys(readPendingAnswers(storage, "att-1")).sort(), ["q1", "q2"]);
  assert.deepEqual(readPendingAnswers(storage, "baska-deneme"), {});
  writePendingAnswers(storage, "att-1", {});
  assert.equal(storage.data.has(pendingStorageKey("att-1")), false);
});

test("bozuk ya da erişilemeyen depolama akışı bozmaz", () => {
  const storage = memoryStorage();
  storage.setItem(pendingStorageKey("att-1"), "{bozuk");
  assert.deepEqual(readPendingAnswers(storage, "att-1"), {});
  storage.setItem(pendingStorageKey("att-1"), JSON.stringify({ v: 1, answers: { q1: { questionId: "q1", selectedOption: "Z", isMarked: false, revision: 1 } } }));
  assert.deepEqual(readPendingAnswers(storage, "att-1"), {});
  const throwing = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceeded"); }, removeItem: () => { throw new Error("x"); } };
  assert.deepEqual(readPendingAnswers(throwing, "att-1"), {});
  assert.doesNotThrow(() => writePendingAnswers(throwing, "att-1", { q1: intent() }));
  assert.deepEqual(readPendingAnswers(null, "att-1"), {});
});

test("yenileme sonrası: sunucudan farklı yerel niyetler geri yüklenir, aynı olanlar atılır", () => {
  const restored = restorePendingAnswers(
    { q1: intent({ selectedOption: "C", revision: 3 }), q2: intent({ questionId: "q2", selectedOption: "B", revision: 2 }), q3: intent({ questionId: "q3", selectedOption: "D", revision: 1 }) },
    { q1: { selectedOption: "A", isMarked: false, revision: 1 }, q2: { selectedOption: "B", isMarked: false, revision: 2 } },
    new Set(["q1", "q2", "q3"]),
  );
  assert.deepEqual(restored, {
    q1: intent({ selectedOption: "C", revision: 2 }),
    q3: intent({ questionId: "q3", selectedOption: "D", revision: 1 }),
  });
});

test("yenileme sonrası: artık yazılamayan (kilitli oturum) sorunun niyeti geri yüklenmez", () => {
  const restored = restorePendingAnswers({ q1: intent() }, {}, new Set(["q2"]));
  assert.deepEqual(restored, {});
});

test("ODK bileşenlerinde kaldırılan her olay dinleyicisi eklenen bir olay türüyle eşleşir (blur-sm regresyonu)", () => {
  const dir = join(process.cwd(), "components/odk");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".tsx"))) {
    const source = readFileSync(join(dir, file), "utf8");
    const added = new Set([...source.matchAll(/addEventListener\(\s*"([^"]+)"/g)].map((match) => match[1]));
    for (const [, type] of source.matchAll(/removeEventListener\(\s*"([^"]+)"/g)) {
      assert.ok(added.has(type), `${file}: removeEventListener("${type}") eşleşen addEventListener olmadan`);
    }
  }
});
