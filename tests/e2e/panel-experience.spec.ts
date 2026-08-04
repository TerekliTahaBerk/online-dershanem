import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.PANEL_E2E_TEACHER_PASSWORD;
const accounts = {
  admin: { email: process.env.PANEL_E2E_ADMIN_EMAIL, password: process.env.PANEL_E2E_ADMIN_PASSWORD },
  teacher: { email: process.env.PANEL_E2E_TEACHER_EMAIL, password },
  student: { email: process.env.PANEL_E2E_STUDENT_EMAIL, password: process.env.PANEL_E2E_STUDENT_PASSWORD },
  parent: { email: process.env.PANEL_E2E_PARENT_EMAIL, password: process.env.PANEL_E2E_PARENT_PASSWORD },
};

async function login(page: Page, account: { email?: string; password?: string }) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `e2e-${account.email}-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(account.email!);
  await page.getByLabel("Parola").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
  await page.waitForURL(/\/panel\//);
  if (new URL(page.url()).pathname === "/panel/urun-sec") {
    await page.getByRole("link", { name: "Online Dershanem paneline git" }).click();
    await page.waitForURL(/\/panel\/(yonetim|ogretmen|ogrenci|veli)/);
  }
  await expect(page.getByRole("main")).toBeVisible();
  await expect.poll(() => page.title()).not.toBe("");
}

test.describe("panel deneyimi", () => {
  test.skip(!Object.values(accounts).every((account) => account.email && account.password), "Panel E2E hesapları tanımlı değil.");

  for (const [role, account] of Object.entries(accounts)) {
    test(`${role} paneli mobilde taşmıyor ve WCAG A/AA ihlali üretmiyor`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await login(page, account);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(result.violations).toEqual([]);
      await page.goto("/panel/bildirimler");
      await expect(page.getByRole("heading", { name: "Önemli gelişmeler tek yerde." })).toBeVisible();
      const notificationOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(notificationOverflow).toBeLessThanOrEqual(1);
    });
  }

  test("admin temel yönetim bölümlerini tek oturumda açabilir", async ({ page }) => {
    await login(page, accounts.admin);
    for (const route of ["/panel/yonetim", "/panel/yonetim/takvim", "/panel/yonetim/kullanicilar", "/panel/yonetim/egitim", "/panel/yonetim/kazanimlar", "/panel/yonetim/denemeler", "/panel/yonetim/mudahale", "/panel/yonetim/isler", "/panel/yonetim/kayitlar", "/panel/yonetim/raporlar", "/panel/yonetim/kalite", "/panel/bildirimler"]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.getByRole("main")).toBeVisible();
    }
    const csv = await page.evaluate(async () => { const response = await fetch("/api/panel/reports/export?range=30"); return { status: response.status, type: response.headers.get("content-type"), disposition: response.headers.get("content-disposition"), text: await response.text() }; });
    expect(csv.status).toBe(200);
    expect(csv.type).toContain("text/csv");
    expect(csv.disposition).toContain("attachment");
    expect(csv.text).toContain("Kategori");
  });

  test("admin kalite panosu küçük kohortu bastırır ve sıralama üretmez", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, accounts.admin);
    await page.goto("/panel/yonetim/kalite");
    await expect(page.getByRole("heading", { name: "Öğrenme kalitesini adil bir zeminde görün." })).toBeVisible();
    await expect(page.getByRole("main").getByText(/öğretmen etkisi.*ölçmez/i).first()).toBeVisible();
    await expect(page.getByText(/uygun öğrenci/).first()).toBeVisible();
    await expect(page.getByText(/öğretmen sıralaması/i)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  });

  test("öğretmen kaynaklı AI taslağını düzenleyip onaylar; içerik otomatik yayınlanmaz", async ({ page }) => {
    let generatePayload: Record<string, unknown> | null = null;
    page.on("request", (request) => { if (request.url().endsWith("/api/panel/ai-drafts") && request.method() === "POST") generatePayload = request.postDataJSON() as Record<string, unknown>; });
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/ai-yardimci");
    await expect(page.getByRole("heading", { name: "Kaynağı görün, taslağı siz onaylayın." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole("button", { name: "Kaynaklı taslak hazırla" }).click();
    await expect(page.getByText("Taslak hazır. Kaynakları ve içeriği kontrol edin.")).toBeVisible();
    const draft = page.getByRole("article").filter({ hasText: "Ödev taslağı" }).first();
    await expect(draft.getByText("İnceleme bekliyor")).toBeVisible();
    await expect(draft.getByText("Kullanılan kaynaklar")).toBeVisible();
    await draft.getByLabel("Başlık").fill("E2E öğretmen onaylı taslak");
    await draft.getByRole("button", { name: "Düzenleyip onayla" }).click();
    await expect(draft.getByText("İnsan onayı kaydedildi. İçerik otomatik yayınlanmadı.")).toBeVisible();
    await expect(page.getByText("Öğretmen onaylı").first()).toBeVisible();
    const replay = await page.evaluate(async (payload) => { const response = await fetch("/api/panel/ai-drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); return { status: response.status, body: await response.json() }; }, generatePayload);
    expect(replay.status).toBe(200); expect(replay.body.replayed).toBe(true);
    await page.goto("/panel/ogretmen/odevler");
    await expect(page.getByText("E2E öğretmen onaylı taslak", { exact: true })).toHaveCount(0);
  });

  test("öğrenci deneme girer, öğretmen eğilimi görür ve veli sakin özeti açar", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/denemeler");
    const studentExamMain = page.getByRole("main");
    await expect(page.getByRole("heading", { name: "Her denemeden tek doğru adım çıkar." })).toBeVisible();
    await expect(studentExamMain.getByText("İşlem / yöntem · son 3 denemede 3 işaret")).toBeVisible();
    await studentExamMain.getByLabel("Sınav").selectOption("YDT");
    await studentExamMain.getByLabel("Yabancı Dil correctCount").fill("60");
    await studentExamMain.getByLabel("Yabancı Dil incorrectCount").fill("10");
    await studentExamMain.getByLabel("Yabancı Dil blankCount").fill("10");
    await studentExamMain.getByLabel("Süre yönetimi", { exact: true }).check();
    await studentExamMain.getByRole("button", { name: "Denemeyi kaydet" }).click();
    await expect(studentExamMain.getByText(/Deneme kaydedildi/)).toBeVisible();
    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/denemeler");
    await expect(page.getByRole("heading", { name: "Neti değil, nedeni görün." })).toBeVisible();
    await expect(page.getByText("E2E LGS Denemesi 1", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    await page.goto("/panel/veli/denemeler");
    await expect(page.getByRole("heading", { name: /Ada Öğrenci · Deneme eğilimi/ })).toBeVisible();
    await expect(page.getByRole("main").getByText("Sonuçlar yalnız öğrencinin kendi denemeleriyle karşılaştırılır.")).toBeVisible();
  });

  test("öğrenci küçük tekrarı yanıtlar, öğretmen kalıcı zorlanmayı görür", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/tekrar");
    await expect(page.getByRole("heading", { name: "Bugün yalnız birkaç küçük tekrar." })).toBeVisible();
    await expect(page.getByText("Matematik deneme dönüşü", { exact: true }).first()).toBeVisible();
    await page.getByRole("textbox", { name: /Kritik çözüm adımım/ }).first().fill("İşlem sırasını son adımda yeniden kontrol et.");
    await page.getByRole("button", { name: "Doğru hatırladım" }).first().click();
    await expect(page.getByText(/bir sonraki dönüş daha ileri bir tarihe yerleşti/i)).toBeVisible();
    const replay = await page.evaluate(async () => { const send = async () => { const response = await fetch("/api/panel/review-queue/e2e-review-item-lesson/respond", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: "CORRECT", idempotencyKey: "e2e_repeat_idempotency" }) }); return response.json(); }; return [await send(), await send()]; });
    expect(replay[0].replayed).toBe(false);
    expect(replay[1].replayed).toBe(true);
    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/tekrar");
    const teacherReviewMain = page.getByRole("main");
    await expect(page.getByRole("heading", { name: "Kuyruk büyürse insan bakışı devreye girsin." })).toBeVisible();
    await expect(teacherReviewMain.getByText("İnsan bakışı gerekli", { exact: true })).toBeVisible();
    await teacherReviewMain.getByLabel("Öğrenci").selectOption("e2e-student-profile");
    await teacherReviewMain.getByLabel("Kısa çalışma başlığı").fill("E2E öğretmen tekrar kaynağı");
    await teacherReviewMain.getByLabel("Kaynak referansı").fill("E2E öğretmen föyü s.4 soru 6");
    await teacherReviewMain.getByRole("button", { name: "Tekrar ekle" }).click();
    await expect(teacherReviewMain.getByText(/yarının küçük tekrarlarına eklendi/i)).toBeVisible();
  });

  test("öğrenci gelişim ve materyal, veli bildirim ekranlarını açabilir", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/gelisim"); await expect(page.getByRole("heading", { name: "Her küçük adım görünür." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bu hafta kanıt ürettiğim beceriler" })).toBeVisible();
    await expect(page.getByText("MAT.8.1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Köklü ifadelerle dört işlem yapar.", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Haftalık hedefi düzenle" }).click();
    const weeklyGoal = `E2E haftalık hedef ${Date.now()}`;
    await page.getByRole("textbox", { name: "Haftalık hedef" }).fill(weeklyGoal);
    await page.getByRole("button", { name: /Hedefi kaydet/ }).click();
    await expect(page.getByText(weeklyGoal, { exact: true })).toBeVisible();
    await page.goto("/panel/ogrenci/materyaller"); await expect(page.getByText("E2E Köklü İfadeler Föyü").first()).toBeVisible();
    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    await page.goto("/panel/bildirimler?type=SYSTEM&status=unread"); await expect(page.getByText("E2E panel hazır").first()).toBeVisible();
  });

  test("öğretmen dört öğrencinin ders özetini tek ekranda otomatik kaydeder", async ({ page }) => {
    const productEvents: string[] = [];
    let closePayload: Record<string, unknown> | null = null;
    let closeUrl = "";
    page.on("request", (request) => {
      if (request.url().endsWith("/api/panel/events") && request.method() === "POST") {
        const event = request.postDataJSON() as { name?: string } | null;
        if (event?.name) productEvents.push(event.name);
      }
      if (request.url().includes("/api/panel/lessons/") && request.url().endsWith("/notes") && request.method() === "PUT") {
        const payload = request.postDataJSON() as Record<string, unknown> | null;
        if (payload?.complete) { closePayload = payload; closeUrl = request.url(); }
      }
    });
    await login(page, accounts.teacher);
    await expect(page.getByRole("heading", { name: "E2E Hızlı Ders Özeti" })).toBeVisible();

    await page.getByRole("button", { name: /Geçen dersten akıllı öneri/ }).click();
    await expect(page.getByRole("textbox", { name: "Bugün ne işlediniz?" }).last()).toHaveValue("Bir örnek çözüp ana adımı açıklamak");
    await page.getByRole("textbox", { name: "Gruba ortak kısa not" }).last().fill("Grup konuyu kavradı; işlem sırasını pekiştiriyoruz.");
    await page.getByRole("textbox", { name: "Bir sonraki hedef" }).last().fill("Yeni nesil sorularda hız kazanmak.");
    await page.getByRole("textbox", { name: "Çalışma / ödev" }).last().fill("20 karma soru ve yanlış analizi.");
    await page.getByRole("textbox", { name: "Kazanım ara" }).fill("Köklü ifadeler");
    await page.getByRole("button", { name: /MAT\.8\.1.*Köklü ifadelerle dört işlem yapar/ }).click();
    await page.getByLabel("MAT.8.1 kanıt türü").selectOption("NEEDS_REVIEW");
    await page.getByRole("button", { name: "İstisna ekle" }).click();
    await page.getByRole("button", { name: "Ada Öğrenci: Geç" }).click();
    await page.getByRole("textbox", { name: "Ada Öğrenci için özel not" }).last().fill("İşlem kontrolünü son adımda tekrar et.");

    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible({ timeout: 6_000 });
    await page.getByRole("button", { name: "Ödev taslağını önizle" }).click();
    await expect(page.getByText("Ödev önizlemesi", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Dersi güvenle kapat" }).click();
    await expect(page.getByText(/Ders tamamlandı; ödev 4 öğrenciye gönderildi/i)).toBeVisible();
    await expect.poll(() => productEvents).toContain("lesson_close_started");
    await expect.poll(() => productEvents).toContain("lesson_close_completed");
    await expect(page.getByRole("button", { name: "Ada Öğrenci: Geç" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("4/4", { exact: true })).toBeVisible();
    const replay = await page.evaluate(async ({ payload, url }) => { const response = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); return { status: response.status, body: await response.json() }; }, { payload: closePayload, url: closeUrl });
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
    const closePayloadForConflict = closePayload as unknown as Record<string, unknown>;
    const conflict = await page.evaluate(async ({ payload, url }) => { const response = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, nextGoal: `${String(payload.nextGoal || "")} değişti` }) }); return { status: response.status, body: await response.json() }; }, { payload: closePayloadForConflict, url: closeUrl });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toMatch(/aynı işlem anahtarı/i);

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.student);
    await page.goto("/panel/bildirimler");
    await expect(page.getByText("Ders özeti hazır", { exact: true }).first()).toBeVisible();
  });

  test("öğrenci kapasitesine göre plan önerir, öğretmen onaylar ve öğrenci geri bildirim verir", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/plan");
    await expect(page.getByRole("heading", { name: "Bugün en fazla üç iş." })).toBeVisible();
    await page.getByRole("button", { name: "Sal" }).click();
    await page.getByRole("button", { name: "Per" }).click();
    await page.getByRole("button", { name: "Cmt" }).click();
    await page.getByRole("button", { name: "Paz" }).click();
    await page.getByRole("main").getByLabel("Bir günde ayırabileceğim süre").selectOption("45");
    await page.getByRole("main").getByLabel("Bu yoğunluk bana nasıl geliyor?").selectOption("3");
    await page.getByRole("button", { name: "Tercihleri kaydet" }).click();
    await expect(page.getByText(/Tercihlerin kaydedildi/)).toBeVisible();
    await page.getByRole("button", { name: "Öneri oluştur" }).click();
    await expect(page.getByText(/öğretmen onayı bekleniyor/i).first()).toBeVisible();
    await expect(page.getByText(/Neden:/).first()).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/plan");
    const studentPlan = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).first();
    await expect(studentPlan.getByText(/adaptive-v1/)).toBeVisible();
    await studentPlan.getByRole("button", { name: "Onayla ve kilitle" }).click();
    await expect(page.getByText(/plan onaylandı ve kilitlendi/i)).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/plan");
    await expect(page.getByRole("main").getByText("Öğretmenin onayladı", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Tamamla" }).first().click();
    await expect(page.getByRole("button", { name: "Tamamlandı" }).first()).toBeDisabled();
    await page.getByRole("main").getByLabel("Plan değişiklik nedeni").selectOption("TOO_MUCH");
    await page.getByRole("main").getByRole("button", { name: "Değişiklik iste" }).click();
    await expect(page.getByRole("main").getByText(/Değişiklik isteğin öğretmenine iletildi/)).toBeVisible();
  });

  test("öğretmen kaçırılan ders için güvenli telafi yayınlar, öğrenci 72 saatlik akışı tamamlar", async ({ page }) => {
    let publishUrl = "";
    let publishPayload: Record<string, unknown> | null = null;
    page.on("request", (request) => {
      if (request.url().includes("/api/panel/recovery-packages/") && request.url().endsWith("/publish") && request.method() === "POST") {
        publishUrl = request.url();
        publishPayload = request.postDataJSON() as Record<string, unknown>;
      }
    });
    await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/telafi");
    await expect(page.getByRole("heading", { name: "Kaçırılan dersi tek onayla küçük bir sıraya koy." })).toBeVisible();
    let row = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).filter({ hasText: "E2E Kaçırılan Köklü İfadeler Dersi" }).first();
    await Promise.all([page.waitForNavigation(), row.getByRole("button", { name: "Telafi taslağı hazırla" }).click()]);
    row = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).filter({ hasText: "E2E Kaçırılan Köklü İfadeler Dersi" }).first();
    await expect(row.getByText("Köklü ifadelerde telafi özeti", { exact: true })).toBeVisible();
    await expect(row.getByText("E2E Erişilebilir Köklü İfadeler Videosu", { exact: false })).toBeVisible();
    await expect(row.getByText("E2E Telafi İki Soru", { exact: false })).toBeVisible();
    await expect(page.getByText("ÖZEL TELAFİYE GİRMEMELİ", { exact: true })).toHaveCount(0);
    await expect(page.getByText("YOKLAMA NOTU TELAFİYE GİRMEMELİ", { exact: true })).toHaveCount(0);
    await Promise.all([page.waitForNavigation(), row.getByRole("button", { name: "Öğrenciye yayınla" }).click()]);
    row = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).filter({ hasText: "E2E Kaçırılan Köklü İfadeler Dersi" }).first();
    await expect(row.getByText("Öğrencide", { exact: true })).toBeVisible();
    const replay = await page.evaluate(async ({ url, payload }) => { const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); return { status: response.status, body: await response.json() }; }, { url: publishUrl, payload: publishPayload });
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/telafi");
    await expect(page.getByRole("heading", { name: "Biriken iş değil, sıradaki küçük telafi." })).toBeVisible();
    let studentRow = page.getByRole("article").filter({ hasText: "E2E Kaçırılan Köklü İfadeler Dersi" }).first();
    await expect(studentRow.getByText("Köklü ifadelerde telafi özeti", { exact: true })).toBeVisible();
    await expect(page.getByText("ÖZEL TELAFİYE GİRMEMELİ", { exact: true })).toHaveCount(0);
    for (let index = 0; index < 2; index += 1) {
      studentRow = page.getByRole("article").filter({ hasText: "E2E Kaçırılan Köklü İfadeler Dersi" }).first();
      await Promise.all([page.waitForNavigation(), studentRow.getByRole("button", { name: "İnceledim" }).first().click()]);
    }
    studentRow = page.getByRole("article").filter({ hasText: "E2E Kaçırılan Köklü İfadeler Dersi" }).first();
    await Promise.all([page.waitForNavigation(), studentRow.getByRole("button", { name: "Açıklayabiliyorum" }).click()]);
    studentRow = page.getByRole("article").filter({ hasText: "E2E Kaçırılan Köklü İfadeler Dersi" }).first();
    await expect(studentRow.getByText("Telafi tamamlandı", { exact: true })).toBeVisible();
  });

  test("öğretmen sakin özeti önizler, öğrenci ve veli aynı metni görür", async ({ page }) => {
    await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/ozetler");
    const row = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).first();
    await row.getByRole("button", { name: "Sakin özet hazırla" }).click();
    const refreshedRow = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).first();
    await expect(refreshedRow.getByText("Veli ve öğrencinin göreceği aynı metin", { exact: true })).toBeVisible();
    await refreshedRow.getByRole("button", { name: "Öğrenci ve veliye aynı anda yayınla" }).click();
    await expect(page.getByText(/aynı özet öğrenci ve veliye açıldı/i)).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/haftalik");
    const sharedText = await page.getByText(/Bu haftanın verisi henüz sınırlı|Derslere katılım ritmi|Katıldığı derslerde öğrenme akışını/).first().textContent();
    expect(sharedText).toBeTruthy();
    await expect(page.getByText("İşlem kontrolünü son adımda tekrar et.", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Yararlıydı" }).click();
    await expect(page.getByText("Geri bildirimin kaydedildi.")).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    await page.goto("/panel/veli/haftalik");
    const parentDigestMain = page.getByRole("main");
    await expect(parentDigestMain.getByText(sharedText!, { exact: true })).toBeVisible();
    await parentDigestMain.getByLabel("Özet kaygı düzeyi").selectOption("1");
    await expect(parentDigestMain.getByText("Geri bildirimin kaydedildi.")).toBeVisible();
  });

  test("açıklanabilir müdahale sahiplenilir ve kontrollü sonuçla kapanır", async ({ page }) => {
    await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/mudahale");
    await expect(page.getByRole("heading", { name: "Sinyal, sahibi ve küçük eylemiyle gelsin." })).toBeVisible();
    await Promise.all([page.waitForNavigation(), page.getByRole("button", { name: "Açıklanabilir sinyalleri yenile" }).click()]);
    const row = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).filter({ hasText: "Tekrarlayan çözüm güçlüğü" }).first();
    await expect(row.getByText(/en az üç “yanlış” veya “emin değilim”/)).toBeVisible();
    await expect(row.getByText(/puanlama veya teşhis yok/)).toBeVisible();
    await Promise.all([page.waitForNavigation(), row.getByRole("button", { name: "Üstlen" }).click()]);
    const owned = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).filter({ hasText: "Tekrarlayan çözüm güçlüğü" }).first();
    await Promise.all([page.waitForNavigation(), owned.getByRole("button", { name: "İncelemeye başla" }).click()]);
    const active = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).filter({ hasText: "Tekrarlayan çözüm güçlüğü" }).first();
    await active.getByLabel("Ada Öğrenci için iç aksiyon notu").fill("Kritik çözüm adımı birlikte incelendi.");
    await active.getByLabel("Ada Öğrenci sonuç").selectOption("PRACTICE_ADJUSTED");
    await Promise.all([page.waitForNavigation(), active.getByRole("button", { name: "Sonuçla kapat" }).click()]);
    await page.getByRole("main").getByLabel("Görünüm").selectOption("CLOSED");
    const closed = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).filter({ hasText: "Tekrarlayan çözüm güçlüğü" }).first();
    await expect(closed.locator("span").getByText("Çözüldü", { exact: true })).toBeVisible();
    await closed.getByText("Son işlem geçmişi").click();
    await expect(closed.getByText("Kritik çözüm adımı birlikte incelendi.")).toBeVisible();
  });

  test("admin hızlı kurulumla grup, veli bağlantısı ve haftalık program oluşturur", async ({ page }) => {
    await login(page, accounts.admin);
    const name = `E2E Hızlı Kurulum ${Date.now()}`;
    const status = await page.evaluate(async ({ name }) => { const response = await fetch("/api/panel/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, subject: "Matematik", level: "8. Sınıf", teacherId: "e2e-user-teacher", studentIds: ["e2e-student-profile"], parentLinks: [{ parentId: "e2e-user-parent", studentId: "e2e-student-profile" }], lessonTitle: "E2E Haftalık Program", startsAt: new Date(Date.now() + 3 * 86400000).toISOString(), repeatWeeks: 4, meetingUrl: "https://example.com/e2e-room" }) }); return response.status; }, { name });
    expect(status).toBe(200);
    await page.goto("/panel/yonetim/egitim");
    await expect(page.getByRole("main").getByText(name, { exact: true })).toBeVisible();
    await page.goto("/panel/yonetim/raporlar");
    await expect(page.getByRole("heading", { name: "Kritik yolculuk SLO'ları" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Grup kurulum başarısı", { exact: true })).toBeVisible();
  });

  test("admin başarısız e-postayı yeniden kuyruğa alır, öğretmen bu işleme erişemez", async ({ page }) => {
    await login(page, accounts.admin);
    await page.goto("/panel/yonetim/isler#eposta-kuyrugu");
    const email = page.getByRole("article").filter({ hasText: "E2E ödeme makbuzu" });
    await expect(email.getByText("Başarısız", { exact: true })).toBeVisible();
    await email.getByRole("button", { name: "Yeniden dene" }).click();
    await expect(email.getByText("Bekliyor", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.teacher);
    const status = await page.evaluate(async () => (await fetch("/api/panel/email-outbox/e2e-email-outbox/retry", { method: "PATCH" })).status);
    expect(status).toBe(403);
  });

  test("ödev durumu öğrenciden veli görünümüne yansır", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/odevler");
    const card = page.getByRole("article").filter({ hasText: "E2E Yeni Nesil Sorular" });
    const doneButton = card.getByRole("button", { name: "Tamamlandı" });
    await doneButton.click();
    await expect(doneButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/Çalışma tamamlandı|İlerlemen kaydedildi/)).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    await page.goto("/panel/veli/takip");
    await expect(page.getByRole("article").filter({ hasText: "E2E Yeni Nesil Sorular" }).getByText("Tamamlandı", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bu hafta çalışılan beceriler" })).toBeVisible();
    await expect(page.getByText("MAT.8.2", { exact: true })).toBeVisible();
  });

  test("öğrenci kanıt gönderir, öğretmen rubric ile yeniden deneme isteyip onaylar", async ({ page }) => {
    let submitUrl = ""; let submitPayload: Record<string, unknown> | null = null;
    page.on("request", (request) => { if (request.url().endsWith("/api/panel/assignments/e2e-assignment-evidence/submissions") && request.method() === "POST") { submitUrl = request.url(); submitPayload = request.postDataJSON() as Record<string, unknown>; } });
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/odevler");
    let studentCard = page.getByRole("article").filter({ hasText: "E2E Kanıtlı Problem Çözümü" }).first();
    await studentCard.getByLabel("Çözüm yolunu ve kontrolünü kısaca açıkla").fill("Önce ortak çarpanı ayırdım, işlemleri sırayla yaptım ve sonucu yerine koyarak kontrol ettim.");
    await studentCard.getByRole("button", { name: "Kanıtı gönder" }).click();
    await expect(page.getByText(/Kanıtın öğretmen değerlendirmesine gönderildi/)).toBeVisible();
    const replay = await page.evaluate(async ({ url, payload }) => { const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); return { status: response.status, body: await response.json() }; }, { url: submitUrl, payload: submitPayload });
    expect(replay.status).toBe(200); expect(replay.body.replayed).toBe(true);

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.teacher); await page.goto("/panel/ogretmen/odevler");
    let review = page.getByRole("article").filter({ hasText: "Ada Öğrenci · 1. deneme" }).first();
    await review.getByLabel("Ada Öğrenci Çözüm yolunu açıkça gösterir").selectOption("DEVELOPING");
    await review.getByLabel("Ada Öğrenci Sonucunu kontrol eder").selectOption("NEEDS_WORK");
    await review.getByLabel("Ada Öğrenci geri bildirim").fill("Çözüm yolun açık. Son kontrolü bir eşitlik yazarak görünür hale getir.");
    let reviewResponse = page.waitForResponse((response) => response.url().includes("/api/panel/assignment-submissions/") && response.url().endsWith("/review"));
    await review.getByRole("button", { name: "Küçük yeniden deneme iste" }).click();
    expect((await reviewResponse).status()).toBe(200);
    await page.reload();
    await expect(review).toHaveCount(0);

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.student); await page.goto("/panel/ogrenci/odevler");
    studentCard = page.getByRole("article").filter({ hasText: "E2E Kanıtlı Problem Çözümü" }).first();
    await expect(studentCard.getByText(/Son kontrolü bir eşitlik yazarak/)).toBeVisible();
    await studentCard.getByLabel("Yeni denemende neyi değiştirdin?").fill("Sonucu başlangıç eşitliğinde yerine koydum ve iki tarafın da aynı değeri verdiğini yazdım.");
    await studentCard.getByRole("button", { name: "Yeni denemeyi gönder" }).click();
    await expect(page.getByText(/Yeni denemen öğretmenine gönderildi/)).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.teacher); await page.goto("/panel/ogretmen/odevler");
    review = page.getByRole("article").filter({ hasText: "Ada Öğrenci · 2. deneme" }).first();
    await review.getByLabel("Ada Öğrenci Çözüm yolunu açıkça gösterir").selectOption("MEETS");
    await review.getByLabel("Ada Öğrenci Sonucunu kontrol eder").selectOption("MEETS");
    await review.getByLabel("Ada Öğrenci geri bildirim").fill("Çözüm ve kontrol adımları artık açık; çalışma tamamlandı.");
    reviewResponse = page.waitForResponse((response) => response.url().includes("/api/panel/assignment-submissions/") && response.url().endsWith("/review"));
    await review.getByRole("button", { name: "Onayla" }).click();
    expect((await reviewResponse).status()).toBe(200);
    await page.reload();
    await expect(review).toHaveCount(0);

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.student); await page.goto("/panel/ogrenci/odevler");
    studentCard = page.getByRole("article").filter({ hasText: "E2E Kanıtlı Problem Çözümü" }).first();
    await expect(studentCard.getByText("2. deneme · Onaylandı", { exact: true })).toBeVisible();
    await expect(studentCard.getByText("Karşılıyor", { exact: false }).first()).toBeVisible();
  });

  test("öğrenci kontrollü yardım ister, öğretmen küçük adım seçer ve öğrenci faydasını işaretler", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/check-in");
    await expect(page.getByRole("heading", { name: "Nasıl ilerlediğini fark et, gerekirse yardım iste." })).toBeVisible();
    await expect(page.getByRole("main").getByText("Veliye hiçbir durumda gösterilmez.")).toBeVisible();
    const helpJourney = page.getByRole("main");
    const existingJourney = helpJourney.getByText(/Öğretmen yanıtı bekleniyor|Öğretmenin destek adımı|Destek tamamlandı/);
    if (await existingJourney.count() === 0) {
      await page.getByRole("button", { name: "Enerjim düşük" }).click();
      await page.getByRole("button", { name: "Yönlendirmeye ihtiyacım var" }).click();
      await page.getByRole("button", { name: "Bir örneğe daha ihtiyacım var" }).click();
      await helpJourney.getByLabel("Öğretmenimden yardım istiyorum").check();
      await page.getByRole("button", { name: "Check-in'i kaydet" }).click();
      await expect(page.getByText("Check-in kaydedildi.")).toBeVisible();
      await page.reload();
    }
    if (await helpJourney.getByText("Destek tamamlandı").count() > 0) return;

    if (await helpJourney.getByText("Öğretmenin destek adımı").count() === 0) {
      await page.getByRole("button", { name: /çıkış/i }).click();
      await login(page, accounts.teacher);
      await page.goto("/panel/ogretmen/yardim");
      const request = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).first();
      await expect(request.getByText("Bir örneğe daha ihtiyacım var", { exact: false })).toBeVisible();
      const responsePromise = page.waitForResponse((response) => response.url().includes("/api/panel/student-help-requests/") && response.url().endsWith("/respond"));
      await request.getByRole("button", { name: "Ek örnek hazırladım" }).click();
      expect((await responsePromise).status()).toBe(200);
      await page.reload();
      const answeredRequest = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).filter({ hasText: "Ek örnek hazırladım" }).first();
      await expect(answeredRequest.getByText("Son adım: Ek örnek hazırladım")).toBeVisible();
    }

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/check-in");
    const history = page.getByRole("article").filter({ hasText: "Ek örnek hazırladım" }).first();
    const helpfulButton = history.getByRole("button", { name: "İşime yaradı" });
    if (await helpfulButton.count() > 0) await helpfulButton.click();
    await expect(history.getByText("Destek tamamlandı")).toBeVisible();
  });

  test("erişilebilirlik tercihleri uygulanır, admin işlevsel düzenleme atar ve öğretmen yalnız desteği görür", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await login(page, accounts.student);
    await page.goto("/panel/erisilebilirlik");
    await expect(page.getByRole("heading", { name: "Paneli çalışma biçiminize uyarlayın." })).toBeVisible();
    for (const name of ["Hareketi azalt", "Yüksek kontrast", "Büyük metin", "Rahat satır aralığı", "Altyazılı medya", "Metin dökümü"]) {
      const preferenceButton = page.getByRole("button", { name: new RegExp(name) });
      if (await preferenceButton.getAttribute("aria-pressed") !== "true") await preferenceButton.click();
    }
    await page.getByRole("button", { name: "Tercihleri kaydet" }).click();
    await expect(page.getByText("Tercihler kaydedildi ve panele uygulandı.")).toBeVisible();
    await expect.poll(() => page.locator("html").getAttribute("data-panel-motion")).toBe("reduced");
    await expect(page.locator("html")).toHaveAttribute("data-panel-contrast", "high");
    await expect(page.locator("html")).toHaveAttribute("data-panel-text-scale", "large");
    await expect(page.locator("html")).toHaveAttribute("data-panel-spacing", "comfortable");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.reload();
    const skipLink = page.getByRole("link", { name: "Ana içeriğe geç" });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#panel-content$/);

    await page.goto("/panel/ogrenci/materyaller");
    const accessibleMaterial = page.getByRole("article").filter({ hasText: "E2E Erişilebilir Köklü İfadeler Videosu" });
    await expect(accessibleMaterial.getByText("Tercihinle uyumlu")).toBeVisible();
    await accessibleMaterial.getByText("Metin dökümünü oku").click();
    await expect(accessibleMaterial.getByText(/önce kök içindeki ortak çarpanı belirle/)).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.admin);
    await page.goto("/panel/yonetim/kullanicilar/e2e-user-student");
    const accommodationMain = page.getByRole("main");
    await accommodationMain.getByLabel("Değerlendirme ek süresi").selectOption("25");
    await accommodationMain.getByLabel("Planlı kısa molaya izin ver").check();
    await accommodationMain.getByRole("button", { name: "Düzenlemeyi kaydet" }).click();
    await expect(accommodationMain.getByText("İşlevsel akademik düzenleme kaydedildi.")).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/gruplar");
    const student = page.getByRole("article").filter({ hasText: "Ada Öğrenci" }).first();
    await expect(student.getByText("Değerlendirmede %25 ek süre").first()).toBeVisible();
    await expect(student.getByText("Planlı kısa mola").first()).toBeVisible();
    await expect(page.getByText(/tanı|disleksi|sağlık raporu/i)).toHaveCount(0);

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.student);
    await page.goto("/panel/erisilebilirlik");
    await expect(page.getByRole("main").getByText("%25 ek değerlendirme süresi").first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Planlı kısa mola", { exact: true }).first()).toBeVisible();
  });

  test("düşük veri modu özel veriyi cachelemez; öğrenci ve öğretmen işlemleri çevrimdışı eşitlenir", async ({ page, context }) => {
    test.setTimeout(75_000);
    await login(page, accounts.student);
    await page.goto("/panel/veri-kullanimi");
    const lowDataButton = page.getByRole("button", { name: /Düşük veri modu/ });
    if (await lowDataButton.getAttribute("aria-pressed") !== "true") await lowDataButton.click();
    const offlineWritesButton = page.getByRole("button", { name: /Güvenli çevrimdışı yazma/ });
    if (await offlineWritesButton.getAttribute("aria-pressed") !== "true") await offlineWritesButton.click();
    await page.getByRole("button", { name: "Tercihleri kaydet" }).click();
    await expect(page.getByText("Veri kullanımı tercihleri kaydedildi.")).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-panel-low-data", "true");
    await page.goto("/panel/ogrenci/materyaller");
    await expect(page.getByRole("main").getByText(/Düşük veri açık/).first()).toBeVisible();
    const accessibleMaterial = page.getByRole("article").filter({ hasText: "E2E Erişilebilir Köklü İfadeler Videosu" });
    await expect(accessibleMaterial.getByText("Metin dökümünü oku")).toBeVisible();
    await expect(accessibleMaterial.getByRole("link", { name: /Videoyu aç \(veri kullanır\)/ })).toBeVisible();

    await page.goto("/panel/ogrenci/odevler");
    const assignment = page.getByRole("article").filter({ hasText: "E2E Yeni Nesil Sorular" });
    await context.setOffline(true);
    await assignment.getByRole("button", { name: "Çalışıyorum" }).click();
    await expect(page.getByText(/ödev durumu bu cihazda güvenle bekliyor/i)).toBeVisible();
    await expect(page.getByText(/1 güvenli işlem cihazda bekliyor/i)).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText(/ödev durumu güvenle eşitlendi/i)).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.getByRole("article").filter({ hasText: "E2E Yeni Nesil Sorular" }).getByRole("button", { name: "Çalışıyorum" })).toHaveAttribute("aria-pressed", "true");

    const conflict = await page.evaluate(async () => {
      const url = "/api/panel/assignments/e2e-assignment/progress";
      const send = async (payload: Record<string, unknown>) => { const response = await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); return { status: response.status, body: await response.json() }; };
      const bootstrap = await send({ status: "TODO", expectedVersion: 0, mutationKey: crypto.randomUUID() });
      const expectedVersion = Number(bootstrap.body.latestVersion);
      const firstPayload = { status: "TODO", expectedVersion, mutationKey: crypto.randomUUID() };
      const first = await send(firstPayload); const replay = await send(firstPayload); const stale = await send({ status: "DONE", expectedVersion, mutationKey: crypto.randomUUID() });
      return { bootstrap, first, replay, stale };
    });
    expect(conflict.bootstrap.status).toBe(409);
    expect(conflict.first.status).toBe(200);
    expect(conflict.replay.body.replayed).toBe(true);
    expect(conflict.stale.status).toBe(409);
    const privateCacheEntries = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (name) => (await caches.open(name)).keys()))).flat().map((request) => new URL(request.url).pathname).filter((path) => path.startsWith("/panel") || path.startsWith("/api/")));
    expect(privateCacheEntries).toEqual([]);

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.teacher);
    await page.goto("/panel/veri-kullanimi");
    await page.getByRole("button", { name: /Güvenli çevrimdışı yazma/ }).click();
    await page.getByRole("button", { name: "Tercihleri kaydet" }).click();
    await expect(page.getByText("Veri kullanımı tercihleri kaydedildi.")).toBeVisible();
    await page.reload(); await page.goto("/panel/ogretmen");
    await page.getByRole("button", { name: /Geçen dersten akıllı öneri/ }).click();
    await page.getByRole("textbox", { name: "Gruba ortak kısa not" }).last().fill("Çevrimdışı kapanış öncesi ortak ders notu.");
    await page.getByRole("textbox", { name: "Bir sonraki hedef" }).last().fill("Bağlantı gelince güvenle eşitlemek.");
    const outcomeSkipReason = page.getByLabel("Kazanım erteleme nedeni").last();
    if (await outcomeSkipReason.count()) await outcomeSkipReason.selectOption("COMPLETE_LATER");
    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible({ timeout: 8_000 });
    await context.setOffline(true);
    await page.getByRole("textbox", { name: "Gruba ortak kısa not" }).last().fill("Bağlantı yokken cihazda bekleyen ortak ders notu.");
    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/Bağlantı yok; ders taslağı bu cihazda güvenle bekliyor/i)).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible({ timeout: 12_000 });
  });

  test("takvim dışa aktarma rol sınırlarını ve toplantı bağlantısı gizliliğini korur", async ({ page }) => {
    await login(page, accounts.teacher);
    const teacherCalendar = await page.evaluate(async () => { const response = await fetch("/api/panel/calendar/export"); return { status: response.status, type: response.headers.get("content-type"), text: await response.text() }; });
    expect(teacherCalendar.status).toBe(200);
    expect(teacherCalendar.type).toContain("text/calendar");
    expect(teacherCalendar.text).toContain("BEGIN:VCALENDAR");
    expect(teacherCalendar.text).toContain("https://example.com/e2e-class");

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.student);
    const studentCalendar = await page.evaluate(async () => { const response = await fetch("/api/panel/calendar/export"); return { status: response.status, text: await response.text() }; });
    expect(studentCalendar.status).toBe(200);
    expect(studentCalendar.text).toContain("E2E Hızlı Ders Özeti");
    expect(studentCalendar.text).not.toContain("https://example.com/e2e-class");

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    const parentResults = await page.evaluate(async (foreignId) => { const own = await fetch("/api/panel/calendar/export?studentId=e2e-student-profile"); const foreign = await fetch(`/api/panel/calendar/export?studentId=${foreignId}`); return { ownStatus: own.status, ownText: await own.text(), foreignStatus: foreign.status }; }, process.env.PANEL_E2E_FOREIGN_STUDENT_ID!);
    expect(parentResults.ownStatus).toBe(200);
    expect(parentResults.ownText).not.toContain("https://example.com/e2e-class");
    expect(parentResults.foreignStatus).toBe(404);
  });
});
