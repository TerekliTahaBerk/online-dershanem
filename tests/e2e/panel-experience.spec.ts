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
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(account.email!);
  await page.getByLabel("Parola").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
  await page.waitForURL(/\/panel\//);
  await expect(page.getByRole("main")).toBeVisible();
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
    for (const route of ["/panel/yonetim", "/panel/yonetim/takvim", "/panel/yonetim/kullanicilar", "/panel/yonetim/egitim", "/panel/yonetim/kazanimlar", "/panel/yonetim/denemeler", "/panel/yonetim/mudahale", "/panel/yonetim/isler", "/panel/yonetim/kayitlar", "/panel/yonetim/raporlar", "/panel/bildirimler"]) {
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

  test("öğrenci deneme girer, öğretmen eğilimi görür ve veli sakin özeti açar", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/denemeler");
    await expect(page.getByRole("heading", { name: "Her denemeden tek doğru adım çıkar." })).toBeVisible();
    await expect(page.getByText("İşlem / yöntem · son 3 denemede 3 işaret")).toBeVisible();
    await page.getByLabel("Sınav").selectOption("YDT");
    await page.getByLabel("Yabancı Dil correctCount").fill("60");
    await page.getByLabel("Yabancı Dil incorrectCount").fill("10");
    await page.getByLabel("Yabancı Dil blankCount").fill("10");
    await page.getByLabel("Süre yönetimi", { exact: true }).check();
    await page.getByRole("button", { name: "Denemeyi kaydet" }).click();
    await expect(page.getByText(/Deneme kaydedildi/)).toBeVisible();
    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.teacher);
    await page.goto("/panel/ogretmen/denemeler");
    await expect(page.getByRole("heading", { name: "Neti değil, nedeni görün." })).toBeVisible();
    await expect(page.getByText("E2E LGS Denemesi 1", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    await page.goto("/panel/veli/denemeler");
    await expect(page.getByRole("heading", { name: /Ada Öğrenci · Deneme eğilimi/ })).toBeVisible();
    await expect(page.getByText("Sonuçlar yalnız öğrencinin kendi denemeleriyle karşılaştırılır.")).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Kuyruk büyürse insan bakışı devreye girsin." })).toBeVisible();
    await expect(page.getByText("İnsan bakışı gerekli", { exact: true })).toBeVisible();
    await page.getByLabel("Öğrenci").selectOption("e2e-student-profile");
    await page.getByLabel("Kısa çalışma başlığı").fill("E2E öğretmen tekrar kaynağı");
    await page.getByLabel("Kaynak referansı").fill("E2E öğretmen föyü s.4 soru 6");
    await page.getByRole("button", { name: "Tekrar ekle" }).click();
    await expect(page.getByText(/yarının küçük tekrarlarına eklendi/i)).toBeVisible();
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
    await expect(page.getByRole("textbox", { name: "Bugün ne işlediniz?" }).last()).toHaveValue("Köklü ifadelerde dört işlem");
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
    await login(page, accounts.admin);
    await page.goto("/panel/yonetim/isler#eposta-kuyrugu");
    await expect(page.getByText("Ders özeti hazır – Online Dershanem").first()).toBeVisible();
  });

  test("öğrenci kapasitesine göre plan önerir, öğretmen onaylar ve öğrenci geri bildirim verir", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/plan");
    await expect(page.getByRole("heading", { name: "Bugün en fazla üç iş." })).toBeVisible();
    await page.getByRole("button", { name: "Sal" }).click();
    await page.getByRole("button", { name: "Per" }).click();
    await page.getByRole("button", { name: "Cmt" }).click();
    await page.getByRole("button", { name: "Paz" }).click();
    await page.getByLabel("Bir günde ayırabileceğim süre").selectOption("45");
    await page.getByLabel("Bu yoğunluk bana nasıl geliyor?").selectOption("3");
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
    await expect(page.getByText("Öğretmenin onayladı", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Tamamla" }).first().click();
    await expect(page.getByRole("button", { name: "Tamamlandı" }).first()).toBeDisabled();
    await page.getByLabel("Plan değişiklik nedeni").selectOption("TOO_MUCH");
    await page.getByRole("button", { name: "Değişiklik iste" }).click();
    await expect(page.getByText(/Değişiklik isteğin öğretmenine iletildi/)).toBeVisible();
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
    await expect(row.getByText("E2E Telafi Mini Föyü", { exact: false })).toBeVisible();
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
    const sharedText = await page.getByText(/Bu haftanın verisi henüz sınırlı|Derslere katılım ritmi/).first().textContent();
    expect(sharedText).toBeTruthy();
    await expect(page.getByText("İşlem kontrolünü son adımda tekrar et.", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Yararlıydı" }).click();
    await expect(page.getByText("Geri bildirimin kaydedildi.")).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    await page.goto("/panel/veli/haftalik");
    await expect(page.getByText(sharedText!, { exact: true })).toBeVisible();
    await page.getByLabel("Özet kaygı düzeyi").selectOption("1");
    await expect(page.getByText("Geri bildirimin kaydedildi.")).toBeVisible();
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
    await page.getByLabel("Görünüm").selectOption("CLOSED");
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
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page.goto("/panel/yonetim/raporlar");
    await expect(page.getByRole("heading", { name: "Kritik yolculuk SLO'ları" })).toBeVisible();
    await expect(page.getByText("Grup kurulum başarısı", { exact: true })).toBeVisible();
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
    await review.getByRole("button", { name: "Küçük yeniden deneme iste" }).click();
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
    await review.getByRole("button", { name: "Onayla" }).click();
    await expect(review).toHaveCount(0);

    await page.getByRole("button", { name: /çıkış/i }).click(); await login(page, accounts.student); await page.goto("/panel/ogrenci/odevler");
    studentCard = page.getByRole("article").filter({ hasText: "E2E Kanıtlı Problem Çözümü" }).first();
    await expect(studentCard.getByText("2. deneme · Onaylandı", { exact: true })).toBeVisible();
    await expect(studentCard.getByText("Karşılıyor", { exact: false }).first()).toBeVisible();
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
