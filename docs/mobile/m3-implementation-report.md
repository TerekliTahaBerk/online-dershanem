# M3 uygulama raporu — Yön Koçluk native öğrenci deneyimi

Tarih: 2026-10-09 · Dal: `claude/loving-goodall-972n6c`.

**Taban:** M2 `main`'e birleşmedi (`origin/main` = `39fb658`, M2 yok). M3, aynı dalda M2'nin son commit'i `bfc7395` üzerine kuruldu; M2 değişikliklerinin hiçbiri ezilmedi veya atılmadı.

**Test politikası:** Kullanıcı talimatı ("Kesinlikle test yazma") gereği M3'te **yeni test yazılmadı**. Mevcut paketler (tsc, lint, Jest, unit, entegrasyon, E2E, export, sızıntı taraması) koşuldu. Ayrıntı: [m3-test-results.md](./m3-test-results.md).

## 1. Özet

Yön Koçluk (OK) çalışma alanındaki öğrenci menüsünün tamamı native ekrana veya açık web devam yoluna gidiyor:
- Bugün, Planım ve görev tamamlama.
- Çalışmalarım, Hedeflerim, Koçum (saat değişikliği talebi).
- Ortak check-in (OD + Yön) ve Haftalık.

Sunucuda iş kuralı kopyalanmadı. Dört Yön web sayfasının okuma mantığı ortak yükleyicilere çıkarıldı. Yeni JSON uçları web ile aynı yükleyiciyi çağırıyor. Yazmalar mevcut, değişmeyen uçlarla yapılıyor. M1'den kalan eski (legacy) mobil kod tamamen kaldırıldı.

## 2. Kilometre taşları

| Taş | Durum | Kısa sonuç |
| --- | --- | --- |
| M3.0 Taban | ✅ | Dal M2 üzerinde, ağaç temiz. Mobil tsc/lint temiz, Jest 141/141. Kök durumu M2 ile aynı |
| M3.1 Sözleşmeler + yükleyiciler | ✅ | `lib/mobile-contracts/yon.ts`; 4 ortak yükleyici; 4 yeni GET ucu (`yon`, `plan`, `coaching`, `check-in`) |
| M3.2 Yön Bugün | ✅ | Bugünün planı, Şimdi, gecikenler, Bu hafta, sıradaki görüşme, koç notu, hedef özeti, check-in |
| M3.3 Planım + tamamlama | ✅ | Gün seçici, plan durumu, ilerleme, koç özeti, değişiklik talebi, tercihler, `/yon/task/[id]` |
| M3.4 Hedeflerim | ✅ | `ok-goals` (legacy) yerine `yon-goals`; gruplu; "ölçülmedi" |
| M3.5 Koçum | ✅ | Koç, görüşmeler, saat değişikliği talebi (UUID idempotency), ortak notlar, koç görevleri, geçmiş |
| M3.6 Check-in | ✅ | OD + Yön tek ekran; yardım isteği ve geri bildirim |
| M3.7 Haftalık + entegrasyon | ✅ | Koç özeti ile ortak özet ayrı; M2 özet bileşeni yeniden kullanıldı; navigasyon |
| M3.8 Regresyon, temizlik, devir | ✅ | Legacy dosyalar silindi; tüm kontroller koşuldu; belgeler; [m4-handoff.md](./m4-handoff.md) |

## 3. Ortak yükleyiciye çıkarılan web sorguları (davranış korunarak)

| Web sayfası | Yükleyici | Ek tüketici |
| --- | --- | --- |
| `app/panel/ogrenci/yon` | `lib/kocum/yon-today-server.ts#loadYonToday` | `GET /api/panel/student/yon` |
| `app/panel/ogrenci/plan` | `lib/kocum/student-plan-server.ts#loadStudentPlan` | `GET /api/panel/student/plan` |
| `app/panel/ogrenci/kocluk` | `lib/kocum/student-coaching-server.ts#loadStudentCoachingHub` | `GET /api/panel/student/coaching` |
| `components/panel/coaching-sessions.tsx` | `…#loadUpcomingCoachingSessions` | aynı uç (öğrenci kapsamı) |
| `app/panel/ogrenci/check-in` | `lib/panel/student-check-in-server.ts#loadStudentCheckIn` | `GET /api/panel/student/check-in` |

