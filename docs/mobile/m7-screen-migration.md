# M7 ekran geçişi — Öğretmen ve koç

Eşleme `mobile/src/navigation/native-screens.ts`. Anahtar **rol + çalışma alanı + menü kimliği** üçlüsüdür. Menüde görünmek yetki değildir; her ekranın ucu sunucuda doğrulanır.

## Kabuk (M7.1)

- Personelde alt çubuk yok (web kararı): sekmeler **Bugün** + **Menü**.
- Bugün, etkin çalışma alanının ana ekranıdır: OD → öğretmen Bugün, Yön → koç Bugün, Deneme Ligi → ilişkili raporlar.
- Çalışma alanı olmayan öğretmen ve ADMIN bilgi ekranında kalır (`StaffHomeScreen`). ADMIN için native eşleme yok.
- Menü artık öğretmene de sunucu menüsünün bölümlerini gösterir. Eşlenmeyen öğeler açık web devamıdır (`openOnWeb`, yalnız `/panel/...`).
- Çalışma alanı değiştirici Bugün ekranlarında.

## Öğretmen — OD çalışma alanı

| Menü kimliği | Native ekran | Not |
| --- | --- | --- |
| `today` | `teacher-home` | Bugünkü dersler, bekleyen işler (native veya "(web)" etiketli), dikkat, yaklaşanlar |
| `lessons` | `teacher-lessons` | Yaklaşan / geçmiş |
| (detay) | `/teacher/lesson/[id]` | Hazırlık / Ders / Kapanış; yoklama, öğrenci notu, kazanım; HTTPS ders bağlantısı |
| `assignments` | `teacher-assignments` | Değerlendirme kuyruğu (bayrak) + ödev özeti (salt okunur); oluşturma / düzenleme web |
| (detay) | `/teacher/submission/[id]` | Rubric + geri bildirim + karar |
| `students`, `materials`, `review`, `recovery`, `mock-exams`, `ai-drafts`, `analiz`, … | web devamı | M7 kapsamı dışı |

## Koç — Yön çalışma alanı

| Menü kimliği | Native ekran | Not |
| --- | --- | --- |
| `today` | `coach-home` | Bugünkü görüşmeler, nedene göre dikkat grupları |
| `coach-students` | `coach-students` | Aktif atamalar |
| (detay) | `/coach/student/[id]` | Plan özeti, son görüşmeler, görüşme planlama, notlar (görünürlük seçimi) |
| `coach-sessions` | `coach-sessions` | Yaklaşan / son 30 gün |
| (detay) | `/coach/session/[id]` | Özet, saat düzenle / öner (SAVE), tamamla (COMPLETE) |
| `plan` | `coach-plans` | Planlama haftası + öneri kabul / red |
| (detay) | `/coach/plan/[id]` | Görev taşıma, plan onayı |
| `help` | `teacher-help` | S-3: yanıt OD rolü ister; yoksa salt okunur |
| `interventions`, `digests`, … | web devamı | |

## Deneme Ligi çalışma alanı

| Menü kimliği | Native ekran |
| --- | --- |
| `today`, `odk-reports`, `odk-teacher-reports` | `teacher-odk-reports` (öğrenci listesi → rapor; salt okunur) |

Yönetim (sınav düzenleme, canlı operasyon, hak yönetimi, puanlama, yayın, anahtar revizyonu, paket) mobilde **yok**.

## Detay rotaları ve derin bağlantılar

- `StaffRouteGate` kapısı şunları ister: TEACHER rolü, doğru çalışma alanı ve ilgili menü öğesi (`lessons`, `assignments`, `coach-students`, `coach-sessions`, `plan`). Aksi durumda güvenli boş durum gösterilir.
- `ALLOWED_DEEP_LINK`: `teacher/(lesson|submission)/:id` ve `coach/(student|session|plan)/:id` eklendi. Sorgu dizesi atılır.
- Bildirim kaydı eşlemesi (uygulama içi):
  - `/panel/ogretmen/ders/:id` → ders (menüde `lessons` varsa);
  - `/panel/ogretmen/hazirlik/:id` → koç öğrenci (menüde `coach-students` varsa).
- Personel push'u **yok** (M5 dağıtıcısı genişletilmedi).

## Web değişikliği

Web ders, yardım ve ödevler sayfaları ile koç çalışma alanı aynı sunucu yükleyicilerini kullanır. Sorgular birebir taşındı; görünür davranış değişmedi (E2E §m7-validation-results).
