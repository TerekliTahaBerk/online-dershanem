/**
 * Panel domain vocabulary — tek kaynak.
 *
 * Navigasyon etiketleri, ekran başlıkları ve komut paleti bu sözlüğü kullanır.
 * Route path'leri bilinçli olarak korunur; etiket ile URL ayrılabilir
 * (`/odevler` → "Çalışmalar"). Yeni bir kavram eklerken önce buraya yazın.
 */

export const PANEL_DOMAIN = {
  ders: "Ders",
  dersOturumu: "Ders oturumu",
  dersler: "Dersler",
  grup: "Grup",
  gruplar: "Gruplar",
  ogrenci: "Öğrenci",
  ogrenciler: "Öğrenciler",
  ogretmen: "Öğretmen",
  ogretmenler: "Öğretmenler",
  veli: "Veli",
  veliler: "Veliler",
  calisma: "Çalışma",
  calismalar: "Çalışmalar",
  /** Öğretmenin verdiği görev; öğrenciye "Çalışma" olarak yansır. */
  odev: "Ödev",
  materyal: "Materyal",
  materyaller: "Materyaller",
  /** Öğretmen/öğrenci kaynak kütüphanesi menü etiketi. */
  kaynaklar: "Kaynaklar",
  haftalikPlan: "Haftalık plan",
  /** Öğrenci zihinsel modelinde kısaltılmış menü etiketi. */
  plan: "Plan",
  hedef: "Hedef",
  hedefler: "Hedefler",
  kazanim: "Kazanım",
  kazanımlar: "Kazanımlar",
  deneme: "Deneme",
  denemeler: "Denemeler",
  mudahale: "Müdahale",
  checkIn: "Check-in",
  lead: "Lead",
  siparis: "Sipariş",
  siparisler: "Siparişler",
  paket: "Paket",
  provisioning: "Provisioning",
  odeme: "Ödeme",
  bildirim: "Bildirim",
  bildirimler: "Bildirimler",
  operasyon: "Operasyon",
  operasyonMerkezi: "Operasyon merkezi",
  kocluk: "Koçluk",
  olcme: "Ölçme",
  gelisim: "Gelişim",
  bugun: "Bugün",
  kisiler: "Kişiler",
  takvim: "Takvim",
  yonetimAnalitikleri: "Yönetim analitikleri",
} as const;

export type PanelDomainTerm = (typeof PANEL_DOMAIN)[keyof typeof PANEL_DOMAIN];

/**
 * Eski / çelişkili etiket → canonical mapping (dokümantasyon ve migrasyon için).
 * Runtime navigasyon doğrudan PANEL_DOMAIN kullanır.
 */
export const PANEL_TERM_ALIASES = {
  Eğitmen: PANEL_DOMAIN.ogretmen,
  Eğitmenler: PANEL_DOMAIN.ogretmenler,
  "Koçluk Merkezi": PANEL_DOMAIN.kocluk,
  "Koçluk merkezi": PANEL_DOMAIN.kocluk,
  "Haftalık Plan": PANEL_DOMAIN.haftalikPlan,
  "Koçluk planı": PANEL_DOMAIN.haftalikPlan,
  Gelişimim: PANEL_DOMAIN.gelisim,
  Gelişimin: PANEL_DOMAIN.gelisim,
  "Nasılım?": PANEL_DOMAIN.checkIn,
  "Yardım İsteyenler": "Yardım isteyenler",
  "Müdahale kutusu": PANEL_DOMAIN.mudahale,
  "İşler / Provisioning": PANEL_DOMAIN.provisioning,
  "Özellikler / Sistem": "Özellikler",
  "Dersler & Gruplar": `${PANEL_DOMAIN.gruplar} ve ${PANEL_DOMAIN.dersler}`,
  Ödevler: PANEL_DOMAIN.calismalar,
  "Deneme Planlama": "Deneme planlama",
  "Canlı Operasyon": "Canlı operasyon",
  "Sonuç Analizi": "Sonuç analizi",
  "Deneme raporları": "Deneme raporları",
} as const;
