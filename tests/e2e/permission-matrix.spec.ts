import { expect, test, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./helpers/client-ip";

/**
 * §11–§14 — YETKİ MATRİSİ.
 *
 * Rol × uç nokta çarpımını tek tek elle yazmak yerine veriyle sürüyoruz: her
 * uç nokta hangi rollere AÇIK olduğunu bildirir, test geri kalan her rol için
 * kapının KAPALI olduğunu doğrular. Yeni bir rota eklendiğinde tabloya bir
 * satır yazmak yeterli; unutulan rol kombinasyonu diye bir şey kalmıyor.
 *
 * Sınıflandırma kasıtlı olarak "yetki reddi" ile "iş kuralı reddi"ni ayırır:
 * 400 (doğrulama), 409 (çakışma), 428 (step-up gerek) kapının AÇILDIĞI
 * anlamına gelir — istek yetkiyi geçmiş, gövdeye takılmıştır. Yazma uçlarına
 * bilerek geçersiz gövde gönderiyoruz ki izinli rolde gerçek bir mutasyon
 * oluşmasın; ölçülen tek şey yetki sınırı olsun.
 */

type Role = "admin" | "teacher" | "student" | "parent" | "anonymous";

const ALL_ROLES: Role[] = ["admin", "teacher", "student", "parent", "anonymous"];

const CREDENTIALS: Record<Exclude<Role, "anonymous">, { email?: string; password?: string }> = {
  admin: { email: process.env.PANEL_E2E_ADMIN_EMAIL, password: process.env.PANEL_E2E_ADMIN_PASSWORD },
  teacher: { email: process.env.PANEL_E2E_TEACHER_EMAIL, password: process.env.PANEL_E2E_TEACHER_PASSWORD },
  student: { email: process.env.PANEL_E2E_STUDENT_EMAIL, password: process.env.PANEL_E2E_STUDENT_PASSWORD },
  parent: { email: process.env.PANEL_E2E_PARENT_EMAIL, password: process.env.PANEL_E2E_PARENT_PASSWORD },
};

/** Tohumda hiçbir öğretmenin grubunda ve hiçbir velinin bağlantısında olmayan öğrenci. */
const OUT_OF_SCOPE_STUDENT = "e2e-student-profile-plan-foreign";
/** Velinin bağlı olduğu, öğretmenin grubundaki öğrenci. */
const IN_SCOPE_STUDENT = "e2e-student-profile";

type Probe = {
  name: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  /** Kapının açılması beklenen roller. Listede olmayan her rol reddedilmeli. */
  allow: Role[];
};

const READ_PROBES: Probe[] = [
  { name: "bildirimler", method: "GET", path: "/api/panel/notifications", allow: ["admin", "teacher", "student", "parent"] },
  { name: "öğrenci ana sayfa", method: "GET", path: "/api/panel/student/home", allow: ["student"] },
  { name: "öğrenci profili", method: "GET", path: "/api/panel/student/profile", allow: ["student"] },
  { name: "öğrenci dersleri", method: "GET", path: "/api/panel/student/lessons", allow: ["student"] },
  { name: "öğrenci ilerlemesi", method: "GET", path: "/api/panel/student/progress", allow: ["student"] },
  { name: "öğrenci ödevleri", method: "GET", path: "/api/panel/assignments", allow: ["student"] },
  { name: "öğrenci materyalleri", method: "GET", path: "/api/panel/materials", allow: ["student"] },
  { name: "deneme listesi", method: "GET", path: "/api/panel/mock-exams", allow: ["student"] },
  { name: "yönetim raporu dışa aktarma", method: "GET", path: "/api/panel/reports/export?range=30", allow: ["admin"] },
  { name: "yönetim analitiği dışa aktarma", method: "GET", path: "/api/panel/analytics/export", allow: ["admin"] },
  { name: "global arama", method: "GET", path: "/api/panel/admin-search?q=e2e", allow: ["admin", "teacher"] },
  { name: "önizleme adayları", method: "GET", path: "/api/panel/admin-preview/candidates", allow: ["admin"] },
  { name: "grup öğrencileri", method: "GET", path: "/api/panel/groups/e2e-group/students", allow: ["admin"] },
  { name: "öğrenci–öğretmen bağlantıları", method: "GET", path: `/api/panel/student-teachers?studentId=${IN_SCOPE_STUDENT}`, allow: ["admin", "teacher"] },
  { name: "kazanım araması", method: "GET", path: "/api/panel/curriculum/outcomes/search?query=a", allow: ["teacher"] },
  { name: "takvim ics dışa aktarma", method: "GET", path: "/api/panel/calendar/export", allow: ["admin", "teacher", "student", "parent"] },
  { name: "arşiv etkisi", method: "GET", path: "/api/panel/users/e2e-user-student/archive-impact", allow: ["admin"] },
  { name: "öğretmen offboarding önizleme", method: "GET", path: "/api/panel/users/e2e-user-teacher/offboarding", allow: ["admin"] },
];

const WRITE_PROBES: Probe[] = [
  { name: "ders oluşturma", method: "POST", path: "/api/panel/lessons", body: {}, allow: ["admin", "teacher"] },
  { name: "ders serisi önizleme", method: "POST", path: "/api/panel/lessons/preview-series", body: {}, allow: ["admin", "teacher"] },
  { name: "ders güncelleme", method: "PATCH", path: "/api/panel/lessons/e2e-lesson", body: {}, allow: ["admin"] },
  { name: "ders kapanışı", method: "PUT", path: "/api/panel/lessons/e2e-lesson/notes", body: {}, allow: ["teacher"] },
  { name: "ödev oluşturma", method: "POST", path: "/api/panel/assignments", body: {}, allow: ["admin", "teacher"] },
  { name: "ödev güncelleme", method: "PATCH", path: "/api/panel/assignments/e2e-assignment", body: {}, allow: ["admin", "teacher"] },
  { name: "ödev ilerlemesi", method: "PATCH", path: "/api/panel/assignments/e2e-assignment/progress", body: {}, allow: ["student"] },
  { name: "ödev teslimi", method: "POST", path: "/api/panel/assignments/e2e-assignment/submissions", body: {}, allow: ["student"] },
  { name: "teslim değerlendirme", method: "POST", path: "/api/panel/assignment-submissions/e2e-assignment-submission-foreign/review", body: {}, allow: ["teacher"] },
  { name: "materyal oluşturma", method: "POST", path: "/api/panel/materials", body: {}, allow: ["admin", "teacher"] },
  { name: "öğretmen AI taslağı", method: "POST", path: "/api/panel/ai-drafts", body: {}, allow: ["teacher"] },
  { name: "müfredat sürümü", method: "POST", path: "/api/panel/curriculum/versions", body: {}, allow: ["admin"] },
  { name: "kullanıcı oluşturma", method: "POST", path: "/api/panel/users", body: {}, allow: ["admin"] },
  { name: "kullanıcı durumu", method: "POST", path: "/api/panel/users/e2e-user-student/status", body: {}, allow: ["admin"] },
  { name: "veli–öğrenci bağlama", method: "POST", path: "/api/panel/relationships", body: {}, allow: ["admin"] },
  { name: "öğrenci–öğretmen bağlama", method: "POST", path: "/api/panel/student-teachers", body: {}, allow: ["admin"] },
  { name: "grup oluşturma", method: "POST", path: "/api/panel/groups", body: {}, allow: ["admin"] },
  { name: "haftalık özet yayınlama", method: "POST", path: "/api/panel/weekly-digests/generate", body: {}, allow: ["teacher"] },
  { name: "telafi paketi üretme", method: "POST", path: "/api/panel/recovery-packages/generate", body: {}, allow: ["teacher"] },
  { name: "öğrenci check-in", method: "POST", path: "/api/panel/student-check-ins", body: {}, allow: ["student"] },
  { name: "admin önizleme başlatma", method: "POST", path: "/api/panel/admin-preview", body: {}, allow: ["admin"] },
  { name: "admin öğretmen modu", method: "POST", path: "/api/panel/admin-teacher-mode", body: {}, allow: ["admin"] },
];

type ProbeResult = { status: number; error: string | null };

/**
 * `api-guards.ts` yetki reddini bu gövdelerle işaretler. Statü tek başına
 * yetmiyor: ürün erişimi reddi de 404, "kayıt yok" da 404.
 */
const AUTH_DENIED_ERRORS = [
  "Oturumunuz sona ermiş. Tekrar giriş yapın.",
  "Bu işlem için yetkiniz yok.",
  "Bu ürün için aktif erişiminiz yok.",
  "Bu pilot erişimi etkin değil.",
  "Panel şu anda kapalı.",
  "Devam etmeden önce parolanızı değiştirmeniz gerekiyor.",
];

function isAuthDenied(result: ProbeResult): boolean {
  if (result.status === 401 || result.status === 403 || result.status === 503) return true;
  if (result.status === 404 && result.error && AUTH_DENIED_ERRORS.includes(result.error)) return true;
  return false;
}

async function callApi(page: Page, probe: Probe): Promise<ProbeResult> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const response = await fetch(path, {
        method,
        headers: body === undefined ? {} : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      let error: string | null = null;
      try {
        const payload = await response.clone().json();
        error = typeof payload?.error === "string" ? payload.error : null;
      } catch {
        error = null;
      }
      return { status: response.status, error };
    },
    { method: probe.method, path: probe.path, body: probe.body },
  );
}

