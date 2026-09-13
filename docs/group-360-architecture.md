# Group 360 / Eğitim Operasyon Yönetimi

Bu not, admin panelindeki **Grup 360** ekranının mimarisini, transfer
güvenliğini ve operasyon sinyallerini özetler. Amaç: admin bir grubu açtığında
öğrencileri, öğretmeni, programı, kapasiteyi ve operasyon sorunlarını tek
ekranda yönetebilsin.

## Rota

| Rol | Path | Liste dönüşü |
| --- | --- | --- |
| ADMIN | `/panel/yonetim/gruplar/[id]?sekme=` | `/panel/yonetim/egitim` |

Sekmeler `?sekme=` ile seçilir. Geçersiz sekme `genel`'e düşer.

## Katmanlar

```
page.tsx
  └─ loadGroup360Bundle()            lib/panel/group-360-server.ts
       ├─ deriveGroup360Issues()     saf
       ├─ summarizeGroup360Ops()     saf
       ├─ sekme bazlı Prisma sorguları
       └─ findOpenGroupScheduleConflicts()
  └─ Group360View                    components/panel/group-360-view.tsx
```

Saf kurallar: `lib/panel/group-360.ts`  
Üyelik/transfer: `lib/panel/group-lifecycle.ts`  
Program çakışması: `lib/panel/lesson-lifecycle.ts`

## Üst özet

Kim → durum → sorun → aksiyon:

1. Grup adı, eğitim/sınav türü (`subject` + `level`), aktif/arşiv
2. Kapasite ve mevcut öğrenci
3. Ana öğretmen, haftalık ders sayısı, bir sonraki ders
4. Operasyon durumu + “Bu grupla ilgili şu an çözülmesi gereken bir sorun var mı?”
5. Ana aksiyonlar: öğrenci ekle / transfer / öğretmen değiştir / ders oluştur /
   seri düzenle / arşivle

## Sekmeler

| Sekme | İçerik |
| --- | --- |
| Genel | hızlı özet, yaklaşan dersler, kapasite, operasyon sorunları |
| Öğrenciler | tablo + bulk preview→confirm→execute |
| Program | haftalık program, seriler, süre, çakışmalar |
| Geçmiş | tamamlanan / iptal / katılım oranı |
| Operasyon | sorun listesi, öğretmen değiştir, meta, arşiv |

## Operasyon sinyalleri

Açıklanabilir kodlar (`deriveGroup360Issues`):

- `TEACHER_MISSING` — öğretmen pasif/eksik
- `CAPACITY_FULL` — koltuk dolu
- `NO_SCHEDULED_LESSON` — plansız ders
- `STALE_GROUP` — uzun süredir ders yapılmayan grup (≥ 21 gün)
- `SCHEDULE_CONFLICT` — unresolved çakışma
- `EMPTY_ACTIVE_GROUP` — boş aktif grup
- `GROUP_INACTIVE` — arşiv

## Transfer akışı

Tek tık mutation yok. Akış:

1. Hedef grup seç
2. `POST /api/panel/groups/[id]/members` · `PREVIEW`
3. Kapasite + öğrenci program çakışması + etkilenecek dersler
4. UI confirm
5. `EXECUTE` · `Serializable` transaction + `SELECT … FOR UPDATE` satır kilidi
6. Audit (`group.membership_transferred`)

Tek öğrenci için `PATCH` üzerinde `PREVIEW_TRANSFER` ve
`TRANSFER_STUDENT` + `confirmed: true` da desteklenir.

## Bulk öğrenci aksiyonları

`POST /api/panel/groups/[id]/members`

| action | Açıklama |
| --- | --- |
| TRANSFER | hedef gruba taşı |
| REMOVE | gruptan çıkar |
| NOTIFY | öğrenci (+ veli) bildirimi |

Hepsi `mode: PREVIEW | EXECUTE` ister. EXECUTE admin step-up ister.

## Program çakışması

`findLessonScheduleConflicts` üç tür tarar:

- öğretmen çakışması
- aynı grup çakışması
- öğrenci çakışması (diğer aktif gruplarındaki planlı dersler)

Ders oluşturma (`POST /api/panel/lessons`) öğrenci listesini de kontrol eder.

## Güvenlik

Tüm mutation:

- permission (`requireApiRecentAdminStepUp` / `requireApiAccountRole`)
- current-state validation (`ensureActiveGroup` / `ensureActiveStudent`)
- transaction (`Serializable` kapasite işlemlerinde)
- audit log
- anlamlı `code` + HTTP status (409 kapasite/çakışma, 404 grup yok)

## İndeksler

Migration `0090_group_360_indexes`:

- `enrollments(group_id, ended_at)` — kapasite sayımı
- `lessons(status, starts_at)` / `lessons(group_id, status, starts_at)` — program tarama

## Testler

- Unit: `lib/group-360-ops.test.ts`
- Integration: `tests/integration/group-lesson-lifecycle.integration.ts`
  (kapasite, seri kapsamı, öğretmen/grup çakışması; concurrent transfer
  Serializable ile reddedilmeli)

## Senaryo kontrol listesi

- [ ] Dolu grup — ekleme/transfer 409
- [ ] Boş grup — EMPTY_ACTIVE_GROUP info
- [ ] Öğretmen çakışması — program sekmesi + ders create
- [ ] Transfer preview→confirm→execute + audit
- [ ] Concurrent transfer — biri kapasite/serialization hatası alır
- [ ] Arşiv öğrenci — STUDENT_NOT_FOUND / STUDENT_INACTIVE
- [ ] Arşiv grup — GROUP_INACTIVE
- [ ] Ders serisi güncelleme — mevcut lesson PATCH scope
- [ ] Bulk transfer / remove / notify
