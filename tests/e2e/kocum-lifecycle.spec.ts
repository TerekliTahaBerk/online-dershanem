import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/panel-login";

/**
 * ONLINE KOÇUM — ana yaşam döngüsü (§1).
 *
 * Koç plan kurar → yayınlar → öğrenci görür → görevi tamamlar →
 * koç sonucu görür → veli sakin özeti görür.
 *
 * Aynı akış üzerinde §5 (durum makinesi, çift gönderim), §17 (veli
 * gizliliği) ve §25 (yatay erişim) de doğrulanır. UI tıklaması yerine
 * gerçek uçlar çağrılır: hata sınıfı buradaydı, seçicilerde değil.
 *
 * ÖN KOŞUL: taze tohum (`prisma/seed-e2e.ts`). Tohum, öğrencinin haftalık
 * planlarını siler; bu test o haftaya kendi planını kurup YAYINLAR. Aynı
 * veritabanında tohumlamadan ikinci kez koşarsa plan zaten `APPROVED`
 * olduğu için onay adımı 409 döner. Bu, paketteki diğer durum değiştiren
 * testlerle (ör. ödeme provisioning) aynı sözleşmedir.
 */

const accounts = {
  teacher: {
    email: process.env.PANEL_E2E_TEACHER_EMAIL ?? "teacher.e2e@example.com",
    password: process.env.PANEL_E2E_TEACHER_PASSWORD ?? process.env.E2E_PASSWORD ?? "testpass123",
    failureLabel: "Teacher",
  },
  student: {
    email: process.env.PANEL_E2E_STUDENT_EMAIL ?? "student.e2e@example.com",
    password: process.env.PANEL_E2E_STUDENT_PASSWORD ?? process.env.E2E_PASSWORD ?? "testpass123",
    failureLabel: "Student",
  },
  parent: {
    email: process.env.PANEL_E2E_PARENT_EMAIL ?? "parent.e2e@example.com",
    password: process.env.PANEL_E2E_PARENT_PASSWORD ?? process.env.E2E_PASSWORD ?? "testpass123",
    failureLabel: "Parent",
  },
};

const STUDENT_PROFILE_ID = "e2e-student-profile";
const FOREIGN_STUDENT_PROFILE_ID = "e2e-student-profile-plan-foreign";

/** İstanbul gününe sabitlenmiş, bu haftanın içinde kalan bir tarih. */
function scheduledForThisWeek(): string {
  const now = new Date();
  const istanbulMidnight = new Date(now);
  istanbulMidnight.setUTCHours(21, 0, 0, 0);
  if (istanbulMidnight > now) istanbulMidnight.setUTCDate(istanbulMidnight.getUTCDate() - 1);
  return istanbulMidnight.toISOString();
}

