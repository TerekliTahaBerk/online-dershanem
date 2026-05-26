# OnlineDershanem (OD) + OnlineDenemeKulübü (ODK) — Sistem Durum Analizi

**Tarih:** 2026-05-26
**Branch:** `test`
**Kapsam:** Web sitesi + 4 panel (Admin / Öğretmen / Öğrenci / Veli) + ODK ürünü +
mobil app + ödeme + bildirim + analytics + güvenlik + performans + UX.
**Not:** Bu rapor sadece analizdir; hiçbir kod değişikliği önerilmemiştir.
Daha önceki audit dokümanları (`od-odk-audit-2026-05.md`, `production-readiness-roadmap.md`,
`panel-system-master-plan.md`, `odk-faz-8-polish.md`) referans alınarak bugünün
fiili durumu çıkarılmıştır.

Önem seviyeleri raporda: **🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low**
Efor (geliştirici-günü) tahminleri: **XS ≤0.5g · S 1–2g · M 3–5g · L 6–10g · XL 10g+**

---

## A. Genel Ürün Durumu

Repo, **iki ürünü tek monorepo + tek Next.js 15 (App Router) uygulaması** olarak
yürüten olgun bir SaaS iskeleti. Prisma şemasında 76+ model, NextAuth v4 (JWT),
PayTR iframe entegrasyonu, Expo (React Native) mobil app, Vercel Cron (8 job),
yapılandırılmış logger (PII mask), AuditLog, iki-katmanlı cache (Upstash + memory),
KVKK akışı, e-posta outbox + retry, push notification, brute-force koruma
(e-mail bazlı), CSP header'ları mevcut.

Geride bırakılan iş:
- 12 "Round" tamamlanmış (foundation → security → ODK PayTR → KVKK → SEO/OG → toast).
- R-A audit'i tamamlanmış, R-B/R-C/R-D round'ları kapanmış.
- Önemli teknik borç envanteri zaten dokümante (`od-odk-audit-2026-05.md` §B–§F).

Genel yargı: **"Ürün canlıya çıkacak seviyenin %75–80'inde."** Kritik backbone
(auth, paket, ödeme, deneme oluşturma/çözme, bildirim, audit) çalışır durumda.
Eksikler ağırlıklı olarak:
1. **OD ödeme tarafının PayTR'ye gerçekten bağlanmamış olması** (kullanıcı OD paketini hâlâ tam otomasyonla satın alamıyor → manuel + lead akışı),
2. **Canlı ders sisteminin "Google Meet link alanı"ndan ibaret olması** (otomatik provisioning, attendance integration, yoklama bağlama YOK),
3. **OD `Lesson.studentId NOT NULL` zorunluluğunun grup dersini engellemesi**,
4. **Veli panelinde net product-context ayrımı** ve **çocuk detay sayfasının zayıflığı**,
5. **Pagination'ın 20+ liste sayfasına henüz wire edilmemiş** olması (helper var, kullanım yok).

---

## B. Güçlü Taraflar

| # | Güçlü taraf | Kanıt |
|---|---|---|
| 1 | **Veri modeli mature** — OD/ODK ayrımı backbone'da net (OdkOrder/OdkPayment/OdkEntitlement/OdkAccessTag) | `prisma/schema.prisma` 76+ model |
| 2 | **AuditLog kapsamı geniş** — ödeme/access/login/webhook/CRUD'da yazılıyor | `lib/audit.ts` + Round 1–8 |
| 3 | **PayTR iframe ödeme — ODK tarafında uçtan uca çalışıyor** (idempotent, hash verify, AccountingEntry, AccessTag grant) | `lib/odk/{paytr,checkout}.ts` + `app/api/odk/paytr/callback` |
| 4 | **Cache layer iki katmanlı (Upstash REST + memory)** + fail-open | `lib/cache.ts`, `/api/health` `cache.backend` |
| 5 | **Cron infra düzgün** — 8 job, hepsinin handler'ı var, `runJob` auth+log abstraction | `lib/jobs/runner.ts`, 8 `app/api/cron/*` |
| 6 | **ODK deneme çözme akışı** — autosave + cheat tracker + section navigator + a11y + idempotent submit | `components/panel/odk/student/exam-solver.tsx`, `use-cheat-tracker.ts` |
| 7 | **ODK deneme oluşturma wizard'ı** — TYT/AYT/LGS/KPSS/ALES preset, JSON anahtar/kazanım upload, PDF upload | `exam-wizard.tsx`, `exam-detail-editor.tsx` |
| 8 | **KVKK akışı tam** — data export endpoint, account deletion request (24h soft + admin onay + cron hard-delete + PII anonymize) | `lib/account-deletion.ts`, `app/api/cron/account-deletion-process` |
| 9 | **Brute-force koruması (e-mail bazlı) + structured login audit** | `lib/login-attempts.ts`, `lib/auth.ts` |
| 10 | **Mobile app (Expo) backend'le tam bağlı** — JWT, push token, parent/student/teacher endpoint ailesi | `mobile-app/`, `app/api/v1/mobile/**` |
| 11 | **SEO + OG generator iyi seviyede** — 10 OG route, JSON-LD (Org/WebSite/FAQ), sitemap dinamik | `lib/seo/`, `app/page.tsx`, `app/sitemap.ts` |
| 12 | **Brand voice + içerik tutarlılığı** — `lib/content.ts` tek kaynak, marka tonu dokümanı (`docs/brand-voice.md`) var |
| 13 | **DevOps runbook + health endpoint** — `/api/health` DB + cache + boot info | `docs/devops-runbook.md`, `app/api/health` |
| 14 | **Pagination + N+1 farkındalığı var** — `lib/pagination.ts`, R3 dokümante | (wire eksik) |
| 15 | **CSP + HSTS + COOP + Permissions-Policy** baseline ayarlanmış (PayTR/Meet/PDF whitelist) | `next.config.ts` |

---

## C. Kritik Eksikler (Top-Priority)

