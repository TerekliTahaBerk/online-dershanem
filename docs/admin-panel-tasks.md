# Admin Panel Tasks

> **Not (Faz 0+):** Bu dosya sadece admin panelinin operasyonel backlog'udur.
> Tüm panel sisteminin (Öğrenci/Öğretmen/Veli/Admin) ürün vizyonu ve faz yol
> haritası için **`docs/panel-system-master-plan.md`** dokümanına bakın.

Bu liste repo içindeki mevcut yapı baz alınarak çıkarıldı. Durumlar düzenli uygulanabilir backlog mantığında tutuldu.

## Şimdi

- [x] Admin panel backlog'unu repo içine almak
- [x] Operasyon filtresi eklemek
- [x] Kayıtlara görev başlığı ve sonraki aksiyon tarihi eklemek
- [x] Görev kuyruğu metriği eklemek
- [x] OD/ODK erişim etiketleri için ortak `service` ayrımı (migration 0009 + backfill tamam)
- [x] Öğrenci ve öğretmen panellerine ODK kısayolu (üst başlık, koşullu)
- [x] Admin panel renk token sweep (eski palet kaldırıldı)
- [x] ODK admin dashboard'a OD/ODK servis bazlı etiket sayacı
- [ ] Görev durumunu tamamlandı mantığı ile kapatmak

## Yakın Vade

- [ ] Lead, purchase ve student için ayrı detay sayfaları
- [ ] Lead veya purchase kaydını mevcut öğrenciye manuel bağlama
- [ ] Aynı telefon numarası için mükerrer kayıt uyarısı
- [ ] Ödeme event timeline'ını panelde göstermek
- [ ] Son güncellenen ve geri dönüş bekleyen kayıtlar için hazır görünümler
- [ ] Kaynak ve paket bazlı filtreler
- [ ] Not geçmişi ve zaman damgalı operasyon log'u

## Satış Operasyonu

- [ ] Ödeme bekleyenler kuyruğu
- [ ] Callback geldi ama ödeme tamamlanmadı görünümü
- [ ] Paket bazlı dönüşüm oranı
- [ ] Source bazlı dönüşüm oranı
- [ ] Veli ve öğrenci iletişim geçmişi görünümü

## Öğrenci Takibi

- [ ] Görev tamamlandı mantığı
- [ ] Öğrenci risk kuralları
- [ ] Son temas tarihi
- [ ] Deneme sonucu ve net değişimi geçmişi
- [ ] Basit CRM akışı ve toplu durum güncelleme

## Yönetim

- [ ] Günlük ve haftalık dashboard
- [ ] Admin bazlı iş yükü görünümü
- [ ] Son 7 gün trend kartları
- [ ] Funnel metriği: lead -> görüşme -> kayıt -> ödeme