test.describe("Online Koçum yaşam döngüsü", () => {
  test("plan kurulur, yayınlanır, öğrenci tamamlar, veli sakin özeti görür", async ({ page }) => {
    test.slow();

    /* --- 1) Koç plan görevi ekler ------------------------------------ */
    await loginAs(page, accounts.teacher);

    const created = await page.request.post("/api/panel/kocum/tasks", {
      data: {
        studentId: STUDENT_PROFILE_ID,
        title: "Köklü ifadeler soru çözümü",
        taskKind: "QUESTION_PRACTICE",
        scheduleMode: "FLEXIBLE",
        scheduledFor: scheduledForThisWeek(),
        durationMinutes: 45,
        targetType: "QUESTIONS",
        targetValue: 20,
        sourceType: "MANUAL_COACH",
      },
    });
    expect(created.status(), await created.text()).toBe(200);
    const { planId, version, taskId } = await created.json();
    expect(planId).toBeTruthy();

    /* --- 2) Yayın: yanlış sürümle onay çakışma döner (§27) ------------ */
    const staleApprove = await page.request.post(`/api/panel/adaptive-plan/${planId}/approve`, {
      data: { expectedVersion: version + 99 },
    });
    expect(staleApprove.status()).toBe(409);

    const approve = await page.request.post(`/api/panel/adaptive-plan/${planId}/approve`, {
      data: { expectedVersion: version },
    });
    expect(approve.status(), await approve.text()).toBe(200);

    // Yayınlanmış plan ikinci kez onaylanamaz.
    const reapprove = await page.request.post(`/api/panel/adaptive-plan/${planId}/approve`, {
      data: { expectedVersion: version + 1 },
    });
    expect(reapprove.status()).toBe(409);

    /* --- 3) Öğrenci planı görür --------------------------------------- */
    await loginAs(page, accounts.student);
    await page.goto("/panel/ogrenci/plan");
    await expect(page.getByText("Köklü ifadeler soru çözümü").first()).toBeVisible();

    /* --- 4) Öğrenci görevi tamamlar ----------------------------------- */
    const complete = await page.request.post(`/api/panel/kocum/tasks/${taskId}/complete`, {
      data: { status: "DONE", actualQuestions: 20, actualCorrect: 16, actualMinutes: 50 },
    });
    expect(complete.status(), await complete.text()).toBe(200);
    expect((await complete.json()).repeated).toBe(false);

    /* --- 5) §5 Çift gönderim ikinci bir tamamlama saymaz -------------- */
    const repeat = await page.request.post(`/api/panel/kocum/tasks/${taskId}/complete`, {
      data: { status: "DONE", actualQuestions: 20, actualCorrect: 16, actualMinutes: 50 },
    });
    expect(repeat.status()).toBe(200);
    expect((await repeat.json()).repeated).toBe(true);

    /* --- 6) §5 Tamamlanan görev açık duruma geri döndürülemez --------- */
    const reopen = await page.request.post(`/api/panel/kocum/tasks/${taskId}/complete`, {
      data: { status: "IN_PROGRESS" },
    });
    expect(reopen.status()).toBe(409);

    /* --- 7) §4 Kısmi güncelleme gerçekleşen veriyi silmez ------------- */
    // Yalnız durumu düzeltir; soru sayısı gönderilmez ve korunmalıdır.
    const correct = await page.request.post(`/api/panel/kocum/tasks/${taskId}/complete`, {
      data: { status: "PARTIAL" },
    });
    expect(correct.status()).toBe(200);

    /* --- 8) §25 Öğrenci başka öğrencinin planına dokunamaz ----------- */
    const foreignWrite = await page.request.post("/api/panel/kocum/tasks", {
      data: {
        studentId: FOREIGN_STUDENT_PROFILE_ID,
        title: "Yetkisiz görev",
        scheduledFor: scheduledForThisWeek(),
        durationMinutes: 30,
      },
    });
    expect(
      [401, 403, 404].includes(foreignWrite.status()),
      `öğrenci koç ucuna yazamamalı, alınan: ${foreignWrite.status()}`,
    ).toBe(true);

    /* --- 9) Koç sonucu görür ve veli özeti yayınlar ------------------- */
    await loginAs(page, accounts.teacher);

    const foreignTask = await page.request.post("/api/panel/kocum/tasks", {
      data: {
        studentId: FOREIGN_STUDENT_PROFILE_ID,
        title: "Yetkisiz görev",
        scheduledFor: scheduledForThisWeek(),
        durationMinutes: 30,
      },
    });
    expect(foreignTask.status(), "ilişkisi olmayan öğrenciye görev yazılamaz").toBe(403);

    const summary = await page.request.post("/api/panel/kocum/summaries", {
      data: {
        studentId: STUDENT_PROFILE_ID,
        strengths: "Soru çözüm temposu düzenli.",
        focusAreas: "Köklü ifadelerde işaret hataları.",
        nextWeekFocus: "Kök içinde çarpan ayırma.",
        parentVisibleText: "Bu hafta planın büyük kısmı tamamlandı.",
        publish: true,
      },
    });
    expect(summary.status(), await summary.text()).toBe(200);
    expect((await summary.json()).status).toBe("PUBLISHED");

    /* --- 10) §17 Veli sakin ve güvenli özeti görür -------------------- */
    await loginAs(page, accounts.parent);
    await page.goto("/panel/veli/kocluk");

    await expect(page.getByText("Bu hafta planın büyük kısmı tamamlandı.")).toBeVisible();
    await expect(page.getByText("Köklü ifadelerde işaret hataları.")).toBeVisible();

    // Veli operasyonel görev listesini GÖRMEMELİ.
    const parentBody = (await page.locator("body").innerText()).toLowerCase();
    expect(parentBody).not.toContain("köklü ifadeler soru çözümü");
    expect(parentBody).not.toContain("yapamadım");
  });
});
