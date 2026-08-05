# Runbook — İşletme RBAC geçişi (`0068_business_rbac_backfill`)

Bu geçiş, İşletme Paneli erişimini `User.role === "ADMIN"` örtük kuralından
gerçek `BusinessRoleAssignment` satırlarına taşır.

## Neden riskli

Kod ve veri **birlikte** doğru olmak zorundadır:

- Kod deploy edilir ama migration çalışmazsa → **bütün yöneticiler işletme
  alanından kilitlenir** (panel 404 döner).
- Migration çalışır ama kod deploy edilmezse → zararsızdır; eski kod atama
  satırlarını okumaz, davranış değişmez.

Bu yüzden **doğru sıra: önce migration, sonra deploy.**

## Uygulama sırası

1. **Önce oku.** Canlı `DATABASE_URL` bir Prisma Accelerate adresidir ve
   migration için kullanılamaz; `DIRECT_URL` gerekir.

   ```bash
   vercel env pull .env.production.local --environment production --yes
   ```

2. Mevcut durumu doğrula:

   ```bash
   DATABASE_URL="$DIRECT" DIRECT_URL="$DIRECT" npx prisma migrate status
   ```

3. Etkilenecek satır sayısını **önceden** gör (yazma yapmaz):

   ```sql
   SELECT count(*) AS eklenecek_satir
   FROM users u CROSS JOIN business_units bu
   WHERE u.role = 'ADMIN' AND u.status = 'ACTIVE' AND bu.is_active = true;
   ```

4. Migration'ı uygula:

   ```bash
   DATABASE_URL="$DIRECT" DIRECT_URL="$DIRECT" npx prisma migrate deploy
   ```

5. Sonucu doğrula — en az bir SUPER_ADMIN olmalı:

   ```sql
   SELECT u.email, bu.code, a.role
   FROM business_role_assignments a
   JOIN users u ON u.id = a.user_id
   JOIN business_units bu ON bu.id = a.business_unit_id
   ORDER BY u.email;
   ```

6. Uygulamayı deploy et.

7. `.env.production.local` dosyasını **sil** — içinde PayTR anahtarları var.

## Güvenlik özellikleri

- **Veri kaybı yok.** Migration yalnız `INSERT` yapar; hiçbir satır silmez
  veya güncellemez.
- **Idempotent.** `ON CONFLICT (user_id, business_unit_id, role) DO NOTHING`
  sayesinde tekrar çalıştırılabilir. Yerel Postgres 16'da iki kez çalıştırılıp
  satır sayısının değişmediği doğrulandı.
- **Yetki genişletmez.** Yalnız hâlihazırda tam erişimi olan aktif platform
  yöneticilerine, zaten sahip oldukları yetkiyi açık satır olarak yazar.
  `SUSPENDED` yöneticiler ve öğretmen/öğrenci/veli rolleri kapsam dışıdır
  (yerel testte doğrulandı).

## Geri alma

```sql
DELETE FROM business_role_assignments
WHERE id LIKE 'bootstrap-superadmin-%';
```

Migration'ın ürettiği kimlikler `bootstrap-superadmin-` önekiyle
başlar; bu ifade elle yapılmış atamalara dokunmaz. Yerelde doğrulandı.

**Uyarı:** Geri alma yalnız *kod da geri alınacaksa* güvenlidir. Yeni kod canlı
kalırken bu satırları silmek yöneticileri kilitler.

## Acil kurtarma

Atamalar herhangi bir sebeple kaybolursa, deploy beklemeden erişim geri
kazanılabilir:

```
BUSINESS_BOOTSTRAP_SUPER_ADMIN_EMAILS="yonetici@example.com"
```

Bu değişken yalnız **hiç ataması olmayan** platform ADMIN'leri için geçerlidir
ve her kullanımda `business.bootstrap_super_admin_used` uyarısı loglanır.
Erişim geri geldikten sonra kalıcı atamalar Ayarlar → İş birimi rolleri
ekranından yapılmalı ve değişken tekrar boşaltılmalıdır.

Ayrıntılı model: [`docs/business-rbac.md`](business-rbac.md).
