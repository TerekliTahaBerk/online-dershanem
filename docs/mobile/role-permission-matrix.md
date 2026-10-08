# Rol ve İzin Matrisi — Mobil (M0)

Kaynak (uygulama kodu): `lib/auth/roles.ts`, `lib/auth/api-guards.ts`, `lib/auth/session-policy.ts`, `lib/auth/products.ts`, `lib/auth/product-panels.ts`, `lib/products/staff-permission-matrix.ts`, `lib/products/staff-permissions.ts`, `lib/panel/navigation.ts`, route guard'ları. Bu matris **yetki vermez**; tüm kararlar sunucuda kalır. Mobilin görevi, sunucunun reddedeceği ekranları göstermemek ve reddi doğru yorumlamaktır.

## 1. Kimlik katmanları

| Katman | Kaynak | Mobil nasıl öğrenir |
| --- | --- | --- |
| Platform rolü (`ADMIN`/`TEACHER`/`STUDENT`/`PARENT`) | `User.role` | bootstrap `user.role` |
| Ürün erişimi (OD/OK/ODK) + pilot | `getAccessibleProducts` + `checkPilotAccess` / `checkOdkPilotAccess` | bootstrap `products[].state` |
| Aktif çalışma alanı | `Session.activeProduct` (yalnız menü kapsamı) | bootstrap `activeProduct`; değiştirme `POST /api/panel/active-product` |
| Personel izinleri | `ProductStaffAssignment` → `staffPermissionsFor`; ADMIN tümü | bootstrap `staff.permissions` |
| Feature flag'ler | `getPanelFeatureFlags()` (ortam); ADR 0015 sonrası DB snapshot | bootstrap `flags` |
| Oturum güvencesi | `mustChangePassword`, `mfaVerifiedAt`, `stepUpAt` | bootstrap `gates` |
| Veli–öğrenci ilişkisi | `resolveParentScope` (+ `parent-visibility`) | bootstrap `parent.children`; her istekte sunucu yeniden doğrular |

## 2. Oturum politikası ve mobil sonuçları

| Rol | Mutlak ömür | Boşta zaman aşımı | Giriş MFA | Step-up | Mobil kapsam (v1) |
| --- | --- | --- | --- | --- | --- |
| STUDENT | 30 gün | 7 gün | Hayır | Hayır | **Tam** (OD, Yön, Deneme Ligi okuma + öğrenci yazmaları; sınav çözme web'e devredilir) |
| PARENT | 30 gün | 7 gün | Hayır | Hayır | **Tam** (salt okuma + geri bildirim + görüşme işlemleri) |
| TEACHER (OD öğretmeni / Yön koçu) | 7 gün | 24 saat | Yalnız ayrıcalıklı personel rolü varsa | Yalnız `STEP_UP_STAFF_PERMISSIONS` | **Seçili akışlar** (M7): bugün, ders kapanışı, yardım, koç notları, görüşmeler |
| TEACHER (Deneme Ligi personeli) | 7 gün | 24 saat | EXAM_EDITOR / EXAM_OPERATOR / RESULT_PUBLISHER / PRODUCT_MANAGER için **evet** | yayın, anahtar revizyonu, grant | **Kapsam dışı** (en fazla salt okuma rapor, M7/M8) |
| ADMIN | 12 saat | 30 dakika | Hayır (girişte) | Hassas mutasyonlarda zorunlu | **Kapsam dışı** (v1) |

Yenileme token'ı yoktur; süre dolunca 401 → giriş. Mobilde "beni hatırla" veya biyometrik açılış, sunucu oturumunu uzatmaz; yalnız yerel kilit olarak düşünülebilir (M8).

## 3. Çalışma alanı × rol → ekranlar

İşaretler: ✅ v1 kapsamında · 🚩 feature flag'e bağlı (varsayılan kapalı) · ⏳ sonraki faz · ⛔ mobilde yok (web'e yönlendir) · — uygulanamaz.

### 3.1 Öğrenci

