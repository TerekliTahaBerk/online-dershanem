import { expect, request as playwrightRequest, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../../lib/auth/password";
import { parseMobileBootstrap, type MobileBootstrap } from "../../lib/mobile-contracts/bootstrap";
import { parseSessionList } from "../../lib/mobile-contracts/api";
import { parseActivationDesk, parseAdminReports, parseEducators, parseInterventionInbox, parseOperationsCenter, parseParentsPage, parsePeopleDirectory, parsePersonDetail, parseSignups, parseStudent360 } from "../../lib/mobile-contracts/admin";
import { parseMockExamsAdmin, parsePilot } from "../../lib/mobile-contracts/admin-rollout";
import { GROUP_TABS, parseEducation, parseGroup360, parseGroupMutationResult } from "../../lib/mobile-contracts/admin-education";
import { parseAssignmentList, parseInsights, parseLessonDetail, parseLessonList, parseOdHome, parseRecovery, parseReviewQueue, parseWeeklyDigest } from "../../lib/mobile-contracts/student";
import { hasE2EEnv } from "./env-requirements";
import { uniqueTestClientIp } from "./helpers/client-ip";

/**
 * M1 — native mobil API'nin GERÇEK HTTP sözleşmesi: yanıt başlıkları
 * (Set-Cookie), Bearer / çerez ayrımı, kapılar, sürüm kapısı, çıkış.
 * Tarayıcı kullanılmaz; her "istemci" kendi çerez kavanozu olan ayrı bir
 * istek bağlamıdır. Kurallar: docs/mobile/m1-auth-security-review.md.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const db = new PrismaClient();
const ORIGIN = { origin: new URL(baseURL).origin };
const MOBILE = { "x-od-client": "mobile", "x-od-client-version": "1.0.0", "user-agent": "OnlineDershanemMobile/1.0.0 (ios)" };
const createdUserIds: string[] = [];
const contexts: APIRequestContext[] = [];

async function client(): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { "x-forwarded-for": uniqueTestClientIp() } });
  contexts.push(context);
  return context;
}

function setCookies(response: APIResponse): string[] {
  return response.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie").map((header) => header.value);
}

async function mobileLogin(email: string, password: string) {
  const context = await client();
  const response = await context.post("/api/auth/login", { headers: MOBILE, data: { email, password } });
  return { context, response, body: (await response.json()) as { token?: string; redirect?: string; error?: string } };
}

async function me(context: APIRequestContext, token: string | null, headers: Record<string, string> = MOBILE) {
  return context.get("/api/panel/me", { headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } });
}

async function bootstrapOf(response: APIResponse): Promise<MobileBootstrap> {
  expect(response.status(), await response.text()).toBe(200);
  const parsed = parseMobileBootstrap(await response.json());
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

async function temporaryUser(role: "STUDENT" | "TEACHER" | "ADMIN", extra: { mustChangePassword?: boolean } = {}) {
  const password = `M1-${randomUUID()}`;
  const user = await db.user.create({
    data: {
      email: `m1-e2e-${randomUUID().slice(0, 8)}@example.com`,
      passwordHash: await hashPassword(password),
      mustChangePassword: extra.mustChangePassword ?? false,
      inviteAcceptedAt: new Date(),
      role,
      status: "ACTIVE",
      fullName: "M1 E2E",
    },
  });
  createdUserIds.push(user.id);
  return { user, password };
}

const student = () => ({ email: process.env.PANEL_E2E_STUDENT_EMAIL!, password: process.env.PANEL_E2E_STUDENT_PASSWORD! });
const parent = () => ({ email: process.env.PANEL_E2E_PARENT_EMAIL!, password: process.env.PANEL_E2E_PARENT_PASSWORD! });

test.describe.serial("M1 mobil API sözleşmesi", () => {
  test.skip(!hasE2EEnv("studentAccount", "parentAccount", "foreignStudent"), "E2E hesapları tanımlı değil");

  test.afterAll(async () => {
    await Promise.all(contexts.map((context) => context.dispose()));
    await db.productStaffAssignment.deleteMany({ where: { userId: { in: createdUserIds } } });
    await db.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: createdUserIds } }, { entityId: { in: createdUserIds } }] } });
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await db.$disconnect();
  });

  test("mobil giriş: token gövdede, Set-Cookie YOK, yanıt önbelleğe alınmaz", async () => {
    const { context, response, body } = await mobileLogin(student().email, student().password);
    expect(response.status(), JSON.stringify(body)).toBe(200);
    expect(typeof body.token).toBe("string");
    expect(body.token!.length).toBeGreaterThanOrEqual(32);
    expect(setCookies(response)).toEqual([]);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect((await context.storageState()).cookies).toEqual([]);
  });

  test("web giriş: httpOnly oturum çerezi var, token gövdede YOK (değişmedi)", async () => {
    const context = await client();
    const response = await context.post("/api/auth/login", { headers: ORIGIN, data: student() });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token).toBeUndefined();
    expect(setCookies(response).some((cookie) => /httponly/i.test(cookie))).toBe(true);
    // Web çerez akışı bootstrap'ta da çalışır.
    const bootstrap = await bootstrapOf(await me(context, null, {}));
    expect(bootstrap.user.role).toBe("STUDENT");
  });

  test("Bearer ile bootstrap: sözleşmeye uyar, öğrenci personel yeteneği taşımaz", async () => {
    const { context, body } = await mobileLogin(student().email, student().password);
    const bootstrap = await bootstrapOf(await me(context, body.token!));
    expect(bootstrap.user.role).toBe("STUDENT");
    expect(bootstrap.gates.status).toBe("READY");
    expect(bootstrap.workspace?.capabilities.staffPermissions).toEqual([]);
  });

  test("çerez ve Bearer farklı oturumlar → 401 (fail-closed), çereze geri düşülmez", async () => {
    const web = await client();
    expect((await web.post("/api/auth/login", { headers: ORIGIN, data: student() })).status()).toBe(200);
    const other = await mobileLogin(parent().email, parent().password);
    const conflict = await me(web, other.body.token!);
    expect(conflict.status()).toBe(401);
    expect((await conflict.json()).code).toBe("UNAUTHENTICATED");
    const garbage = await me(web, "not-a-real-token");
    expect(garbage.status()).toBe(401);
  });

  test("çalışma alanı seçimi Bearer ile: erişilen ürün kabul, erişilmeyen 403 PRODUCT_ACCESS_REQUIRED", async () => {
    const { context, body } = await mobileLogin(student().email, student().password);
    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    const before = await bootstrapOf(await me(context, body.token!));
    const active = before.workspace!.products.filter((product) => product.state === "ACTIVE").map((product) => product.code);
    const locked = before.workspace!.products.filter((product) => product.state === "LOCKED").map((product) => product.code);
    expect(active.length).toBeGreaterThan(0);

    const ok = await context.post("/api/panel/active-product", { headers: auth, data: { product: active[0] } });
    expect(ok.status(), await ok.text()).toBe(200);
    expect((await bootstrapOf(await me(context, body.token!))).workspace?.activeProduct).toBe(active[0]);

    if (locked.length) {
      const denied = await context.post("/api/panel/active-product", { headers: auth, data: { product: locked[0] } });
      expect(denied.status()).toBe(403);
      expect((await denied.json()).code).toBe("PRODUCT_ACCESS_REQUIRED");
    }
  });

  test("yabancı öğrencinin takvimi Bearer ile istenince 404", async () => {
    const { context, body } = await mobileLogin(student().email, student().password);
    const response = await context.get(`/api/panel/student-success/calendar?studentId=${process.env.PANEL_E2E_FOREIGN_STUDENT_ID}`, {
      headers: { ...MOBILE, authorization: `Bearer ${body.token}` },
    });
    expect(response.status()).toBe(404);
  });

  test("oturum listesi: mevcut oturum işaretli, IP / ham user-agent / token dönmez", async () => {
    const { context, body } = await mobileLogin(student().email, student().password);
    const response = await context.get("/api/auth/sessions", { headers: { ...MOBILE, authorization: `Bearer ${body.token}` } });
    expect(response.status()).toBe(200);
    const json = await response.json();
    const parsed = parseSessionList(json);
    if (!parsed.ok) throw new Error(parsed.error);
    const current = parsed.value.sessions.filter((session) => session.current);
    expect(current).toHaveLength(1);
    expect(current[0].device).toBe("Online Dershanem uygulaması · iOS");
    const raw = JSON.stringify(json);
    expect(raw).not.toContain(body.token!);
    expect(raw).not.toContain("userAgent");
    expect(raw).not.toContain('"ip"');
  });

  test("Bearer ile çıkış: sunucu oturumu iptal edilir, aynı token bir daha çalışmaz", async () => {
    const { context, body } = await mobileLogin(student().email, student().password);
    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    expect((await context.post("/api/auth/logout", { headers: auth })).status()).toBe(200);
    const after = await me(context, body.token!);
    expect(after.status()).toBe(401);
  });

  test("geçici parola kapısı: bootstrap yalnız kapı döner, ürün uçları 403 PASSWORD_CHANGE_REQUIRED, değişiklikten sonra READY", async () => {
    const { user, password } = await temporaryUser("STUDENT", { mustChangePassword: true });
    const { context, body } = await mobileLogin(user.email, password);
    expect(body.redirect).toBe("/panel/parola");
    const gated = await bootstrapOf(await me(context, body.token!));
    expect(gated.gates.status).toBe("PASSWORD_CHANGE_REQUIRED");
    expect(gated.workspace).toBeNull();

    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    const blocked = await context.get("/api/panel/notifications", { headers: auth });
    expect(blocked.status()).toBe(403);
    expect((await blocked.json()).code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changed = await context.post("/api/auth/change-password", { headers: auth, data: { currentPassword: password, newPassword: `Yeni-${randomUUID()}-Aa1!` } });
    expect(changed.status(), await changed.text()).toBe(200);
    const ready = await bootstrapOf(await me(context, body.token!));
    expect(ready.gates.status).toBe("READY");
  });

  test("MFA kapısı: ayrıcalıklı personel doğrulamadan ürün uçlarına ve çalışma alanına erişemez", async () => {
    const { user, password } = await temporaryUser("TEACHER");
    const odk = await db.product.findUniqueOrThrow({ where: { code: "ODK" }, select: { id: true } });
    await db.productStaffAssignment.create({ data: { userId: user.id, productId: odk.id, role: "EXAM_EDITOR" } });
    const { context, body } = await mobileLogin(user.email, password);
    expect(body.redirect).toBe("/giris/mfa");
    const gated = await bootstrapOf(await me(context, body.token!));
    expect(gated.gates.status).toBe("MFA_REQUIRED");
    expect(gated.workspace).toBeNull();
    expect(gated.gates.mfa?.enrolled).toBe(false);

    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    const notifications = await context.get("/api/panel/notifications", { headers: auth });
    expect(notifications.status()).toBe(403);
    expect((await notifications.json()).code).toBe("MFA_REQUIRED");
    const select = await context.post("/api/panel/active-product", { headers: auth, data: { product: "ODK" } });
    expect(select.status()).toBe(403);
  });

  test("sürüm kapısı: desteklenmeyen / eksik mobil sürüm 426; web etkilenmez", async () => {
    test.skip(!process.env.MOBILE_MIN_SUPPORTED_VERSION, "MOBILE_MIN_SUPPORTED_VERSION tanımlı değil");
    const context = await client();
    const old = await context.post("/api/auth/login", { headers: { ...MOBILE, "x-od-client-version": "0.0.1" }, data: student() });
    expect(old.status()).toBe(426);
    expect((await old.json()).code).toBe("CLIENT_UPGRADE_REQUIRED");
    const missing = await context.get("/api/panel/me", { headers: { "x-od-client": "mobile" } });
    expect(missing.status()).toBe(426);
    const web = await context.post("/api/auth/login", { headers: ORIGIN, data: student() });
    expect(web.status()).toBe(200);
  });
});

/* ------------------------------------------------------------------ *
 * M2 — OD öğrenci uçları (Bearer, ürün kapısı, sözleşme, eşzamanlılık)
 * ------------------------------------------------------------------ */

const odkStudent = () => ({ email: process.env.PANEL_E2E_ODK_STUDENT_EMAIL!, password: process.env.PANEL_E2E_ODK_STUDENT_PASSWORD! });
const m2UserIds: string[] = [];

async function bearer(credentials: { email: string; password: string }) {
  const { context, body } = await mobileLogin(credentials.email, credentials.password);
  expect(body.token, body.error).toBeTruthy();
  return { context, headers: { ...MOBILE, authorization: `Bearer ${body.token}` } };
}

/** Paylaşılan seed ödevlerini bozmamak için yazma testleri geçici grup + öğrenci kullanır. */
async function temporaryOdStudentWithAssignment() {
  const password = `M2-${randomUUID()}`;
  const passwordHash = await hashPassword(password);
  const teacher = await db.user.create({ data: { email: `m2-e2e-t-${randomUUID().slice(0, 8)}@example.com`, passwordHash, mustChangePassword: false, inviteAcceptedAt: new Date(), role: "TEACHER", status: "ACTIVE", fullName: "M2 Öğretmen" } });
  const user = await db.user.create({ data: { email: `m2-e2e-s-${randomUUID().slice(0, 8)}@example.com`, passwordHash, mustChangePassword: false, inviteAcceptedAt: new Date(), role: "STUDENT", status: "ACTIVE", fullName: "M2 Öğrenci" } });
  m2UserIds.push(teacher.id, user.id);
  const profile = await db.studentProfile.create({ data: { userId: user.id } });
  await db.productMembership.create({ data: { userId: user.id, product: "OD", startsAt: new Date(0) } });
  const group = await db.group.create({ data: { name: "M2 E2E grubu", subject: "Matematik", teacherId: teacher.id } });
  await db.enrollment.create({ data: { groupId: group.id, studentId: profile.id } });
  const assignment = await db.assignment.create({ data: { groupId: group.id, createdById: teacher.id, title: "M2 E2E ödevi", dueAt: new Date(Date.now() + 86400000) } });
  await db.assignmentProgress.create({ data: { assignmentId: assignment.id, studentId: profile.id } });
  return { email: user.email, password, assignmentId: assignment.id };
}

test.describe.serial("M2 mobil OD öğrenci API sözleşmesi", () => {
  test.skip(!hasE2EEnv("studentAccount", "odkStudentAccount", "foreignLesson"), "E2E hesapları tanımlı değil");

  test.afterAll(async () => {
    await db.group.deleteMany({ where: { teacherId: { in: m2UserIds } } });
    await db.productMembership.deleteMany({ where: { userId: { in: m2UserIds } } });
    await db.studentProfile.deleteMany({ where: { userId: { in: m2UserIds } } });
    await db.session.deleteMany({ where: { userId: { in: m2UserIds } } });
    await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: m2UserIds } }, { entityId: { in: m2UserIds } }] } });
    await db.user.deleteMany({ where: { id: { in: m2UserIds } } });
  });

  test("OD Bugün (?scope=OD): sözleşmeye uyar, yalnız OD verisi; parametresiz istek eski yanıt biçimini korur", async () => {
    const { context, headers } = await bearer(student());
    const scoped = await context.get("/api/panel/student/home?scope=OD", { headers });
    expect(scoped.status(), await scoped.text()).toBe(200);
    expect(scoped.headers()["cache-control"]).toContain("no-store");
    const parsed = parseOdHome(await scoped.json());
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.scope).toBe("OD");
    const text = JSON.stringify(parsed.value);
    expect(text).not.toContain("/panel/ogrenci/plan");
    expect(text).not.toContain("/panel/odk/");

    const legacy = await context.get("/api/panel/student/home", { headers });
    expect(legacy.status()).toBe(200);
    const legacyBody = await legacy.json();
    for (const key of ["products", "today", "weeklyPlan", "latestExam", "trend", "hasODK"]) expect(legacyBody).toHaveProperty(key);
    const invalid = await context.get("/api/panel/student/home?scope=ODK", { headers });
    expect(invalid.status()).toBe(400);
  });

  test("Deneme Ligi-only öğrenci OD uçlarına erişemez: 404 PRODUCT_ACCESS_REQUIRED", async () => {
    const { context, headers } = await bearer(odkStudent());
    for (const path of ["/api/panel/student/home?scope=OD", "/api/panel/assignments?scope=OD", "/api/panel/student/lessons/e2e-lesson", "/api/panel/student/review-queue", "/api/panel/student/recovery", "/api/panel/student/weekly-digest"]) {
      const response = await context.get(path, { headers });
      expect(response.status(), path).toBe(404);
      expect((await response.json()).code, path).toBe("PRODUCT_ACCESS_REQUIRED");
    }
  });

  test("Deneme Ligi-only öğrenci ortak Analiz servisini kullanabilir", async () => {
    const { context, headers } = await bearer(odkStudent());
    const response = await context.get("/api/panel/student/insights", { headers });
    expect(response.status(), await response.text()).toBe(200);
    const parsed = parseInsights(await response.json());
    if (!parsed.ok) throw new Error(parsed.error);
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("ders detayı: kendi dersi sözleşmeye uyar; yabancı ders 404; kimliksiz 401", async () => {
    const { context, headers } = await bearer(student());
    const own = await context.get("/api/panel/student/lessons/e2e-lesson", { headers });
    expect(own.status(), await own.text()).toBe(200);
    const parsed = parseLessonDetail(await own.json());
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.lesson.id).toBe("e2e-lesson");
    if (parsed.value.join.state !== "OPEN") expect(parsed.value.join.url).toBeNull();
    const foreign = await context.get(`/api/panel/student/lessons/${process.env.PANEL_E2E_FOREIGN_LESSON_ID}`, { headers });
    expect(foreign.status()).toBe(404);
    const anonymous = await context.get("/api/panel/student/lessons/e2e-lesson", { headers: MOBILE });
    expect(anonymous.status()).toBe(401);
  });

  test("çalışmalar (?scope=OD): Yön plan görevi taşımaz; ders listesi eklemeli alanlarla sözleşmeye uyar", async () => {
    const { context, headers } = await bearer(student());
    const list = await context.get("/api/panel/assignments?scope=OD", { headers });
    expect(list.status()).toBe(200);
    const body = await list.json();
    expect(body.planTasks).toEqual([]);
    const parsed = parseAssignmentList(body);
    if (!parsed.ok) throw new Error(parsed.error);
    const lessons = await context.get("/api/panel/student/lessons?durum=yaklasan", { headers });
    const lessonList = parseLessonList(await lessons.json());
    if (!lessonList.ok) throw new Error(lessonList.error);
  });

  test("ilerleme eşzamanlılığı (Bearer, Origin yok): sürüm + mutationKey; aynı anahtar tekrar uygulanmaz; eski sürüm 409", async () => {
    const temp = await temporaryOdStudentWithAssignment();
    const { context, headers } = await bearer(temp);
    const path = `/api/panel/assignments/${temp.assignmentId}/progress`;
    const key = randomUUID();
    const first = await context.patch(path, { headers, data: { status: "IN_PROGRESS", expectedVersion: 1, mutationKey: key } });
    expect(first.status(), await first.text()).toBe(200);
    expect(await first.json()).toMatchObject({ ok: true, version: 2, replayed: false });
    const replay = await context.patch(path, { headers, data: { status: "IN_PROGRESS", expectedVersion: 1, mutationKey: key } });
    expect(await replay.json()).toMatchObject({ ok: true, version: 2, replayed: true });
    const stale = await context.patch(path, { headers, data: { status: "DONE", expectedVersion: 1, mutationKey: randomUUID() } });
    expect(stale.status()).toBe(409);
    expect((await stale.json()).code).toBe("ASSIGNMENT_PROGRESS_CONFLICT");
    const row = await db.assignmentProgress.findFirstOrThrow({ where: { assignmentId: temp.assignmentId }, select: { status: true, version: true } });
    expect(row).toEqual({ status: "IN_PROGRESS", version: 2 });
  });

  test("gidişat, tekrar, telafi, haftalık özet: sözleşmeye uyar (bayraklar E2E ortamında açık)", async () => {
    const { context, headers } = await bearer(student());
    const insights = parseInsights(await (await context.get("/api/panel/student/insights", { headers })).json());
    if (!insights.ok) throw new Error(insights.error);
    const review = parseReviewQueue(await (await context.get("/api/panel/student/review-queue", { headers })).json());
    if (!review.ok) throw new Error(review.error);
    const recovery = parseRecovery(await (await context.get("/api/panel/student/recovery", { headers })).json());
    if (!recovery.ok) throw new Error(recovery.error);
    expect(JSON.stringify(recovery.value)).not.toContain("ÖZEL TELAFİYE GİRMEMELİ");
    const digest = parseWeeklyDigest(await (await context.get("/api/panel/student/weekly-digest", { headers })).json());
    if (!digest.ok) throw new Error(digest.error);
  });

  test("kimlikli materyal dosyası: yabancı grubun dosyası Bearer ile 404, kimliksiz 401", async () => {
    const { context, headers } = await bearer(student());
    const foreign = await context.get("/api/panel/materials/e2e-material-private-foreign/file", { headers });
    expect(foreign.status()).toBe(404);
    const anonymous = await context.get("/api/panel/materials/e2e-material-private-foreign/file", { headers: MOBILE });
    expect(anonymous.status()).toBe(401);
  });
});

