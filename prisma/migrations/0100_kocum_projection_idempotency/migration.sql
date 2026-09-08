-- Online Koçum — projeksiyon ve öneri idempotency'sini VERİTABANI seviyesinde
-- garanti eder.
--
-- Neden: `assignment-projection` tüketicisi ve öneri kabulü, aynı işin ikinci
-- kez yazılmasını yalnızca UYGULAMA içinde okuyup kontrol ederek engelliyordu
-- (önce `findFirst`, sonra `create`). İki eşzamanlı işleyici — üst üste binen
-- cron, elle tetikleme, aynı olayın yeniden denenmesi — kontrolü İKİSİ DE
-- geçiyor ve öğrencinin haftasında aynı ödev iki görev olarak beliriyordu.
--
-- Prisma şema dili koşullu (partial) benzersiz indeks ifade edemediği için
-- indeksler burada elle tanımlanır. `prisma db push` bunları düşürür;
-- şema değişikliği `migrate diff` + `migrate deploy` yoluyla gitmelidir.

-- KAPSAM: yalnız AKTİF görevler. `SKIPPED` bir görev emekliye ayrılmış
-- geçmiştir; plan yeniden üretildiğinde (adaptif üretim, telafi dengelemesi)
-- eski satırlar aynı işlemde `SKIPPED` işaretlenip yenileri yazılır. İndeks
-- `SKIPPED` satırları kapsasaydı bu meşru akış benzersizlik ihlaline
-- düşerdi. Korunması gereken değişmez şudur: bir planda bir ödevin AYNI ANDA
-- birden fazla açık görevi olamaz.

-- Var olan çiftleri temizle: her (plan, ödev) için EN ESKİ görev kalır,
-- öğrencinin üzerinde çalışmış olabileceği kayıt korunur.
DELETE FROM "weekly_plan_tasks" t
USING "weekly_plan_tasks" keep
WHERE t."source_type" = 'ASSIGNMENT'
  AND keep."source_type" = 'ASSIGNMENT'
  AND t."source_reference_id" IS NOT NULL
  AND t."status" <> 'SKIPPED'
  AND keep."status" <> 'SKIPPED'
  AND t."plan_id" = keep."plan_id"
  AND t."source_reference_id" = keep."source_reference_id"
  AND (keep."created_at", keep."id") < (t."created_at", t."id");

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_plan_tasks_one_per_assignment_ref"
  ON "weekly_plan_tasks" ("plan_id", "source_reference_id")
  WHERE "source_type" = 'ASSIGNMENT'
    AND "source_reference_id" IS NOT NULL
    AND "status" <> 'SKIPPED';

-- Kabul edilen bir öneri tek görev doğurur. Öneri kabulü artık görevin
-- `source_reference_id` alanına öneri kimliğini yazar; bu indeks aynı
-- önerinin iki kez uygulanmasını imkânsız kılar.
DELETE FROM "weekly_plan_tasks" t
USING "weekly_plan_tasks" keep
WHERE t."source_type" = 'SYSTEM_SUGGESTED'
  AND keep."source_type" = 'SYSTEM_SUGGESTED'
  AND t."source_reference_id" IS NOT NULL
  AND t."status" <> 'SKIPPED'
  AND keep."status" <> 'SKIPPED'
  AND t."plan_id" = keep."plan_id"
  AND t."source_reference_id" = keep."source_reference_id"
  AND (keep."created_at", keep."id") < (t."created_at", t."id");

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_plan_tasks_one_per_suggestion_ref"
  ON "weekly_plan_tasks" ("plan_id", "source_reference_id")
  WHERE "source_type" = 'SYSTEM_SUGGESTED'
    AND "source_reference_id" IS NOT NULL
    AND "status" <> 'SKIPPED';