| Ekran | OD | Yön (OK) | Deneme Ligi (ODK) | Sunucu kapısı |
| --- | --- | --- | --- | --- |
| Bugün | ✅ OD Bugün | ✅ Yön Bugün | ✅ DL Bugün | STUDENT / `OK` / `ODK` |
| Dersler + ders detayı | ✅ | — | — | `requireApiOdRole("STUDENT")` |
| Çalışmalar | ✅ | — | — | OD |
| Kanıtlı teslim | 🚩 `assignmentEvidence` | — | — | OD + flag |
| Kaynaklar | ✅ | — | — | OD |
| Tekrar ve telafi | 🚩 `reviewQueue` / `recoveryPackage` | — | — | OD + flag |
| Gidişatım (Analiz) | ✅ (`progressInsights` açık) | ✅ | — | Analiz ucu (NEW) |
| Dış denemelerim | 🚩 `mockExamAnalysis` | 🚩 | — | `requireApiAnyProductRole(["OD","OK"])` + flag |
| Planım | — | 🚩 `adaptivePlan` | — | OK + flag |
| Hedeflerim | — | ✅ | — | `requireApiProductRole("OK")` |
| Koçum | — | ✅ | — | OK (+ pilot) |
| Check-in | 🚩 `studentCheckIn` | 🚩 | — | OD veya OK + flag |
| Haftalık özet | ✅ (`parentWeeklyDigest` açık) | ✅ | — | OD + flag |
| Denemelerim / ön-başlangıç / sonuç | — | — | ✅ | `requireApiProductRole("ODK","STUDENT")` + grant |
| Sınav çözme | — | — | ⛔ (v1: web'de) | ODK + grant + oturum planı |
| Dino AI | 🚩 `dinoAi` | 🚩 | — | STUDENT + flag |
| Bildirimler, Ayarlar, Oturumlar | ✅ (ortak) | ✅ | ✅ | `requireApiActiveUser` |

### 3.2 Veli

| Ekran | OD | Yön | Deneme Ligi | Kapı |
| --- | --- | --- | --- | --- |
| Bugün (çocuk seçimi ile) | ✅ | ✅ (Yön bölümü) | ✅ DL Genel bakış | PARENT + `resolveParentScope` |
| Akademik gelişim | ✅ | — | — | PARENT + kapsam |
| Dersler (takvim) | ✅ | — | — | `student-success/calendar?studentId=` |
| Ödev, Öğretmenler | ✅ | — | — | OD + parent-visibility |
| Koçluk (veliye görünür notlar) | — | ✅ | — | OK |
| Deneme Ligi raporları | — | — | ✅ | ODK |
| Haftalık özet + geri bildirim | ✅ | — | — | OD + flag |
| Hesap ve paket | Salt okuma; **satın alma yok** | | | |
| `PREPARING` ürün | Bilgi kartı ("Çocuğunuzun hesabı hazırlanıyor") | | | `loadProductPanelStates` |

### 3.3 Öğretmen / koç / Deneme Ligi personeli

| Ekran | Gerekli rol / izin | Mobil |
| --- | --- | --- |
| Öğretmen Bugün, Dersler, ders kapanışı | TEACHER + OD (enforce'ta `od:lesson:teach`) | ⏳ M7 ✅ |
| Çalışma teslim incelemesi | TEACHER + OD | ⏳ M7 |
| Yardım isteyenler | TEACHER + OD + 🚩 `studentCheckIn` | ⏳ M7 |
| Koç Bugün, Öğrencilerim, Görüşmeler | TEACHER + `COACH@OK` (`ok:coaching:write`) | ⏳ M7 |
| Koç notu, görev erteleme, öneri inceleme | TEACHER + OK | ⏳ M7 |
| Plan onayı | TEACHER + plan ürünü + 🚩 `adaptivePlan` | ⏳ M7 (salt onay) |
| Deneme Ligi öğrenci raporları | `odk:report:read_related` / `read_all` | ⏳ M7 (salt okuma) |
| Deneme yönetimi, canlı operasyon, puanlama, yayın, paketler | `odk:*` (ayrıcalıklı, MFA, step-up) | ⛔ |
| Admin önizleme / öğretmen modu | ADMIN | ⛔ (bootstrap `gates.previewActive` → uyarı ekranı) |

### 3.4 Yönetim (ADMIN)

v1'de mobil giriş mümkün ama içerik yok: bootstrap ADMIN rolünde "Yönetim paneli web'de" bilgi ekranı + Bildirimler + Ayarlar + çıkış. Gerekçe: 30 dk boşta zaman aşımı, step-up, yoğun tablo iş akışları ve yanlış işlem maliyeti. M8'de salt okuma Gelen kutusu ayrı karar olarak değerlendirilir.

## 4. HTTP yanıtı → mobil yorum

| Yanıt | Sunucu nedeni | Mobil aksiyon |
| --- | --- | --- |
| 401 | Oturum yok/süresi doldu/iptal; kullanıcı askıya alındı | Token sil, giriş |
| 403 "parolanızı değiştirmeniz gerekiyor" | `mustChangePassword` | Parola kapısı |
| 403 `MFA_REQUIRED` | Ayrıcalıklı personel, MFA doğrulanmadı | MFA kapısı |
| 403 "yetkiniz yok" | Rol uyuşmuyor | Ekranı kapat, bootstrap yenile |
| 404 "aktif erişiminiz yok" | Ürün üyeliği yok/bitti | Bootstrap yenile; çalışma alanı kilitli |
| 404 "henüz açık değil" | Flag kapalı | Bootstrap yenile; ekranı gizle |
| 404 "Bu pilot erişimi etkin değil." | Pilot kapsamı dışında | Çalışma alanı `PILOT_CLOSED` |
| 503 "Pilot geçici olarak durduruldu." / "Panel şu anda kapalı." | Kill switch / panel kapalı | Bakım ekranı |
| 428 `STEP_UP_REQUIRED` | Hassas personel işlemi | v1: "Bu işlemi web panelinden yapın" |

Not: 404 gövdeleri bugün yalnız Türkçe mesajla ayrışıyor. Mobil mesaj metnine göre **dallanmamalı**; bunun yerine her 403/404'te bootstrap'ı yenileyip ekran kaydını yeniden hesaplamalı. Kararlı hata kodları eklendiğinde (api-contract-inventory §0) kod bazlı dallanmaya geçilir.

## 5. Değişmezler (mobil kod incelemesinde kontrol listesi)

1. Mobil hiçbir yerde rol/ürün/izin kararını yeniden hesaplamaz; yalnız bootstrap'taki hazır sonucu okur.
2. İstekten gelen öğrenci kimliği sunucuda her zaman kapsamla doğrulanır (`resolveStudentScopeForViewer`, `resolveParentScope`); mobil `studentId` gönderir ama güvenmez.
3. Koçun gizli notları (`privateNote`, INTERNAL) hiçbir mobil okuma modelinde yer almaz.
4. Admin önizleme ve öğretmen modu mobilde başlatılamaz.
5. Satın alma/ödeme bağlantısı mobilde gösterilmez.
6. Push bildirimi yükünde kişisel veya akademik içerik bulunmaz.