test.describe.serial("Faz 1 mobil yönetim kapısı", () => {
  test.skip(!hasE2EEnv("studentAccount"), "E2E hesapları tanımlı değil");

  test.afterAll(async () => {
    await Promise.all(contexts.map((context) => context.dispose()));
    await db.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: createdUserIds } }, { entityId: { in: createdUserIds } }] } });
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  test("ADMIN Bearer: bootstrap güvenlik yeteneği + yönetim menüsü (sipariş arka ofisi dahil), operasyon merkezi sözleşmeye uyar", async () => {
    const admin = await temporaryUser("ADMIN");
    const { context, body } = await mobileLogin(admin.user.email, admin.password);
    expect(typeof body.token).toBe("string");
    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    const before = await bootstrapOf(await me(context, body.token!));
    expect(before.user.role).toBe("ADMIN");
    expect(before.workspace?.capabilities.security).not.toBeNull();
    expect(before.workspace?.capabilities.security?.stepUpExpiresAt ?? null).toBeNull();

    const product = before.workspace!.products.find((entry) => entry.state === "ACTIVE")!.code;
    expect((await context.post("/api/panel/active-product", { headers: auth, data: { product } })).status()).toBe(200);
    const ready = await bootstrapOf(await me(context, body.token!));
    const ids = ready.workspace!.navigation.sections.flatMap((section) => section.items.map((item) => item.id));
    expect(ids).toContain("today");
    expect(ids).toContain("orders");
    expect(ready.workspace!.navigation.sections.flatMap((section) => section.items).every((item) => !/odeme|checkout|paytr/i.test(item.webPath))).toBe(true);

    const ops = await context.get("/api/panel/admin/operations-center?grup=OD", { headers: auth });
    expect(ops.status(), await ops.text()).toBe(200);
    expect(ops.headers()["cache-control"]).toContain("no-store");
    const parsed = parseOperationsCenter(await ops.json());
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.group).toBe("OD");
    expect(parsed.value.actions.every((action) => action.group === "OD")).toBe(true);
  });

  test("P2.3: eğitim ve beş Grup 360 sekmesi Bearer sözleşmesine uyar; yetki ve JSON hata kapıları korunur", async () => {
    const admin = await temporaryUser("ADMIN");
    const teacher = await temporaryUser("TEACHER");
    const group = await db.group.create({ data: { name: "P2.3 E2E", subject: "Matematik", teacherId: teacher.user.id, capacity: 10 } });
    try {
      const { context, body } = await mobileLogin(admin.user.email, admin.password);
      const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
      const list = await context.get("/api/panel/admin/education", { headers: auth });
      expect(list.status(), await list.text()).toBe(200);
      expect(list.headers()["cache-control"]).toContain("no-store");
      const education = parseEducation(await list.json());
      if (!education.ok) throw new Error(education.error);
      expect(education.value.groups.some((item) => item.id === group.id)).toBe(true);
      for (const tab of GROUP_TABS) {
        const response = await context.get(`/api/panel/admin/groups/${group.id}?sekme=${tab}`, { headers: auth });
        expect(response.status(), await response.text()).toBe(200);
        expect(response.headers()["cache-control"]).toContain("no-store");
        const parsed = parseGroup360(await response.json());
        if (!parsed.ok) throw new Error(parsed.error);
        expect(parsed.value.tab).toBe(tab);
        expect(parsed.value.id).toBe(group.id);
      }
      expect((await context.get(`/api/panel/admin/groups/${group.id}?sekme=bogus`, { headers: auth })).status()).toBe(400);
      const missing = await context.get("/api/panel/admin/groups/no-such-group", { headers: auth });
      expect(missing.status()).toBe(404);
      expect((await missing.json()).code).toBe("NOT_FOUND");
      const learner = await mobileLogin(student().email, student().password);
      for (const path of ["/api/panel/admin/education", `/api/panel/admin/groups/${group.id}`]) {
        expect((await learner.context.get(path, { headers: { ...MOBILE, authorization: `Bearer ${learner.body.token}` } })).status()).toBe(403);
        expect((await context.get(path, { headers: MOBILE })).status()).toBe(401);
      }
    } finally {
      await db.group.delete({ where: { id: group.id } });
    }
  });

  test("P2.3: grup yazması Bearer step-up, zorunlu önkoşul, aynı anahtar tekrarı ve eski sürüm 409 uygular", async () => {
    const admin = await temporaryUser("ADMIN");
    const teacher = await temporaryUser("TEACHER");
    const { context, body } = await mobileLogin(admin.user.email, admin.password);
    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    const create = { name: "P2.3 group write", subject: "Fen", teacherId: teacher.user.id, studentIds: [], idempotencyKey: randomUUID() };
    let groupId: string | null = null;
    try {
      expect((await context.post("/api/panel/groups", { headers: auth, data: create })).status()).toBe(428);
      await db.session.updateMany({ where: { userId: admin.user.id }, data: { stepUpAt: new Date() } });
      const missing = await context.post("/api/panel/groups", { headers: auth, data: { name: create.name, subject: create.subject, teacherId: teacher.user.id } });
      expect(missing.status(), await missing.text()).toBe(400);
      expect((await missing.json()).code).toBe("PRECONDITION_REQUIRED");
      const response = await context.post("/api/panel/groups", { headers: auth, data: create });
      expect(response.status(), await response.text()).toBe(200);
      const created = parseGroupMutationResult(await response.json());
      if (!created.ok) throw new Error(created.error);
      groupId = created.value.id;
      const replay = await context.post("/api/panel/groups", { headers: auth, data: create });
      expect(await replay.json()).toMatchObject({ id: groupId, replayed: true });
      const get = parseGroup360(await (await context.get(`/api/panel/admin/groups/${groupId}`, { headers: auth })).json());
      if (!get.ok) throw new Error(get.error);
      expect(get.value.revision).toBe(created.value.revision);
      const edit = { action: "UPDATE_META", name: "Updated", subject: "Fen", expectedRevision: get.value.revision, idempotencyKey: randomUUID() };
      expect((await context.patch(`/api/panel/groups/${groupId}`, { headers: auth, data: edit })).status()).toBe(200);
      const stale = await context.patch(`/api/panel/groups/${groupId}`, { headers: auth, data: { ...edit, name: "Stale", idempotencyKey: randomUUID() } });
      expect(stale.status()).toBe(409);
      expect((await stale.json()).code).toBe("GROUP_CONFLICT");
    } finally { if (groupId) await db.group.delete({ where: { id: groupId } }); }
  });

  test("hassas yönetim uçları Bearer ile taze step-up ister: 428 STEP_UP_REQUIRED", async () => {
    const admin = await temporaryUser("ADMIN");
    const { context, body } = await mobileLogin(admin.user.email, admin.password);
    const response = await context.get(`/api/panel/users/${admin.user.id}/archive-impact`, { headers: { ...MOBILE, authorization: `Bearer ${body.token}` } });
    expect(response.status()).toBe(428);
    expect((await response.json()).code).toBe("STEP_UP_REQUIRED");
  });

  test("Faz 2.1 yönetim okuma uçları: ADMIN Bearer ile sözleşmeye uyar, öğrenci 403", async () => {
    const admin = await temporaryUser("ADMIN");
    const { context, body } = await mobileLogin(admin.user.email, admin.password);
    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    const reports = await context.get("/api/panel/admin/reports", { headers: auth });
    expect(reports.status(), await reports.text()).toBe(200);
    expect(parseAdminReports(await reports.json()).ok).toBe(true);
    const desk = await context.get("/api/panel/admin/activation-desk", { headers: auth });
    expect(desk.status(), await desk.text()).toBe(200);
    expect(parseActivationDesk(await desk.json()).ok).toBe(true);
    const inbox = await context.get("/api/panel/admin/interventions", { headers: auth });
    // Bayrak kapalı ortamda açıkça 404 FEATURE_DISABLED; açıksa sözleşmeye uyar.
    if (inbox.status() === 404) expect((await inbox.json()).code).toBe("FEATURE_DISABLED");
    else expect(parseInterventionInbox(await inbox.json()).ok).toBe(true);

    const learner = await mobileLogin(student().email, student().password);
    for (const path of ["/api/panel/admin/reports", "/api/panel/admin/activation-desk", "/api/panel/admin/interventions"]) {
      expect((await learner.context.get(path, { headers: { ...MOBILE, authorization: `Bearer ${learner.body.token}` } })).status()).toBe(403);
    }
  });

  test("Faz 2.2 kişiler: dizin ve kişi detayı Bearer ile sözleşmeye uyar; hesap yazmaları taze step-up ister", async () => {
    const admin = await temporaryUser("ADMIN");
    const target = await temporaryUser("STUDENT");
    const { context, body } = await mobileLogin(admin.user.email, admin.password);
    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    const directory = await context.get(`/api/panel/admin/people?sekme=ogrenciler&q=${encodeURIComponent(target.user.email)}`, { headers: auth });
    expect(directory.status(), await directory.text()).toBe(200);
    const parsed = parsePeopleDirectory(await directory.json());
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.people.some((person) => person.id === target.user.id)).toBe(true);
    const detail = await context.get(`/api/panel/admin/people/${target.user.id}`, { headers: auth });
    expect(detail.status(), await detail.text()).toBe(200);
    expect(parsePersonDetail(await detail.json()).ok).toBe(true);
    expect((await context.get("/api/panel/admin/people/yok-boyle-biri", { headers: auth })).status()).toBe(404);
    const suspend = await context.post(`/api/panel/users/${target.user.id}/status`, { headers: auth, data: { status: "SUSPENDED" } });
    expect(suspend.status()).toBe(428);
    expect((await suspend.json()).code).toBe("STEP_UP_REQUIRED");
  });

  test("Faz 2.2 kalanlar: veliler, öğretmenler, yeni kayıtlar ve Öğrenci 360 sözleşmeye uyar; yazma kuralları sunucuda", async () => {
    const admin = await temporaryUser("ADMIN");
    const target = await temporaryUser("STUDENT");
    await db.studentProfile.create({ data: { userId: target.user.id } });
    const { context, body } = await mobileLogin(admin.user.email, admin.password);
    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    for (const [path, parse] of [
      ["/api/panel/admin/parents?durum=baglantisiz", parseParentsPage],
      ["/api/panel/admin/educators", parseEducators],
      ["/api/panel/admin/signups?sekme=kayitlar&filtre=yeni", parseSignups],
      ["/api/panel/admin/signups?sekme=cocuklar", parseSignups],
    ] as const) {
      const response = await context.get(path, { headers: auth });
      expect(response.status(), await response.text()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      const parsed = parse(await response.json());
      if (!parsed.ok) throw new Error(`${path}: ${parsed.error}`);
    }

    const directory = parsePeopleDirectory(await (await context.get(`/api/panel/admin/people?sekme=ogrenciler&q=${encodeURIComponent(target.user.email)}`, { headers: auth })).json());
    if (!directory.ok) throw new Error(directory.error);
    const profileId = directory.value.people.find((person) => person.id === target.user.id)?.studentProfileId;
    expect(profileId).toBeTruthy();
    const studentView = await context.get(`/api/panel/admin/students/${profileId}?sekme=ogrenme&gorunum=odevler`, { headers: auth });
    expect(studentView.status(), await studentView.text()).toBe(200);
    const view = parseStudent360(await studentView.json());
    if (!view.ok) throw new Error(view.error);
    expect(view.value.studentUserId).toBe(target.user.id);
    expect((await context.get("/api/panel/admin/students/yok-boyle-biri", { headers: auth })).status()).toBe(404);

    // P2.4: koç atama artık iş kuralından ÖNCE taze step-up ister.
    const assignmentInput = { studentId: profileId, coachId: "yok-boyle-koc", idempotencyKey: randomUUID(), expectedRevision: view.value.coach.revision };
    const assign = await context.post("/api/panel/admin/coach-assignments", { headers: auth, data: assignmentInput });
    expect(assign.status()).toBe(428);
    expect((await assign.json()).code).toBe("STEP_UP_REQUIRED");
    expect((await context.post("/api/panel/admin/orders/yok-boyle-siparis/provisioning-retry", { headers: auth, data: {} })).status()).toBe(428);
    // Veli bağlantısı web ile aynı uçta ve taze step-up ister.
    const link = await context.post("/api/panel/relationships", { headers: auth, data: { parentId: admin.user.id, studentId: profileId } });
    expect(link.status()).toBe(428);
    await db.session.updateMany({ where: { userId: admin.user.id }, data: { stepUpAt: new Date() } });
    const verifiedAssign = await context.post("/api/panel/admin/coach-assignments", { headers: auth, data: assignmentInput });
    expect(verifiedAssign.status()).toBe(422);
    expect((await verifiedAssign.json()).code).toBe("COACH");

    const learner = await mobileLogin(student().email, student().password);
    for (const path of ["/api/panel/admin/parents", "/api/panel/admin/educators", "/api/panel/admin/signups", `/api/panel/admin/students/${profileId}`]) {
      expect((await learner.context.get(path, { headers: { ...MOBILE, authorization: `Bearer ${learner.body.token}` } })).status()).toBe(403);
    }
  });

  test("P2.8 kontrollü yayın ve dış denemeler: okuma sözleşmesi; yazmalar taze step-up ve Bearer işlem anahtarı ister", async () => {
    const admin = await temporaryUser("ADMIN");
    const { context, body } = await mobileLogin(admin.user.email, admin.password);
    const auth = { ...MOBILE, authorization: `Bearer ${body.token}` };
    const pilotRead = await context.get("/api/panel/admin/pilot", { headers: auth });
    expect(pilotRead.status(), await pilotRead.text()).toBe(200);
    expect(pilotRead.headers()["cache-control"]).toContain("no-store");
    const pilotView = parsePilot(await pilotRead.json());
    if (!pilotView.ok) throw new Error(pilotView.error);
    const exams = await context.get("/api/panel/admin/mock-exams", { headers: auth });
    // Bayrak kapalı ortamda açıkça 404 FEATURE_DISABLED; açıksa sözleşmeye uyar.
    if (exams.status() === 404) expect((await exams.json()).code).toBe("FEATURE_DISABLED");
    else {
      expect(exams.status(), await exams.text()).toBe(200);
      const parsed = parseMockExamsAdmin(await exams.json());
      if (!parsed.ok) throw new Error(parsed.error);
    }
    const create = await context.post("/api/panel/pilot-cohorts", { headers: auth, data: { groupId: "yok", requestKey: randomUUID() } });
    expect(create.status()).toBe(428);
    expect((await create.json()).code).toBe("STEP_UP_REQUIRED");
    const transition = await context.patch("/api/panel/pilot-cohorts/yok", { headers: auth, data: { action: "PAUSE", expectedVersion: 1, stopReason: "OPERATIONAL" } });
    expect(transition.status()).toBe(428);

    const learner = await mobileLogin(student().email, student().password);
    for (const path of ["/api/panel/admin/pilot", "/api/panel/admin/mock-exams"]) {
      expect((await learner.context.get(path, { headers: { ...MOBILE, authorization: `Bearer ${learner.body.token}` } })).status()).toBe(403);
    }
  });

  test("yönetim ucu: öğrenci ve öğretmen 403, kimliksiz 401", async () => {
    const { context, body } = await mobileLogin(student().email, student().password);
    const asStudent = await context.get("/api/panel/admin/operations-center", { headers: { ...MOBILE, authorization: `Bearer ${body.token}` } });
    expect(asStudent.status()).toBe(403);
    expect(asStudent.headers()["cache-control"]).toContain("no-store");

    const teacher = await temporaryUser("TEACHER");
    const teacherLogin = await mobileLogin(teacher.user.email, teacher.password);
    const asTeacher = await teacherLogin.context.get("/api/panel/admin/operations-center", { headers: { ...MOBILE, authorization: `Bearer ${teacherLogin.body.token}` } });
    expect(asTeacher.status()).toBe(403);

    const anonymous = await context.get("/api/panel/admin/operations-center", { headers: MOBILE });
    expect(anonymous.status()).toBe(401);
  });
  test("P2.9: Bearer önizleme çerezsiz, konu kimlikli, yazmalar kapalı ve tek oturuma bağlı", async () => {
    const admin = await temporaryUser("ADMIN");
    const login = await mobileLogin(admin.user.email, admin.password);
    const learner = await mobileLogin(student().email, student().password);
    const learnerBootstrap = await bootstrapOf(await me(learner.context, learner.body.token!));
    const auth = { ...MOBILE, authorization: `Bearer ${login.body.token}` };
    const started = await login.context.post("/api/panel/admin-preview", { headers: auth, data: { previewRole: "STUDENT", previewUserId: learnerBootstrap.user.id } });
    expect(started.status(), await started.text()).toBe(200);
    expect(setCookies(started)).toEqual([]);
    const { token } = await started.json();
    expect(typeof token).toBe("string");
    const overlay = { ...auth, "x-od-preview": token, "x-od-workspace": "OD" };
    const preview = await bootstrapOf(await login.context.get("/api/panel/me", { headers: overlay }));
    expect(preview.user.id).toBe(learnerBootstrap.user.id);
    expect(preview.user.role).toBe("STUDENT");
    expect(preview.adminOverlay).toMatchObject({ mode: "PREVIEW", actorUserId: admin.user.id });
    if (learnerBootstrap.workspace?.activeProduct === "OD") expect(preview.workspace?.navigation).toEqual(learnerBootstrap.workspace?.navigation);
    expect(preview.workspace?.navigation.sections.flatMap((section) => section.items).some((item) => item.webPath.startsWith("/panel/yonetim"))).toBe(false);
    for (const path of ["/api/panel/users", "/api/panel/relationships", "/api/panel/notifications/read"]) {
      const write = await login.context.post(path, { headers: overlay, data: {} });
      expect(write.status(), `${path}: ${await write.text()}`).toBe(403);
    }
    const otherSession = await mobileLogin(admin.user.email, admin.password);
    expect((await otherSession.context.get("/api/panel/me", { headers: { ...overlay, authorization: `Bearer ${otherSession.body.token}` } })).status()).toBe(403);
    const ended = await login.context.delete("/api/panel/admin-preview", { headers: overlay });
    expect(ended.status()).toBe(200);
    expect(setCookies(ended)).toEqual([]);
    expect((await bootstrapOf(await me(login.context, login.body.token!))).user.id).toBe(admin.user.id);
  });

  test("P2.9: öğretmen modu aynı ADMIN kimliğiyle çerezsiz açılır, iki belirteç birlikte reddedilir", async () => {
    const admin = await temporaryUser("ADMIN");
    const login = await mobileLogin(admin.user.email, admin.password);
    const auth = { ...MOBILE, authorization: `Bearer ${login.body.token}` };
    const started = await login.context.post("/api/panel/admin-teacher-mode", { headers: auth, data: {} });
    expect(started.status(), await started.text()).toBe(200);
    expect(setCookies(started)).toEqual([]);
    const { token } = await started.json();
    const overlay = { ...auth, "x-od-teacher-mode": token, "x-od-workspace": "OD" };
    const teacher = await bootstrapOf(await login.context.get("/api/panel/me", { headers: overlay }));
    expect(teacher.user).toMatchObject({ id: admin.user.id, role: "TEACHER" });
    expect(teacher.adminOverlay?.mode).toBe("TEACHER");
    expect((await login.context.get("/api/panel/me", { headers: { ...overlay, "x-od-preview": token } })).status()).toBe(403);
    const ended = await login.context.delete("/api/panel/admin-teacher-mode", { headers: overlay });
    expect(ended.status()).toBe(200);
    expect(setCookies(ended)).toEqual([]);
    const audit = await db.auditLog.findFirst({ where: { actorUserId: admin.user.id, action: "ADMIN_TEACHER_MODE_STARTED" } });
    expect(audit).not.toBeNull();
  });

});
