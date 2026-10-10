# M7 personel izin incelemesi (M7.0)

Tarih: 2026-10-10. Kapsam: mobilin kullandığı her okuma ve yazma ucu, `UserRole.TEACHER` (OD öğretmeni ve Yön koçu).

## 1. İlke

- **Rol tek başına yetki değildir.** Her uç sunucuda şunları sırayla doğrular: oturum + parola / MFA kapıları → platform rolü → ürün erişimi → personel izni → kaynak ilişkisi.
- **Bootstrap `capabilities.staffPermissions` ve menü yalnız görünürlüktür.** Mobil bu değerlerle hiçbir şeye izin vermez.
- **`STAFF_PRODUCT_ASSIGNMENTS` modu değiştirilmedi.** Kodun varsayılanı `shadow`. Shadow modunda eski karar uygulanır: her TEACHER `od:lesson:teach`, `od:student:read`, `ok:coaching:write`, `ok:note:read_private` ve `odk:report:read_related` iznine sahiptir. Üretimdeki gerçek mod **bilinmiyor**; operasyonel engel olarak kaydedildi (§5).
- **ADMIN mobilde yalnız web.** Mobil personel okuma uçları `requireApiProductRole(product, "TEACHER")` kullanır; ADMIN 403 alır (probe 2).

## 2. Yeni okuma uçları (M7)

| Uç | Kapı | Kaynak ilişkisi |
| --- | --- | --- |
| `GET /api/panel/staff/teacher/home` | OD + `od:lesson:teach` | `getTeacherWorkspace` (web ile aynı) |
| `GET /api/panel/staff/teacher/lessons?aralik=` | OD + `od:lesson:teach` | `lesson.teacherId = oturum` |
| `GET /api/panel/staff/teacher/lessons/[id]` | OD + `od:lesson:teach` | `lesson.teacherId = oturum`; yoksa 404 |
| `GET /api/panel/staff/teacher/assignments` | OD + `od:lesson:teach` | grup öğretmeni (web ödevler sorgusu) |
| `GET /api/panel/staff/teacher/submissions[/id]` | OD + `od:lesson:teach` + `assignmentEvidence` | SUBMITTED, aktif ödev, aktif grup, **aktif kayıt** (değerlendirme ucuyla aynı) |
| `GET /api/panel/staff/teacher/help` | OD + `od:lesson:teach` + `studentCheckIn` | `teacherHelpScope` + aktif kayıt; yalnız `shareWithTeacher` |
| `GET /api/panel/staff/coach/*` | OK + `ok:coaching:write` | aktif `CoachAssignment` (`endedAt = null`, `coach.userId = oturum`) |
| `GET /api/panel/staff/coach/plans[/id]` | ayrıca `adaptivePlan` | aktif atama + `requiresPlanApproval` ürünü |
| `GET /api/odk/staff/related-reports[?studentId]` | ODK + `odk:report:read_related` | yalnız `listOdkReportStudents` sonucu; `StudentProfile.id ↔ User.id` dönüşümü sunucuda |

Özel alanlar: görüşme `privateNote` ve INTERNAL koç notları yalnız `ok:note:read_private` ile döner. Bugün / liste yanıtlarına hiç girmez.

## 3. Mevcut yazma uçları (değiştirilmedi)