Davranış notları:
- **Sorgular:** Web sayfalarının sorguları birebir taşındı.
- **Planım:**
  - `loadStudentPlan` koç özetine `weekStart` alanını ekledi (eklemeli).
  - Deneme Ligi sınavları yalnız `includeUpcomingOdkExams: true` ile (yalnız web) okunur.
- **Yön Bugün:**
  - Görev satırına salt okunur ek alanlar seçildi: `taskKind`, `sourceType`, `sourceReferenceId`, `reasonCode`, `actualQuestions`, `studentNote`.
  - "Şimdi" seçimi için yeni kural yazılmadı. `buildStudentHomeActionPlan` yalnız Yön adaylarıyla çağrılıyor.
- **Saf dönüştürücüler:** `lib/mobile/yon-views.ts`. Burada iş kuralı yok, yalnız alan seçimi ve `Date → ISO` dönüşümü var. Gün anahtarı, hedef metni, tamamlama alanları ve plan durum etiketi web yardımcılarından gelir.

## 4. Mobil mimari

- **Ürün bağımsız veri katmanı:** `features/shared/workspace-data.tsx`. Bileşenleri:
  - `useWorkspaceQuery`, `useInvalidateWorkspace`, `WorkspaceRouteGate`.
  - `QueryView`, `usePullToRefresh`, `useOnline`.
  - `features/od/shared.tsx` artık bunun OD kapsamlı ince sarmalayıcısı. M2 ekranları değişmedi.
- **Yön katmanı:** `features/yon/shared.tsx`.
  - `useYonQuery` ve `YonRouteGate`.
  - `useInvalidateYon({ alsoOd })`: ödeve bağlı görevde OD görünümleri de bayat işaretlenir.
- **Ekranlar** (`features/yon/`):
  - `yon-today`, `yon-plan`, `task-detail` (rota `yon/task/[id]`), `yon-work`.
  - `yon-goals`, `yon-coaching`, `yon-weekly`.
  - Yardımcılar: `task-row`, `hooks`, `model`.
- **Ortak:**
  - `features/shared/check-in.tsx` (OD + Yön).
  - `features/od/od-weekly-digest.tsx`, `WeeklyDigestContent`'i dışa açtı.
- **API:** `src/lib/api/yon.ts`. Tüm yanıtlar sözleşme doğrulayıcısından geçer.

## 5. Kaldırılan eski (legacy) kod

Tüketicisi kalmadığı doğrulanarak silindi:
- `src/features/ok/ok-goals.tsx`, `src/lib/legacy-session.ts`.
- `src/components/{panel-ui,themed-text,themed-view}.tsx`, `src/constants/theme.ts`, `src/hooks/use-theme.ts`.
- Boş `features/legacy` dizini.

Paket boyutu düştü: Android 3,4 → 3,3 MB, iOS 3,1 → 3,0 MB.

## 6. Kararlar ve sınırlamalar

Ayrıntı: `migration-decisions.md` MD-19.
- **Taslak plan görevleri:** Mobile verilmez. Yalnız durum ve görev sayısı gelir.
- **Yön `assignments`:** `yon-work` ekranına gider (Yön plan görevleri). OD ödev ekranı ve OD ucu kullanılmaz.
- **Görüşme:** Öğrenciye mobilde yalnız `REQUEST` açık. Koçun önerdiği saatin onayı web devam yoluyla yapılır.
- **Ortak haftalık özet (Yön):** Yalnız aktif OD üyeliği varken istenir. Uç OD üyeliği istiyor; politika genişletilmedi.
- **Yön `analiz` / `progress` / `dino`:** Açık web devam yolu (`LATER`).
- **Tercihler:** Mobil yalnız günleri ve günlük süreyi düzenler. Sınav bilgisi, planlama durumu ve yoğunluk nabzı sunucudaki değerleriyle aynen geri gönderilir (PATCH tüm alanları ister; web'de girilen bilgi silinmez).
- **Öğrencinin kendi planını üretmesi** (`/api/panel/adaptive-plan/generate`): Mobilde yok, web'de.
- **Gerçek cihaz / simülatör testi YAPILMADI.**
