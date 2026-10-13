import test from "node:test";
import assert from "node:assert/strict";
import { classifyNotification, PUSH_COPY, pushCopyFor, pushRecipientRoles, pushRoleAllowed } from "./classification";

const row = (href: string, extra: Partial<Parameters<typeof classifyNotification>[0]> = {}) => ({ type: "SYSTEM" as const, sourceType: null, category: null, preferenceKey: null, href, ...extra });

test("öğrenci / veli sınıflandırması değişmez; personel yolu öğrenciye push olmaz", () => {
  assert.equal(classifyNotification(row("/panel/ogrenci/odevler"))?.category, "GENERAL");
  assert.equal(classifyNotification(row("/panel/ogretmen/ders/l1")), null);
  assert.equal(classifyNotification(row("/panel/ogrenci", { type: "PAYMENT" })), null);
});

test("personel push yalnız bayrakla, yalnız personel yollarında ve finans hariç; metin geneldir", () => {
  const teacher = { role: "TEACHER", staffPush: true };
  assert.equal(classifyNotification(row("/panel/ogretmen/ders/l1"), { role: "TEACHER", staffPush: false }), null);
  assert.equal(classifyNotification(row("/panel/ogretmen/ders/l1"), teacher)?.category, "STAFF");
  assert.equal(classifyNotification(row("/panel/odk/yonetim/sonuclar"), { role: "ADMIN", staffPush: true })?.category, "STAFF");
  assert.equal(classifyNotification(row("/panel/yonetim/siparisler/o1"), { role: "ADMIN", staffPush: true }), null);
  assert.equal(classifyNotification(row("/panel/yonetim/isletme/gelirler"), { role: "ADMIN", staffPush: true }), null);
  assert.equal(classifyNotification(row("/panel/ogrenci/odevler"), teacher), null);
  assert.equal(classifyNotification(row("/panel/ogretmen", { preferenceKey: "payment" }), teacher), null);
  assert.equal(classifyNotification(row("https://dis.example.com/panel/ogretmen"), teacher), null);
  assert.doesNotMatch(PUSH_COPY.STAFF.body, /öğrenci|net|puan/i);
});

test("push rolleri bayrağa bağlıdır", () => {
  assert.deepEqual(pushRecipientRoles(false), ["STUDENT", "PARENT"]);
  assert.equal(pushRoleAllowed("TEACHER", false), false);
  assert.equal(pushRoleAllowed("ADMIN", true), true);
  assert.equal(pushRoleAllowed("PARENT", false), true);
});

test("ödev / plan görevi olayları kişisel veri içermeyen kendi metniyle gider", () => {
  const done = { type: "ASSIGNMENT" as const, sourceType: null, category: "ASSIGNMENT:DONE", preferenceKey: null, href: "/panel/veli/odevler?studentId=s1" };
  const parentClass = classifyNotification(done, { role: "PARENT" });
  assert.equal(parentClass?.category, "ASSIGNMENT");
  assert.equal(pushCopyFor(parentClass!, done).body, "Bir ödev tamamlandı.");
  const coachRow = { ...done, category: "PLAN_TASK:DONE", href: "/panel/ogretmen/hazirlik/s1" };
  const coachClass = classifyNotification(coachRow, { role: "TEACHER", staffPush: true });
  assert.equal(coachClass?.category, "STAFF");
  assert.equal(pushCopyFor(coachClass!, coachRow).body, "Plandaki bir görevde ilerleme var.");
  // Kategorisiz eski satır varsayılan metne düşer.
  assert.equal(pushCopyFor(parentClass!, { category: null }).body, PUSH_COPY.ASSIGNMENT.body);
});