| Mobil işlem | Uç | Kapı |
| --- | --- | --- |
| Ders kaydet / kapat | `PUT /api/panel/lessons/[id]/notes` | `requireApiOdRole("TEACHER")` + `lesson.teacherId` + grup kaydı; `expectedVersion` + `idempotencyKey` |
| Teslim değerlendir | `POST /api/panel/assignment-submissions/[id]/review` | `requireApiOdRole("TEACHER")` + grup öğretmeni + aktif kayıt + sürüm |
| Yardım yanıtı | `POST /api/panel/student-help-requests/[id]/respond` | `requireApiOdRole("TEACHER")` + kapsam + sürüm |
| Görüşme oluştur / SAVE / COMPLETE | `POST /api/panel/coaching-sessions[/id]` | `requireCoachingMutation` + `coachingAssignmentScope` + sürüm + tekrar anahtarı |
| Koç notu | `POST /api/panel/kocum/notes` | `requireApiProductRole("OK","ADMIN","TEACHER")` + `assertAssignedCoach` |
| Görev taşı | `POST /api/panel/kocum/tasks/[id]/reschedule` | aynı + plan sürümü + plan haftası |
| Öneri incele | `POST /api/panel/kocum/suggestions/[id]/review` | aynı; yalnız PENDING |
| Plan onayı | `POST /api/panel/adaptive-plan/[id]/approve` | `requireApiAccountRole("TEACHER")` + plan ürün rolü + `assertAssignedCoach` + DRAFT + sürüm |

`assertAssignedCoach`, `ok:coaching:write` iznini ve aktif atamayı denetler. Bu yazma uçlarının **hiçbiri** bugün adım yükseltme (step-up) istemiyor. Mobil yine de 428 `STEP_UP_REQUIRED` gelirse işlemi web devamına yönlendirir; atlatma yok.

## 4. Bulgular (değiştirilmedi, kaydedildi)

| # | Bulgu | Etki | Öneri |
| --- | --- | --- | --- |
| S-1 | Okuma uçları "ürün rolü + personel izni", mevcut OD yazma uçları yalnız ürün rolü (`requireApiOdRole`) kullanıyor | Shadow'da eşdeğer. Enforce'ta okuma daha sıkı; yazma uçları `od:lesson:teach` istemiyor | Enforce öncesi OD yazma uçlarına `od:lesson:teach` eklenmeli (ayrı onay) |
| S-2 | Üretim `STAFF_PRODUCT_ASSIGNMENTS` modu bilinmiyor | Personel izin davranışı doğrulanamaz | Operasyon onayı (BLOCKED, §5) |
| S-3 | Yardım isteyenler web'de **Yön** menüsünde; yanıt ucu **OD** öğretmen rolü istiyor | Yalnız OK erişimli koç kutuyu görür, yanıtlayamaz (`canRespond=false`) | Ürün kararı |
| S-4 | Web koç çalışma alanı plan sorgusunda ürün süzgeci yok | KPSS planı koç özetine karışabilir | Ayrı küçük düzeltme (M6'daki `productRef OK` gibi) |
| S-5 | Web hazırlık sayfası INTERNAL dahil tüm koç notlarını gösteriyor; mobil INTERNAL'ı yalnız `read_private` ile gösteriyor | Shadow'da eşdeğer; enforce'ta mobil daha sıkı | Web'e aynı süzgeç (ayrı onay) |
| S-6 | Web öğretmen çalışma alanı teslim kuyruğu aktif kayıt denetlemiyor; mobil kuyruk değerlendirme ucuyla aynı kapsamda | Web'de değerlendirilemeyen satır görünebilir | Web'e aynı süzgeç |
| S-7 | Öğretmen çalışma alanı PLAN_APPROVAL kaynağı OD kaydına göre kapsamlı | Koç ataması olmadan plan onayı satırı görünebilir; onay ucu yine reddeder | Kaynağı koç atamasına bağlamak |
| S-8 | ODK web öğretmen raporu bütünlük etiketi gösteriyor; mobil göstermiyor | Mobil daha dar | — |
| S-9 | İkinci değerlendirme / ikinci öneri incelemesi 409 değil 404 döndürüyor (kayıt artık kuyrukta değil) | Çift uygulama yok. Mobil 404'ü "başka yerde işlendi" olarak ele alıp yeniden yükler | — |

## 5. Engeller

- **BLOCKED (operasyon):** Üretim `STAFF_PRODUCT_ASSIGNMENTS` modu ve `ProductStaffAssignment` verisinin doluluğu. Enforce'a geçiş bu M7'de **yapılmadı** ve yapılmamalı.