async function loginAs(page: Page, role: Role): Promise<void> {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout");
  if (role === "anonymous") {
    // Uç noktaları uygulama origin'inden çağırabilmek için sayfa yine de açık
    // olmalı; oturum kurmuyoruz.
    await page.goto("/giris");
    return;
  }
  const account = CREDENTIALS[role];
  await page.goto("/giris");
  await expect(page.getByRole("button", { name: /^Giriş Yap$/ })).toBeEnabled();
  await page.getByRole("textbox", { name: "E-posta" }).fill(account.email!);
  await page.getByLabel("Şifre").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click();
  await page.waitForURL(/\/panel\//, { timeout: 20_000 });
}

const credentialsReady = Object.values(CREDENTIALS).every((item) => item.email && item.password);

test.describe("yetki matrisi", () => {
  test.skip(!credentialsReady, "Panel E2E hesapları tanımlı değil.");

  for (const role of ALL_ROLES) {
    test(`${role} rolü okuma matrisini ihlal etmez`, async ({ page }) => {
      await loginAs(page, role);
      const violations: string[] = [];
      for (const probe of READ_PROBES) {
        const result = await callApi(page, probe);
        const denied = isAuthDenied(result);
        const shouldAllow = probe.allow.includes(role);
        if (shouldAllow && denied) {
          violations.push(`AÇIK OLMALI ama reddedildi: ${probe.name} (${result.status} ${result.error ?? ""})`);
        }
        if (!shouldAllow && !denied) {
          violations.push(`KAPALI OLMALI ama açıldı: ${probe.name} (${result.status} ${result.error ?? ""})`);
        }
      }
      expect(violations, violations.join("\n")).toEqual([]);
    });

    test(`${role} rolü yazma matrisini ihlal etmez`, async ({ page }) => {
      await loginAs(page, role);
      const violations: string[] = [];
      for (const probe of WRITE_PROBES) {
        const result = await callApi(page, probe);
        const denied = isAuthDenied(result);
        const shouldAllow = probe.allow.includes(role);
        if (shouldAllow && denied) {
          violations.push(`AÇIK OLMALI ama reddedildi: ${probe.name} (${result.status} ${result.error ?? ""})`);
        }
        if (!shouldAllow && !denied) {
          violations.push(`KAPALI OLMALI ama açıldı: ${probe.name} (${result.status} ${result.error ?? ""})`);
        }
      }
      expect(violations, violations.join("\n")).toEqual([]);
    });
  }
});

test.describe("yatay erişim — kapsam dışı öğrenci kimliği", () => {
  test.skip(!credentialsReady, "Panel E2E hesapları tanımlı değil.");

  const scopedEndpoints = (studentId: string) => [
    { name: "birleşik takvim", path: `/api/panel/student-success/calendar?studentId=${studentId}` },
    { name: "ilerleme özeti", path: `/api/panel/student-success/progress/${studentId}` },
    { name: "ilerleme kazanımları", path: `/api/panel/student-success/progress/${studentId}?view=outcomes` },
    { name: "ilerleme zaman çizelgesi", path: `/api/panel/student-success/progress/${studentId}?view=timeline` },
  ];

  for (const role of ["parent", "teacher", "student"] as const) {
    test(`${role} kapsamı dışındaki öğrencinin verisini okuyamaz`, async ({ page }) => {
      await loginAs(page, role);
      for (const endpoint of scopedEndpoints(OUT_OF_SCOPE_STUDENT)) {
        const result = await callApi(page, { name: endpoint.name, method: "GET", path: endpoint.path, allow: [] });
        expect(
          result.status,
          `${endpoint.name} kapsam dışı kimliğe ${result.status} döndü; 404 bekleniyor`,
        ).toBe(404);
      }
    });
  }

  test("veli bağlı olduğu öğrencinin verisini okuyabilir", async ({ page }) => {
    await loginAs(page, "parent");
    for (const endpoint of scopedEndpoints(IN_SCOPE_STUDENT)) {
      const result = await callApi(page, { name: endpoint.name, method: "GET", path: endpoint.path, allow: [] });
      expect(result.status, `${endpoint.name} bağlı öğrenciye ${result.status} döndü`).toBe(200);
    }
  });

  test("anonim istek kapsamlı uçlara hiç ulaşamaz", async ({ page }) => {
    await loginAs(page, "anonymous");
    for (const endpoint of scopedEndpoints(IN_SCOPE_STUDENT)) {
      const result = await callApi(page, { name: endpoint.name, method: "GET", path: endpoint.path, allow: [] });
      expect([401, 403, 404]).toContain(result.status);
    }
  });
});