| # | Eksik | Önem | Etki | Tahmini efor |
|---|---|---|---|---|
| 1 | **OD paket satın alma PayTR'ye bağlı değil** — sipariş `OdOrder/OdPayment` modeli var ama webhook `AccountingEntry` yazmıyor, çoğu paket "lead → manuel ödeme" akışında | 🔴 Critical | Kullanıcı OD paketini otomatik alamıyor; her sipariş admin tarafından manuel işleniyor | L |
| 2 | **Canlı ders = "Google Meet link alanı"** — `Lesson.googleMeetLink` string. Otomatik room create, attendance bağlama, kayıt arşivi, geç-katılım hesabı YOK | 🔴 Critical | Veli/öğrenci/öğretmen UX'inin merkezindeki "canlı ders" deneyimi tamamen manuel | XL |
| 3 | **`Lesson.studentId NOT NULL`** → **grup dersi DB seviyesinde imkansız** | 🔴 Critical | OD'nin "küçük grup canlı ders" pazarlamasıyla şema çelişiyor; her grup oturumu için N tekil Lesson kaydı yaratılmak zorunda | M (migration + 13+ kod path) |
| 4 | **`/panel/admin/dersler/yeni` ve düzenleme route'ları henüz Course-bazlı değil** (Course modeli var, UI Lesson-bazlı) | 🟠 High | Admin "ders tanımı" ile "ders oturumu"nu ayıramıyor; ders programı planlama wizard'ı eksik | M |
| 5 | **OD muhasebe otomasyonu eksik** — webhook'tan OD AccountingEntry yazılmıyor (yorum "paneller sökülürken kaldırıldı") | 🟠 High | OD gelirleri sadece manuel girişlerle muhasebeye düşüyor; ODK gelirleri otomatik düşüyor → tutarsız tablo | S |
| 6 | **Veli panel çocuk detayı zayıf** — `/panel/veli/cocuklarim/[id]` mevcut ama içerik sığ; per-child ODK + OD birleşik timeline yok | 🟠 High | Veli en kritik kullanıcı tipi; rebuild Round 5'te dashboard düzeldi ama child-detail aynı kaldı | M |
| 7 | **Pagination 20+ liste sayfasında hardcoded `take: 100/200/500/1000`** | 🟠 High | Ölçek geldiğinde admin liste sayfaları çökme/yavaşlama riski; helper hazır, wire edilmedi | M |
| 8 | **Inbox sistemi yarım** — `InboxMessage` modeli var, mevcut `Notification` yan yana yaşıyor, UI tüm panellerde tutarlı değil | 🟠 High | Bildirim deneyimi parçalı; aynı event hem Notification hem ad-hoc UI'da | M |
| 9 | **IP-bazlı brute force koruması yok** — sadece e-mail bazlı (NextAuth `authorize` IP'yi vermiyor) | 🟠 High | Distributed credential stuffing'e açık | M |
| 10 | **Öğretmen ↔ Veli mesajlaşma yok** — sadece notification fan-out; veli öğretmene cevap yazamıyor | 🟠 High | Veli deneyiminin en çok beklenen feature'ı | M |
| 11 | **ODK öğrenci sınav salonunda reconnect/resume UX'i opaque** — autosave var ama "internet koptu → kaldığın yerden devam et" akışı kullanıcıya gösterilmiyor | 🟡 Medium | Sınav sırasında panik yaratabilir | S |
| 12 | **Cache invalidation yok (pure TTL)** — admin bir değişiklik yaptığında dashboard 60s stale | 🟡 Medium | Kullanıcı "veri eski" şikayeti potansiyeli | S |
| 13 | **B2B / multi-tenant erteli** — `institutionId` yok; ilk B2B sözleşmesinde dönüş riski | 🟡 Medium | Şu an risk değil, prematür değil | L (geldiğinde) |

---

## D. Panel Bazlı Feature Matrisi

Legend: ✅ tam · 🟡 kısmi · ❌ yok · ⚠ var ama UX zayıf

### D.1 Admin Panel

| Modül | UI | API/Server Action | DB Model | CRUD | Validation | Audit | Öncelik |
|---|---|---|---|---|---|---|---|
| Dashboard (OD) | ✅ | cached 30s | analytics agg | r/o | n/a | n/a | — |
| Dashboard (ODK) | ✅ | cached 60s | analytics agg | r/o | n/a | n/a | — |
| Öğrenciler | ✅ | ✅ | Student/User | C/R/U/D | ✅ | ✅ | — |
| Öğretmenler | ✅ | ✅ | Teacher/User | C/R/U/D | ✅ | ✅ | — |
| Veliler | ✅ | ✅ | Parent/User | C/R/U/D | ✅ | 🟡 (link audit eksik) | 🟡 |
| Veli-öğrenci bağlama | 🟡 | ✅ | ParentStudent | C/R/D, U yok | ⚠ | 🟡 | 🟡 |
| Sınıflar | ✅ | ✅ | Classroom + join | C/R/U/D | ✅ | 🟡 | — |
| Dersler (=Course tanımı) | 🟡 | ✅ (delete audit) | Course/Module/Content | C/R/U/D var ama UI Course'tan kopuk | ⚠ | ✅ | 🟠 |
| Ders programı | 🟡 | ✅ | Lesson | C/R/U/D | ⚠ | ✅ | 🟠 |
| Canlı dersler | ❌ | n/a | Lesson.googleMeetLink string | manuel link yapıştır | ❌ | ❌ | 🔴 |
| Ödevler | ✅ | ✅ | Assignment/Submission | C/R/U/D | ✅ | 🟡 | 🟡 |
| Paketler (OD) | ✅ | ✅ | Package | C/R/U/D | ✅ | 🟡 | — |
| Paketler (ODK) | ✅ | ✅ | OdkPackage | C/R/U/D | ✅ | ✅ (R2) | — |
| Ödemeler (OD) | 🟡 (lead-style) | 🟡 | PurchaseIntent/Event + OdOrder/OdPayment | C/R, U/D yok | ⚠ | 🟡 | 🟠 |
| Ödemeler (ODK) | ✅ | ✅ | OdkPayment | R/U (status), C/D yok | ✅ | ✅ (R2) | — |
| Muhasebe | ✅ | ✅ | AccountingEntry (service col) | C/R/U/D | ✅ | ✅ (R2) | — |
| Denemeler (ODK) | ✅ | ✅ | OdkExam + Section + File + Answer | C/R/U/D + PDF/JSON upload | ✅ | 🟡 | — |
| ODK siparişler | ✅ | ✅ | OdkOrder | R/U + manuel create | ✅ | ✅ (R1) | — |
| ODK ödemeler | ✅ | ✅ | OdkPayment | R/U + refund | ✅ | ✅ (R2) | — |
| ODK erişim tagları | ✅ | ✅ | OdkAccessTag + Bulk | C/R/U/D + bulk CSV | ✅ | ✅ (R2) | — |
| Cheat/proctor logları | ✅ | n/a | OdkExamAttemptEvent | r/o list | n/a | n/a | 🟢 |
| Kazanım analizi | ✅ | ✅ | aggregate query | r/o | n/a | n/a | — |
| Audit logs | ✅ | n/a | AuditLog | r/o + filter | n/a | n/a | — |
| Background jobs | ❌ UI yok | cron yapısı var | n/a | — | — | — | 🟡 |
| Bildirimler | 🟡 | ✅ | Notification + InboxMessage | partial | ⚠ | n/a | 🟠 |
| Ayarlar | ✅ | ✅ | Settings (env-driven) | partial | ✅ | 🟡 | 🟢 |
| Yetkiler (RBAC) | 🟡 | 🟡 | RolePermission + Override | C/R, U/D zayıf | ⚠ | 🟡 | 🟡 |
| Maaşlar / Payroll | ✅ | ✅ | TeacherPayroll | C/R/U/D + pay action | ✅ | ✅ | — |
| İstatistikler | ✅ | cached | aggregate | r/o | n/a | n/a | — |
| Raporlar | 🟡 | 🟡 | aggregate | r/o, export eksik | n/a | n/a | 🟡 |
| Hesap silme talepleri | ✅ | ✅ | AccountDeletionRequest | R/U + approve/reject/processNow | ✅ | ✅ | — |
| İndirim kodları | ✅ | ✅ | Coupon + Redemption | C/R/U/D | ✅ | 🟡 | — |
| Devamsızlık | ✅ | ✅ | Attendance | R + filter | ✅ | n/a | — |
| İnbox (admin) | 🟡 | 🟡 | InboxMessage | partial | ⚠ | n/a | 🟠 |

### D.2 Öğrenci Panel

| Sayfa | UI | Veri gerçek mi? | Paywall doğru mu? | Mobil | UX |
|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sınıfım | ✅ | ✅ | ✅ | ✅ | ✅ |
| Derslerim | ✅ | ✅ (Lesson list) | ✅ | ✅ | 🟡 (canlı ders linki manuel) |
| Canlı dersler | 🟡 | 🟡 (Meet link) | ✅ | ✅ | ⚠ |
| Ders detayları | 🟡 | 🟡 | ✅ | ✅ | 🟡 |
| Ödevler | ✅ | ✅ | ✅ | ✅ | ✅ |
| Performansım | ✅ | ✅ (metric snapshot + risk) | ✅ | ✅ | ✅ |
| Öğretmenlerim | ✅ | ✅ | ✅ | ✅ | 🟡 (sadece liste, mesajlaşma yok) |
| Bildirimler | ✅ | ✅ (Notification) | n/a | ✅ | 🟡 (inbox/notif çift sistem) |
| Profil | ✅ | ✅ | n/a | ✅ | ✅ (KVKK kartı bağlı) |
| Paketim | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ODK Dashboard** | ✅ | ✅ | ✅ (`requireOdkAccess`) | ✅ | ✅ |
| ODK Aktif denemeler | ✅ | ✅ | ✅ | ✅ | ✅ |
| ODK Sınav salonu | ✅ | ✅ | ✅ | ✅ (1024px breakpoint) | 🟡 (reconnect UX opak) |
| ODK Sonuç | ✅ | ✅ (scoring test geçiyor) | ✅ | ✅ | ✅ |
| ODK Analiz | ✅ | ✅ (kazanım + section) | ✅ | ✅ | 🟡 |
| ODK Dereceler | ❌ | — | — | — | 🟠 (planlı, yok) |
| ODK Yardım/SSS | 🟡 (public SSS'e link) | n/a | n/a | ✅ | 🟡 |
| ODK Geri bildirim | ❌ | — | — | — | 🟢 |

### D.3 Öğretmen Panel

| Sayfa | UI | Veri | API | UX | Öncelik |
|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | — |
| Bugünkü dersler | ✅ | ✅ | ✅ | 🟡 (Meet linki manuel ekleme) | 🟠 |
| Canlı dersler | 🟡 | 🟡 | n/a | ⚠ | 🔴 |
| Yoklama | ✅ (R4 quick-attendance) | ✅ | ✅ | ✅ (pill UI + preset bar + risk badge) | — |
| Sınıflarım | ✅ | ✅ | ✅ | ✅ | — |
| Öğrencilerim | ✅ (R4 risk badge sütun) | ✅ | ✅ | ✅ | — |
| Öğrenci notları | ✅ | ✅ | ✅ | 🟡 (TeacherComment + StudentNote ayrımı kullanıcı için belirsiz) | 🟡 |
| Ödevler | ✅ (R4 auto-advance) | ✅ | ✅ | ✅ | — |
| Deneme analizleri (ODK) | ✅ | ✅ (scope helper) | ✅ | 🟡 | 🟡 |
| Riskli öğrenciler | ✅ (badge + sıralama) | ✅ (cached 5dk) | ✅ | ✅ | — |
| Bildirimler | ✅ | ✅ | ✅ | 🟡 | 🟠 |
| Profil | ✅ | ✅ | ✅ | ✅ | — |
| Veliye mesaj/bildirim gönder | 🟡 | 🟡 | sadece tek yönlü push | ⚠ | 🟠 |
| Kazanclarım | ✅ | ✅ (Payroll) | ✅ | 🟡 (geçmiş tablosu sade) | 🟢 |
| Sınıf duyurusu | ❌ | — | — | — | 🟡 |

### D.4 Veli Panel

| Sayfa | UI | Veri | UX | Öncelik |
|---|---|---|---|---|
| Dashboard (R5 rebuild) | ✅ | ✅ (parent-summary + alert) | ✅ | — |
| Çocuklarım listesi | ✅ | ✅ | ✅ | — |
| Çocuk detay | 🟡 | 🟡 | ⚠ (timeline sığ; OD ile ODK iç içe değil) | 🟠 |
| Canlı ders takibi | ❌ | — | — | 🟠 |
| Devamsızlık | ✅ | ✅ | ✅ | — |
| Ödev durumu | ✅ | ✅ | ✅ | — |
| Deneme sonuçları | ✅ | ✅ (ODK + manuel ExamResult) | 🟡 | 🟡 |
| Kazanım analizi | ✅ | ✅ | 🟡 (terminoloji veli için ağır) | 🟡 |
| Öğretmen notları | 🟡 | 🟡 | ⚠ | 🟠 |
| Bildirimler | ✅ | ✅ | 🟡 (critical alert var, channel/preference kısıtı yok) | 🟠 |
| Ödeme durumu | ✅ (faturalar + ödemeler) | 🟡 (OD ödeme otomasyon eksik → yansıma sığ) | 🟡 | 🟠 |
| Öğretmenle iletişim | ❌ | — | — | 🟠 |
| Profil + KVKK | ✅ | ✅ | ✅ | — |

---

## E. Web Sitesi Analizi

Public site **`/`** ve alt sayfalar (`/online-dershane`, `/deneme-kulubu`,
`/paketler`, `/odk-paketleri`, `/tyt`, `/ayt`, `/lgs`, `/yks`, `/blog`, `/sss`,
`/hocalar`, `/basari-hikayeleri`, `/kamplar`, `/iletisim`, `/giris`, `/kayit`,
`/online-ozel-ders`, `/misyonumuz`, `/kariyer`, legal: `/gizlilik`, `/kvkk`, `/iade`).

| Sayfa | Durum | UX | SEO meta | Mobil | Notlar |
|---|---|---|---|---|---|
| `/` ana sayfa | ✅ güçlü (14 section) | ✅ premium | ✅ FAQ JSON-LD + Org + WebSite | ✅ | "Küçük grup canlı ders" claim öne çıkıyor — backbone (grup dersi) henüz şemada blokeli (C-3) |
| `/online-dershane` | ✅ | ✅ | ✅ | ✅ | OD ana satış sayfası, hero güçlü |
| `/deneme-kulubu` ve `/odk-paketleri` | ✅ | ✅ | ✅ + OG generator | ✅ | ODK landing; FAQ accordion (Faz 8) tamam |
| `/paketler` | 🟡 | 🟡 | ✅ | ✅ | OD/ODK ayrımı içerikte var ama CTA tek tip; OD paket "satın al" → lead/manuel akış (C-1) |
| `/blog` + `/blog/[slug]` | ✅ | ✅ | ✅ (article JSON-LD + dynamic OG) | ✅ | TOC, related, kategori henüz yok (Round 10 leftover) |
| `/sss` | ✅ | 🟡 (uzun, kategorize değil) | ✅ | ✅ | Veli odaklı SSS bloğu az |
| `/hocalar` | ✅ | ✅ | ✅ | ✅ | — |
| `/basari-hikayeleri` | ✅ | ✅ | ✅ | ✅ | Real testimonial verisi DB-driven (`success-stories.ts`) |
| `/kamplar` | ✅ | 🟡 (CTA zayıf) | ✅ | ✅ | Kamp paketleri satın alma akışı yok |
| `/iletisim` + lead | ✅ | ✅ | ✅ | ✅ | LeadSubmission DB'ye düşüyor |
| `/giris` + `/kayit` + `/sifremi-unuttum` | ✅ | ✅ | ✅ | ✅ | Brute-force korumalı, magic link tipi yok |
| Legal (KVKK/gizlilik/iade) | ✅ | ✅ | ✅ | ✅ | — |
| `/tyt /ayt /lgs /yks` | ✅ | 🟡 | ✅ + OG | ✅ | İçerikleri statik, ODK paketleriyle çapraz CTA zayıf |

**Bulgular:**

| # | Bulgu | Önem | Çözüm Yönü | Efor |
|---|---|---|---|---|
| E1 | OD ve ODK marka ayrımı navbar'da net, ama paketler sayfasında tek tip kart → kullanıcı "hangisi neye dahil" karışıyor | 🟠 | Paket kartlarına ürün rozeti + iki sütun (OD / ODK) tabular karşılaştırma | S |
| E2 | "Küçük grup canlı ders" satılıyor ama backend `Lesson.studentId NOT NULL` (D-3, C-3) | 🔴 | Schema fix + UI'da grup ders rozeti | M |
| E3 | OD paket satın alma CTA'sı PayTR'ye gitmiyor — lead/iletişim form'una düşüyor | 🔴 | OD-PayTR entegrasyonu (ODK altyapısı kopyalanabilir) | L |
| E4 | SSS kategorize değil (öğrenci/veli/ödeme/teknik) | 🟡 | Kategori filter + jump links | S |
| E5 | Blog TOC + related + breadcrumb JSON-LD eksik | 🟡 | Round 10 leftover'ı bitir | S |
| E6 | TYT/AYT/LGS/YKS sayfalarından ODK paketlerine çapraz CTA eksik | 🟡 | Sticky "Bu sınava özel deneme paketleri" CTA | XS |
| E7 | "Online özel ders" sayfası tek başına; OD paketleriyle ilişkisi belirsiz | 🟡 | Pricing strip + booking lead form | S |
| E8 | Mobile bottom nav / sticky CTA yok | 🟡 | Mobile sticky "Hemen Başla" CTA | XS |

Genel yargı: **Site profesyonel hissediyor.** Marka tonu (`brand-voice.md`)
takip ediliyor. Asıl problem **OD satın alma akışının site'den panele kadar
kesintisiz olmaması**.

---

## F. Admin Panel Analizi (Detay)

D.1 matrisindeki bulgulara ek olarak:

| # | Bulgu | Yer | Önem | Çözüm | Efor |
|---|---|---|---|---|---|
| F1 | "Dersler" sayfası Course'a değil Lesson'a referans veriyor → admin Course tanımı yapamıyor | `app/panel/admin/dersler/` | 🟠 | Course CRUD UI + module/content nested editor | M |
| F2 | "Ders programı" sayfası sadece read-only listeleme + tek tek Lesson edit; **toplu/tekrarlı planlama yok** | `app/panel/admin/ders-programi/` | 🟠 | Wizard: tek/haftalık tekrar/aylık seri | M |
| F3 | Canlı ders için "Room create" hiç yok — admin Meet linkini manuel kopyalıyor | tüm Lesson formları | 🔴 | Google Workspace API entegrasyonu / 3rd party meeting provider | L |
| F4 | OD ödeme yönetimi UI'ı zayıf — OdOrder/OdPayment modelleri var, admin sayfaları "lead/purchase intent" odaklı | `app/panel/admin/odemeler/`, `od-siparisler/` | 🟠 | OD için ODK-paralel yönetim ekranı | M |
| F5 | "Background jobs" görünürlüğü yok — Vercel logs dışında admin job durumunu göremiyor | yok | 🟡 | `/panel/admin/jobs` (son N run + last error) | S–M |
| F6 | Bildirim merkezi yok — admin "bu öğrenci grubuna toplu duyuru gönder"i tek noktadan yapamıyor | yok | 🟠 | Admin compose modal + InboxMessage fan-out | M |
| F7 | Raporlar export (CSV/Excel) yok | `raporlar/page.tsx` | 🟡 | `/api/export?type=...` + CSV streaming | S |
| F8 | Yetkiler (RBAC) UI'ı kısıtlı — RolePermission/UserPermissionOverride var, atama UI'ı zayıf | `app/panel/admin/yetkiler/` | 🟡 | Per-role matrix UI | M |
| F9 | "View-as" / impersonation feature yok — admin öğrenci/öğretmen olarak göremiyor | yok | 🟡 | Impersonation + audit `VIEW_AS_START/END` | M |
| F10 | Audit log filter "actorId/action/refType" tek tek; combo filter ve range search zayıf | `app/panel/admin/audit/` | 🟢 | Filter chip UI | XS |

---

## G. Öğrenci Panel Analizi (Detay)

| # | Bulgu | Yer | Önem | Çözüm | Efor |
|---|---|---|---|---|---|
| G1 | Sınav salonu "internet koptu — kaldığın yerden devam et" akışı görünmüyor (mevcut idempotent save var ama UX'i opak) | `exam-solver.tsx` | 🟠 | "Bağlantı yeniden kuruldu" banner + son save timestamp göster | S |
| G2 | Soru-kazanım eşleşmesi sonuç ekranında öğrenciye eksik gösteriliyor (admin tarafında JSON yüklü ama öğrenci için heatmap zayıf) | sonuç sayfası | 🟡 | Kazanım heatmap + benchmark | S |
| G3 | Dereceler/leaderboard UI yok (planlı) | yok | 🟡 | Public ya da kohort-içi leaderboard | M |
| G4 | Öğretmenle iletişim yok (sadece notification fan-out) | `ogretmenlerim/` | 🟠 | InboxMessage thread | M |
| G5 | Canlı ders kart UI'da "katıl" butonu sadece link; ders öncesi/sırası state'i (waiting/live/ended) yok | `derslerim/` | 🟠 | Lesson lifecycle state + countdown | S |
| G6 | "Boş soru bırakma uyarısı submit'te var mı?" — kontrol gerekli | `exam-solver.tsx` | 🟡 | Pre-submit summary modal (cevaplanan/boş) | XS |
| G7 | Mobile sınav UI optical form alt-üst düzeni (Faz 8) iyi, ama PDF zoom kontrolü yok | solver | 🟡 | Pinch-to-zoom test + zoom kontrolleri | S |
| G8 | "Yardım" sayfası sadece public SSS'e link veriyor | yok | 🟢 | In-panel help kit | XS |

---

## H. Öğretmen Panel Analizi (Detay)

R4 round'unda yoklama + auto-advance + risk badge ile **günlük iş yapılabilir** seviyeye geldi. Eksikler:

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| H1 | Canlı ders başlatma / Meet provisioning yok | 🔴 | F3 ile aynı | L |
| H2 | Veliye 2 yönlü mesajlaşma yok | 🟠 | InboxMessage thread | M |
| H3 | Sınıfa toplu ödev/duyuru gönderme yok (R4 kapsam dışı bırakıldı) | 🟠 | Bulk assignment modal | M |
| H4 | Kazanım bazlı sınıf raporu yok (öğretmen "sınıfım hangi konuda zayıf"ı tek bakışta göremiyor) | 🟠 | Class kazanım heatmap | M |
| H5 | Öğretmen kendi puanlamasının tutarlılığını göremiyor (avg/median/grading curve) | 🟡 | Grade analytics widget | S |
| H6 | TeacherComment vs StudentNote ayrımı UI'da belirsiz | 🟡 | Tek "notlar" sekmesi + tag | S |
| H7 | Kazanclarım (Payroll) sayfası sığ — period, breakdown, pending payments tablosu zayıf | 🟢 | Aylık breakdown + status | S |

---

## I. Veli Panel Analizi (Detay)

R5 rebuild'i dashboard'u temele oturttu (critical alert + per-child card + cron weekly digest). Halen:

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| I1 | Çocuk detay (`cocuklarim/[id]`) timeline'ı dashboard kadar zengin değil | 🟠 | Per-child rebuild (devam/ödev/ODK/last 5 events timeline) | M |
| I2 | Veli ↔ Öğretmen mesajlaşma yok | 🟠 | InboxMessage thread + permission | M |
| I3 | Veli bildirim tercihleri (weeklyDigest kapatma, critical-only) yok | 🟡 | NotificationPreference UI'da bind | XS |
| I4 | OD ödeme durumu sığ (C-1'den dolayı muhasebede yansıması zayıf) | 🟠 | OD ödeme entegrasyonu bittikten sonra zaten düzelir | — |
| I5 | "Canlı ders takibi" yok — çocuğum şu an derste mi/geç kaldı mı görünmüyor | 🟠 | Lesson lifecycle backend'i şart (F3) | — (F3 sonrası) |
| I6 | KVKK/veri silme akışı bağlı (R-D+) | ✅ | — | — |
| I7 | Many-to-many veli↔öğrenci destekli ama "primary parent" UX'i yok (bildirim/iletişim öncelik) | 🟢 | `isPrimary` flag UI | XS |

---

## J. Deneme Oluşturma Akışı Analizi

`exam-wizard.tsx` (yeni deneme) + `exam-detail-editor.tsx` (detay/edit) çok olgun.

**Akış:**
1. Genel bilgi → 2. Bölümler (preset TYT/AYT/LGS/KPSS/ALES) → 3. Süre/booklet/access mode → 4. POST `/api/v1/odk/admin/exams` → 5. Detay sayfasında PDF upload + JSON cevap anahtarı + JSON kazanım + access tag bağlama → 6. Publish (DRAFT/SCHEDULED/PUBLISHED).

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| J1 | PDF preview yok — admin yüklediği PDF'i kontrol edemiyor (sadece dosya adı görünüyor) | 🟠 | Inline iframe preview (CSP frame-src whitelist'te zaten) | XS |
| J2 | JSON cevap anahtarı hatalı format → hata mesajı ham (Zod schema string) | 🟡 | Satır/soru bazlı validation error UI | S |
| J3 | "Soru sayısı totali bölümler toplamına eşit mi?" check var ama submit blocking değil | 🟡 | Hard validation | XS |
| J4 | Booklet desteği şemada var (`OdkExamFile` birden çok kitapçık) ama UI tek upload alanı | 🟡 | Multi-booklet UI (A/B/C/D) | S |
| J5 | Scheduled publish (saatli yayın) flag var, cron tetikleyici manuel kontrol gerekiyor | 🟡 | Cron veya event-driven publish check | S |
| J6 | "Önce Erişim Tagları sayfasından bir tag oluşturun" linki R2'de düzeltildi (`/erisim/yeni`) | ✅ | — | — |
| J7 | Question-kazanım eşleştirme UI'sı JSON-only — non-tech admin için zor | 🟡 | Drag-drop / inline grid editor | M |
| J8 | Series desteği (`OdkExamSeries`) şemada var, UI yok | 🟢 | Series CRUD | S |
| J9 | Cheat policy (warnOnViolation/autoSubmit) per-exam config UI'da minimal | 🟢 | Cheat policy preset selector | XS |
| J10 | "Yayınlamadan önce kontrol et" preview moder (admin olarak deneme aç) yok | 🟡 | Admin "Preview as student" link | S |

---

## K. Deneme Çözme Akışı Analizi

`exam-solver.tsx` + `use-cheat-tracker.ts` + sonuç sayfası.

**Akış:** dashboard → aktif denemeler → start → solver (PDF iframe + optical form + timer + cheat tracker + autosave 1.5s debounce) → submit → sonuç (scoring.ts ÖSYM standardı, test edilmiş) → analiz (kazanım).

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| K1 | Reconnect UX opak (G1) | 🟠 | Banner + last save timestamp | S |
| K2 | Pre-submit "boş soru var" özet modali yok/zayıf | 🟡 | Confirm modal | XS |
| K3 | Süre bitince auto-submit var mı? — `examSettings.autoSubmitOnFullscreenExit` var, time-up auto-submit kontrol gerekli | 🟡 | Time-up branch verify | XS |
| K4 | Fullscreen zorunluluğu PWA / mobile Safari'de güvenilmez | 🟡 | Graceful degradation banner | XS |
| K5 | Cheat event'ler kaydediliyor (OdkExamAttemptEvent) ama öğrenciye "X uyarı kaldı" sayacı yok (var ama UI sade) | 🟢 | Sticky warning counter | XS |
| K6 | Sonuç sayfası net + bölümsel net iyi; ama "benchmark/percentile" yok | 🟡 | Kohort benchmark | M |
| K7 | Kazanım analizi bireysel; "bu kazanımı çözebilenler %X" gibi sosyal kıyas yok | 🟢 | Kohort kazanım benchmark | M |
| K8 | PDF zoom kontrolü yok (G7) | 🟡 | Zoom buttons | XS |
| K9 | Çözüm sonrası "soru bazlı çözüm (video/metin)" yok | 🟠 | Per-question explanation field | L |

---

## L. Canlı Ders Akışı Analizi

**Acı gerçek:** OD ürününün satış vaadi ("küçük grup canlı ders") **kodda
sadece `Lesson.googleMeetLink` string alanı** olarak yaşıyor.

| Soru | Yanıt |
|---|---|
| Admin ders planlayabiliyor mu? | Evet (Lesson create), grup için DB seviyesinde blokeli (C-3) |
| Öğretmen dersi başlatabiliyor mu? | Sadece manuel olarak Meet'i açıyor |
| Öğrenci derse katılabiliyor mu? | Evet, Meet linki click |
| Veli durumu görebiliyor mu? | Hayır (lifecycle state yok) |
| Yoklama otomatik işleniyor mu? | Hayır — öğretmen manuel girer (R4'te quick-attendance ile hızlandı) |
| Manuel override var mı? | Evet |
| Geç katılım hesabı | Hayır |
| Ders iptal/değişiklik bildirimi | Cron `lesson-reminders` var; iptal bildirimi server action içinde tetikleniyor |
| Canlı ders linki güvenli mi? | Statik — link bilen herkes katılır (Google Meet'in kendi auth'una bağımlı) |

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| L1 | Otomatik Meet provisioning yok | 🔴 | Google Workspace API veya 3rd party (Daily.co/Zoom) | L |
| L2 | Lesson lifecycle (SCHEDULED → LIVE → ENDED) state yok | 🔴 | `Lesson.status` enum + transition events | M |
| L3 | Grup dersi DB'de blokeli | 🔴 | C-3 schema fix | M |
| L4 | Otomatik yoklama (Meet attendance API) yok | 🟠 | Meet API poll + Attendance auto | M |
| L5 | Ders kayıt arşivi yok | 🟡 | Meet kayıt linki alanı + storage | S |
| L6 | Link guard yok (random öğrenci linke ulaşırsa katılabilir) | 🟡 | Per-user signed join URL | M |

---

## M. Ödeme / Paket / Entitlement Analizi

### M.1 ODK (tamam ✓)

- PayTR iframe ✅, idempotent checkout ✅, callback hash verify ✅,
  AccountingEntry (service=ODK) ✅, AccessTag grant ✅, AuditLog ✅.
- Eksikler: **refund/chargeback UI tarafı manuel** (admin OdkPayment status değiştiriyor;
  entitlement otomatik revoke ediliyor — R2 audit'li). Taksit `0`. Email confirmation eksik.

### M.2 OD (yarım ⚠)

- `OdOrder` + `OdPayment` modelleri var.
- `PurchaseIntent` + `PurchaseEvent` "klasik lead → manuel ödeme" akışı için.
- Webhook (`app/api/purchases/webhook`) zaten audit'li ama **AccountingEntry yazımı kaldırılmış** (yorum: "paneller sökülürken kaldırıldı").
- OD-PayTR entegrasyonu **yok** — ODK altyapısı (`lib/odk/{paytr,checkout}.ts`) birebir kopyalanabilir hale gelmiş durumda.

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| M1 | OD-PayTR iframe entegrasyonu yok | 🔴 | `lib/od/paytr.ts` + checkout + callback (ODK ikizini taşı) | L |
| M2 | Webhook'ta OD AccountingEntry tekrar yazılmıyor | 🟠 | Yorumdaki kod restore + service=OD set | S |
| M3 | Refund flow UI eksik | 🟡 | Refund action + auto-revoke + accounting reversal | S |
| M4 | Duplicate payment idempotency — ODK'da 30dk PENDING penceresi var; OD'de kontrol belirsiz | 🟠 | Aynı pattern OD'ye | S |
| M5 | Failed payment retry UI yok | 🟢 | Lead-style follow up | S |
| M6 | Paket süresi bitince entitlement otomatik kapanıyor mu? — ODK için `expiresAt` cron kontrol gerekiyor | 🟡 | Daily cron check | S |
| M7 | Coupon redemption iki tarafta da çalışıyor ama OD checkout zaten yarım olduğu için coupon kullanımı OD'de yok | 🟡 | M1 sonrası birleşir | — |
| M8 | KDV / fatura akışı yok (mevcut Invoice modeli kullanılmıyor) | 🟡 | E-arşiv fatura entegrasyonu | L |
| M9 | Refund AccountingEntry ters kaydı (negatif) ODK'da var, OD'de M2 sonrası lazım | 🟡 | Pattern paralel | XS |

---

## N. Bildirim Sistemi Analizi

**Mimari:** `lib/notifications.ts notifyUser()` = Notification insert + Pusher event + Expo push (R1 birleşik).
Cron'lar: lesson-reminders (5dk), assignment-reminders (günlük), parent-weekly-digest (haftalık), notification-digest (günlük), email-retry (15dk).

| Event | Notif yazılıyor mu? | Push gidiyor mu? | Email outbox | Notlar |
|---|---|---|---|---|
| Lesson reminder | ✅ | ✅ | ✅ | Cron 5dk |
| Lesson Meet link added | ✅ | ✅ | ✅ | `sendMeetLinkUpdated` |
| Lesson canceled | ✅ | ✅ | 🟡 | Audit'li |
| Assignment created | ✅ | ✅ | ✅ | |
| Assignment due reminder | ✅ | ✅ | ✅ | |
| Assignment graded | ✅ | ✅ | 🟡 | |
| Exam result published (ODK) | ✅ | ✅ | 🟡 | |
| Payment success | ✅ (ODK), 🟡 (OD) | ✅ (ODK) | 🟡 | OD eksik (C-1) |
| Payment failed/refunded | ✅ (ODK), 🟡 (OD) | ✅ (ODK) | ❌ | Email confirmation yok |
| Parent weekly digest | n/a | ✅ critical alert | ✅ digest email | R5 |
| Critical attendance/overdue | ✅ | ✅ | 🟡 | |
| Teacher → student/parent custom | ❌ | ❌ | ❌ | UI yok |
| Admin → user/group broadcast | ❌ | ❌ | ❌ | UI yok (F6) |

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| N1 | Notification + InboxMessage çift sistem; deprecation timeline yok | 🟠 | Migration plan (master plan §9'da açık soru) | M |
| N2 | Duplicate önleme `expireRelatedNotifications` var ama event-by-event manuel; dedup helper yok | 🟡 | Event ID + idempotency key | S |
| N3 | Veli/öğretmen iki yönlü mesajlaşma yok | 🟠 | InboxMessage thread | M |
| N4 | Bildirim tercihleri (NotificationPreference) UI tam değil — channel/kategori bazlı kapatma sığ | 🟡 | Per-category preferences UI | S |
| N5 | Email outbox retry çalışıyor (R7) ama "ulaşamadık" admin UI yok | 🟡 | Outbox dashboard | S |
| N6 | Realtime SSE/Pusher kullanılıyor (var) ama tüm panellerde topbar bell unread count gerçek-zaman güncellenmiyor (polling) | 🟢 | Pusher subscribe çoğul | S |
| N7 | Push notification token cleanup var; opt-out kullanıcı UI yok | 🟢 | Mobile preferences | S |

---

## O. Analytics / Raporlama Analizi

| Modül | Veri kaynağı | Cache | Export | Durum |
|---|---|---|---|---|
| OD admin dashboard | aggregate (gerçek) | 30s | ❌ | ✅ |
| ODK admin dashboard | aggregate (gerçek) | 60s | ❌ | ✅ |
| Risk engine | computed (devam + ödev gecikme) | 5dk | ❌ | ✅ (teacher view R4) |
| Student performance | metric snapshot + result | run-time | ❌ | ✅ |
| Kazanım analizi (öğrenci) | OdkExamOfficialAnswer + Attempt | run-time | ❌ | ✅ |
| Kazanım analizi (admin) | aggregate | run-time | ❌ | ✅ |
| QuestionAnalysis (per soru bazlı zorluk) | yok | — | — | ❌ planlı |
| Teacher analytics (kendi öğr.) | scope helper + risk | 5dk | ❌ | ✅ |
| Parent insights | parent-summary | run-time | ❌ | ✅ R5 |
| Audit logs | AuditLog | — | ❌ | ✅ |
| Jobs dashboard | yok | — | — | ❌ F5 |
| Leaderboard (kohort/scope) | yok | — | — | ❌ G3 |
| Conversion funnel (admin satış) | yok | — | — | ❌ (admin-panel-tasks.md backlog) |
| Cohort retention | yok | — | — | ❌ |
| StudentRiskSnapshot materialized | yok | — | — | ❌ planlı (R3 leftover) |

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| O1 | CSV/Excel export hiçbir sayfada yok | 🟡 | `/api/export?type=...` streaming | S |
| O2 | QuestionAnalysis (per soru zorluk + ayırıcılık) eksik | 🟡 | `OdkQuestionStat` aggregate model + cron | M |
| O3 | Leaderboard yok | 🟡 | Per-exam + per-kohort | M |
| O4 | Risk snapshot tablosu materialize değil — her sorguda compute | 🟡 | R7 cron + Prisma model | M |
| O5 | Admin conversion funnel yok | 🟡 | Lead → purchase event aggregate | S |
| O6 | Cohort retention yok | 🟢 | Period grouping | M |

---

## P. Security / Permission Analizi

| Alan | Durum | Notlar |
|---|---|---|
| Admin guard | ✅ | Middleware (R-A.1) `/api/v1/admin/*` 403 + handler `requireAdminApi` |
| Teacher guard | ✅ | scope helper kendi sınıf/öğrenci |
| Parent guard | ✅ | ParentStudent foreign key kontrol |
| Student ownership | ✅ | session.user.id ile filter |
| Product entitlement | ✅ | `requireOdAccess` / `requireOdkAccess` (`lib/access/odk.ts`) |
| Package access | ✅ | StudentPackage + OdkEntitlement |
| Exam access | ✅ | OdkExamAccessTag + user tag |
| Payment ownership | ✅ | order.userId match |
| Cron secret | ✅ | Bearer + Vercel UA fallback |
| PayTR hash | ✅ | timingSafeEqual |
| Rate limiting | 🟡 | DB-backed, sliding window; login email-only |
| Audit logging | ✅ | R1–R8 fan-out |
| IP brute force | ❌ | Round 8 backlog |
| CSRF | 🟡 | Next.js 15 server actions origin check; dış POST'larda token yok |
| CSP | ✅ | next.config.ts (PayTR/Meet/PDF whitelist) |
| HSTS / COOP / Permissions | ✅ | R-B |
| PII masking (log) | ✅ | logger LOG_PII_MASK=1 default |
| KVKK data export | ✅ | `/api/v1/me/data-export` 5/gün |
| KVKK account delete | ✅ | R-D+ full flow |

| # | Olası leak | Önem | Çözüm | Efor |
|---|---|---|---|---|
| P1 | Öğrenci başka öğrencinin sınav/sonuç verisini görebilir mi? | Düşük risk — attempt.userId match var, ama bazı attempt event route'larında verify ikinci defa yapılmalı | 🟡 | Code audit | S |
| P2 | Veli başka çocuğu (kendisine bağlı olmayan) görebilir mi? | Düşük risk — ParentStudent join şart, ama some `student/[id]` route'larında parent guard tek tek elden geçmeli | 🟡 | Audit + test | S |
| P3 | Öğretmen kendi olmayan sınıfı görebilir mi? | Düşük — scope helper; ama "tüm öğretmenler" listesi global olabilir | 🟡 | Code audit | XS |
| P4 | OD/ODK karşı taraf bypass — `requireOdkAccess` admin bypass var (kasıtlı) | 🟢 | Admin audit zaten yazıyor | — |
| P5 | IP rate limit | 🟠 | Custom `/api/auth/login` route + IP middleware | M |
| P6 | CSP strict (nonce-based) değil; inline-allow var | 🟢 | Nonce-based CSP | M |
| P7 | Mobile JWT refresh rotation (sahip değiştirme) | 🟢 | Refresh token model + rotate-on-use | M |
| P8 | RBAC override audit eksik (yetkiler değişirken) | 🟡 | RolePermission CRUD'a audit | XS |

---

## Q. Performance Analizi

| Sayfa / Path | Risk | Notlar |
|---|---|---|
| `/panel/admin` dashboard | Düşük | 30s cache |
| `/panel/admin/odk` dashboard | Düşük | 60s cache |
| `/panel/admin/audit` | Orta | Pagination var ama page size 50 sabit |
| `/panel/admin/ogrenciler` | Yüksek | hardcoded `take: 200/500` — pagination wire yok |
| `/panel/admin/dersler` | Yüksek | son 100 sınırlı, filtre yok |
| `/panel/admin/ders-programi` | Yüksek | aynı |
| `/panel/admin/odk/denemeler` | Orta | büyüyünce sıkıntı |
| `/panel/admin/odk/cozumler/[attemptId]` | Düşük | tekil |
| Sınav salonu | Orta | PDF iframe — büyük PDF'lerde 1. yüklenme yavaş; canvas alternatifi planlı |
| Autosave | Düşük | 1.5s debounce |
| Notification polling | Orta | bell counter polling — Pusher subscribe fan-out eksik (N6) |
| Analytics query | Düşük | cached |
| QuestionAnalysis | Yüksek (gelecekte) | henüz yok |
| Jobs dashboard | n/a | yok (F5) |
| Payment logs | Düşük | tekil tablo, hızlı |

| # | Bulgu | Önem | Çözüm | Efor |
|---|---|---|---|---|
| Q1 | 20+ liste sayfasında hardcoded take | 🟠 | Pagination helper wire | M |
| Q2 | N+1 audit yapılmamış (panel-student/teacher/parent.ts) | 🟠 | include/select audit | S–M |
| Q3 | Notification unread count `count where unread` her bell render'da | 🟡 | DenormCounter (planlı R7) | S |
| Q4 | İndex audit (özellikle composite: classroomId+date, studentId+date) | 🟡 | EXPLAIN ANALYZE + ekleme | S |
| Q5 | Cache invalidation pure TTL (C-12) | 🟡 | Targeted invalidate | S |
| Q6 | PDF render: iframe → pdfjs canvas geçiş | 🟢 | Faz 8 leftover | M |
| Q7 | Image optimization (Next/Image kullanımı tutarlı mı?) | 🟢 | Audit | XS |
| Q8 | DB connection pool (Neon pgbouncer ayarı) | 🟢 | Env doğrulama | XS |

---

## R. UX / UI Analizi

| # | Bulgu | Önem | Yer | Çözüm | Efor |
|---|---|---|---|---|---|
| R1 | Product switcher (OD/ODK) Round 1'de düzeldi, ama sidebar ürün-bağlamı bazı role'lerde tam tutarlı değil | 🟡 | `components/panel/shell/product-switcher` | `getSectionsForRole(role, flags, currentProduct)` tam aktif olduğunu doğrula | XS |
| R2 | Empty state'ler — pek çok liste sayfasında "henüz veri yok" basit metin | 🟡 | tüm liste sayfaları | Standart EmptyState component + CTA | S |
| R3 | Loading skeleton dashboard'larda yarım | 🟡 | panel sayfaları | Skeleton component | S |
| R4 | Toast sistem (R11) var ama formların çoğu hâlâ alert/inline error karışık | 🟡 | server action throw'lar | Toast bind yayma | S |
| R5 | Tablolar — filter chip standardı yok, sayfaya göre farklı | 🟡 | admin liste sayfaları | Ortak FilterBar component | S |
| R6 | Mobile responsiveness — admin liste tablolar 768px altında scroll-x; card-view yok | 🟡 | admin tüm tablolar | Mobile card mode | M |
| R7 | Sidebar+topbar mobile drawer açıkken topbar z-index çakışması (R1'de düzeltilmiş ama bazı modal'larla yeniden çakışıyor olabilir) | 🟢 | shell | z-index audit | XS |
| R8 | Modal/drawer davranışı — bazı sayfalar modal, bazı `/yeni` route — tutarsız | 🟡 | tüm CRUD | Standart "drawer for quick, page for complex" rule | S |
| R9 | Form UX — inline validation tutarsız, bazı sayfa client-only, bazı server-only | 🟡 | formlar | Zod + form lib standardı | S |
| R10 | Boş veri illüstrasyonları yok — sadece metin | 🟢 | empty states | Lightweight SVG | XS |
| R11 | Dark/light tema switcher topbar'da var, bazı section'larda kontrast düşük | 🟢 | globals.css | Token audit | S |
| R12 | Sınav salonu odaklı (focus-mode) tasarım iyi; topbar/sidebar gizleniyor — premium hissiyat ✅ | — | solver | — | — |
| R13 | Veli dashboard R5'ten sonra "Linear-vari" hissini koruyor; çocuk detay sayfası bu standardın altında (I1) | 🟠 | `cocuklarim/[id]` | Detail rebuild | M |
| R14 | Mobile bottom nav — admin/öğretmen/öğrenci panelinde yok; mobil drawer'a sıkıştırılmış | 🟡 | mobil shell | Bottom tab bar | S |
| R15 | "Hangi ürünün altındayım" rozeti bazı sayfalarda kayboluyor (özellikle iç içe route'larda) | 🟡 | breadcrumb / topbar | Persistent product badge | XS |

---

## S. Önceliklendirilmiş Aksiyon Listesi

### S.1 🔴 Critical (≤4 hafta)

1. **OD-PayTR entegrasyonu** — `lib/od/paytr.ts` + checkout + callback + AccountingEntry restore (C-1, M1, M2). **Efor: L**.
2. **Canlı ders backbone'u** — Lesson.status lifecycle (SCHEDULED/LIVE/ENDED) + Meet provisioning veya provider abstraction (L1, L2). **Efor: XL** (en azından lifecycle + lifecycle UI: M).
3. **`Lesson.studentId` nullable migration** — grup ders unlock (C-3). 13+ kod path'i etkiliyor (yoklama, mobile API, parent-summary, lesson-reminders cron). **Efor: M**.
4. **IP-bazlı brute force** — Custom `/api/auth/login` route + IP middleware (C-9, P5). **Efor: M**.

### S.2 🟠 High (1–2 ay)

5. **OD muhasebe webhook restore** (M2) — **S**.
6. **Course CRUD UI + ders programı planlama wizard'ı** (D-D, F1, F2) — **M**.
7. **Pagination wire (20+ sayfa)** (Q1) — **M**.
8. **Inbox unification + 2-yönlü mesajlaşma** (N1, N3, H2, I2, G4) — **M**.
9. **Veli child-detail rebuild** (I1, R13) — **M**.
10. **Admin background jobs UI** (F5) — **S–M**.
11. **Admin broadcast / class announcement** (F6, H3) — **M**.
12. **Pre-submit summary modal + reconnect banner** (G1, K1, K2) — **S**.
13. **Bildirim tercihleri UI** (N4, I3) — **S**.
14. **OD/ODK paket sayfası ürün ayrımı** (E1) — **S**.

### S.3 🟡 Medium (2–4 ay)

15. **Question-kazanım drag-drop editor** (J7) — **M**.
16. **Leaderboard + kohort benchmark** (O3, K6, K7) — **M**.
17. **QuestionAnalysis aggregate** (O2) — **M**.
18. **Risk snapshot materialize + cron** (O4) — **M**.
19. **CSV/Excel export** (O1) — **S**.
20. **Mobile table card-view** (R6) — **M**.
21. **Empty/loading/error state standartlaştırma** (R2, R3, R10) — **S**.
22. **NotificationPreference UI** (N4) — **S**.
23. **PDF zoom + canvas geçişi** (G7, K8, Q6) — **M**.
24. **Booklet/series UI** (J4, J8) — **S**.
25. **Refund + reverse accounting UX** (M3, M9) — **S**.
26. **Admin "View-as" + audit** (F9) — **M**.
27. **RBAC UI tamamlama** (F8) — **M**.
28. **Filter chip standardı** (R5) — **S**.
29. **Toast'ı tüm formlara bağla** (R4) — **S**.
30. **Audit log combo filter** (F10) — **XS**.

### S.4 🟢 Low (backlog)

31. **B2B / multi-tenant `institutionId`** — ilk müşteri talebiyle (C-13).
32. **Sentry SDK aktivasyonu** — DSN onayı bekliyor.
33. **Strict CSP (nonce)** — P6.
34. **Mobile JWT refresh rotation** — P7.
35. **E-arşiv fatura** — M8.
36. **Per-question explanation (video/text)** — K9.
37. **In-panel help kit** — G8.
38. **Cohort retention metrics** — O6.
39. **Class kazanım heatmap** — H4.
40. **Mobile bottom nav** — R14.

---

## T. Faz Planı (Önerilen)

### FAZ 1 — Para akışını kapat (3–4 hafta, 🔴)
- **S1** OD-PayTR + webhook restore + accounting (S.1.1, S.2.5).
- **S2** OD muhasebe + refund/reverse + duplicate idempotency (M3–M9).
- **S3** Paket sayfası ürün ayrımı + OD checkout CTA (E1).
- **S4** Sentry aktivasyon + Strict observability (S.4.32).

**Çıktı:** Müşteri OD paketini site → checkout → panel akışında otomatik alabilir,
muhasebe doğru kaydeder, admin refund'u UI'dan yapabilir.

### FAZ 2 — Canlı ders gerçekleşsin (4–6 hafta, 🔴)
- **L1** Lesson lifecycle state (SCHEDULED/LIVE/ENDED) + transition server actions.
- **L2** `Lesson.studentId` nullable + grup ders + kod path migration.
- **L3** Provider abstraction (Google Meet API → otomatik room create).
- **L4** Otomatik yoklama (Meet API poll) + manual override.
- **L5** Veli "şu an derste mi" widget (I5).

**Çıktı:** OD'nin satış vaadi backend ile uyumlu; öğretmen tek tıkla başlatıyor,
öğrenci/veli lifecycle görüyor, yoklama hibrit (oto + manuel).

### FAZ 3 — Eğitim platformu derinleşsin (3–4 hafta, 🟠)
- **C1** Course CRUD UI + ders programı wizard (F1, F2).
- **C2** Veli child-detail rebuild (I1).
- **C3** Sınıfa toplu ödev/duyuru (H3, F6).
- **C4** Inbox unification + 2-yönlü mesajlaşma (N1, N3, H2, I2, G4).

**Çıktı:** Veli ↔ Öğretmen ↔ Öğrenci üçgeni gerçek anlamda iletişim kuruyor;
ders programı non-tech admin tarafından yönetilebiliyor.

### FAZ 4 — Ölçek + güvenlik (2–3 hafta, 🟠)
- **D1** Pagination wire (Q1) + N+1 audit (Q2).
- **D2** IP-bazlı brute force (S.1.4).
- **D3** Admin jobs UI (F5) + outbox dashboard (N5).
- **D4** Risk snapshot materialize (O4) + DenormCounter (Q3).

**Çıktı:** Kullanıcı sayısı 10x'lendiğinde panel cevap vermeye devam ediyor;
güvenlik distributed credential stuffing'e dayanıklı; admin observability'i tam.

### FAZ 5 — Bilgi katmanı (3–4 hafta, 🟡)
- **E1** QuestionAnalysis + leaderboard + kohort benchmark (O2, O3, K6, K7).
- **E2** Class kazanım heatmap (H4) + öğretmen analytics derinleştirme.
- **E3** Sınav salonu UX polish (G1, K1, K2, J1, J7) + booklet/series UI (J4, J8).

**Çıktı:** ODK bir "ölçme-değerlendirme platformu" hissi; admin/öğretmen
data-driven karar verebiliyor; öğrenci "neredeyim, nereye gitmeliyim"i görüyor.

### FAZ 6 — Polish & QA (2 hafta, 🟡)
- **P1** Empty/loading/error state standardı (R2, R3).
- **P2** Toast yayma + form UX standartlaştırma (R4, R9).
- **P3** Mobile table card-view (R6) + bottom nav (R14).
- **P4** Filter chip standardı (R5) + modal/drawer kuralı (R8).
- **P5** E2E happy-path Playwright + broken link tarama (Round 12 leftover).
- **P6** Audit log combo filter + KVKK dashboard polish.

**Çıktı:** Premium SaaS hissini her sayfaya yayan tutarlı UI; CI'da E2E green.

### FAZ 7 — Opsiyonel (yalnızca tetik gelirse)
- B2B `institutionId` migration (ilk B2B müşteri).
- E-arşiv fatura (Türkiye vergi gerekliliği).
- Per-question explanation modülü (içerik ekibi hazır olunca).
- Cohort retention + funnel.

---

## U. Özet Tablo — "Şu an çalışan vs. eksik" tek bakış

| Alan | %Tamam | Bottleneck |
|---|---|---|
| Auth / RBAC / KVKK | 90% | IP rate-limit, RBAC UI |
| Veri modeli | 95% | Lesson grup desteği, AccountingEntry OD webhook |
| OD ödeme | 35% | PayTR entegrasyonu yok |
| ODK ödeme | 95% | Email confirm, taksit |
| Canlı ders | 20% | Lifecycle/provisioning yok |
| ODK deneme oluşturma | 85% | Booklet UI, kazanım editor |
| ODK deneme çözme | 90% | Reconnect UX, pre-submit modal |
| Analytics | 70% | Export, leaderboard, QuestionAnalysis |
| Bildirim | 75% | 2-yönlü mesaj, preference UI |
| Cache / perf | 60% | Pagination wire, N+1 audit |
| UX/UI polish | 75% | Empty/loading state, mobile table |
| SEO / public site | 90% | Blog TOC, OD/ODK paket ayrımı |
| Mobile app | 80% | Refresh token rotation, in-app messaging |
| Observability | 80% | Sentry inactive, jobs UI |
| Admin operasyon | 70% | Broadcast, View-as, Course UI |
| Veli deneyimi | 70% | Child detail, mesajlaşma |
| Öğretmen deneyimi | 80% | Mesajlaşma, broadcast, kazanım |

**Genel olgunluk: ~75–80%.** En kritik tek hamle: **OD-PayTR + canlı ders
lifecycle**. Bu iki blok kapandığında ürün "MVP+" değil "production-ready
SaaS" sınıfına geçer.

---

## V. Bilinçli olarak rapor dışı tutulanlar

- Tek tek dosya/satır seviyesinde audit (genellikle dokümantasyon dosyalarında zaten mevcut).
- Tasarım sistemi token-level audit (Tailwind config inceleme).
- 3rd party kütüphane güncel mi kontrolü (`package.json` audit ayrı bir görev).
- E2E test coverage hesabı (Playwright var, smoke route var; gerçek coverage matrisi ayrı bir görev).
- Mobile app deep-dive (mobile MASTER_PLAN.md zaten kapsamlı; orada her şey listelenmiş).

---

**Rapor sonu.** Bir sonraki adım için önerilen: **FAZ 1 — Para akışı kapatma**
(`OD-PayTR + webhook + accounting`) görevini açıp dosyaya `docs/sprint-5-changelog.md`
gibi bir sprint dosyası başlatmak.
