/**
 * PUBLIC MARKETING SITE — içerik kaynağı.
 *
 * Bu dosya public sitenin ortak pazarlama metinlerini tutar. Üç ürünün yapısal
 * kaynağı `lib/product-architecture.ts` içindedir.
 *
 * ÖNEMLİ: Fiyat/ürün kimliği burada DEĞİLDİR. Ödeme-kritik fiyat kaynağı
 * `lib/content.ts` → `subjectPackageGroups`'tur. Buradaki her şey pazarlama
 * metnidir; abartılı/kanıtlanmamış başarı vaadi içermez.
 */
import { contact } from "@/lib/content";
import { publicProducts, sharedIntelligenceLayer } from "@/lib/product-architecture";

export const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;
export const telHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;

/* ---------------- Navigasyon ---------------- */

/**
 * Ana menü — onaylı tasarım (Site Nav.dc.html):
 * Ürünler ▼ · Dino AI · Hakkımızda · Blog
 * "Ürünler" üç ürünü açan bir alt menüdür; diğerleri düz bağlantıdır.
 */
export const productsMenu = {
  label: "Ürünler",
  accessibleLabel: "Ürünler menüsü",
  href: "/urunler",
  items: publicProducts.map(({ name, href, role }) => ({
    label: name,
    href,
    summary: role,
  })),
} as const;

export const primaryNav = [
  {
    label: sharedIntelligenceLayer.name,
    accessibleLabel: sharedIntelligenceLayer.name,
    href: sharedIntelligenceLayer.href,
  },
  { label: "Hakkımızda", accessibleLabel: "Hakkımızda", href: "/hakkimizda" },
  { label: "Blog", accessibleLabel: "Blog", href: "/blog" },
] as const;

/** Sağ üst birincil CTA — paket kurucuya götürür (self-register yok). */
export const navCta = { label: "Paketini Oluştur", href: "/paketler" } as const;
/** Öğrenci paneli girişi. Panel sıfırdan yazılana kadar `/giris` "yenileniyor" mesajı + destek kanallarını gösterir. */
export const navLogin = { label: "Giriş Yap", href: "/giris" } as const;

/* ---------------- Sıkça sorulan sorular ---------------- */

export type Faq = { q: string; a: string };

export const homeFaqs: Faq[] = [
  {
    q: "Üç ürün arasındaki fark ne?",
    a: "Online Dershanem konuyu öğretir: öğretmenle canlı ders. Online Koçum haftanı planlar ve planın ne kadarını yaptığını takip eder. Online Deneme Kulübüm nerede durduğunu ölçer. Biri öğretir, biri düzen kurar, biri ölçer.",
  },
  {
    q: "Üçünü birden almak zorunda mıyım?",
    a: "Hayır. Tek ürünle başlayabilirsin. Online ödeme akışı şu an ders paketinde açıktır; koçluk veya deneme eklemek istersen süreç ön görüşmede netleşir.",
  },
  {
    q: "Hangisiyle başlamalıyım?",
    a: "Konuyu anlamakta zorlanıyorsan dersle. Konuyu biliyor ama düzenli çalışamıyorsan koçlukla. İkisi de tamamsa ama sınavda istediğin sonucu alamıyorsan denemeyle.",
  },
  {
    q: "Dersler kaç kişilik?",
    a: "En fazla dört. İstersen birebir de alabilirsin. Dört kişiyi aşmıyoruz çünkü öğrencinin derste çözümünü gösterebilmesi gerekiyor; kalabalıkta bu olmuyor.",
  },
  {
    q: "Hangi dersler var?",
    a: "LGS'de matematik, fen bilimleri, Türkçe, T.C. İnkılap Tarihi, İngilizce ve din kültürü. YKS'de bunlara edebiyat, fizik, kimya, biyoloji, tarih, coğrafya ve felsefe ekleniyor. Hangi dersi seçersen seç fiyat aynı.",
  },
  {
    q: "Karar vermeden konuşabilir miyiz?",
    a: "Tabii. Ön görüşme ücretsiz; öğrencinin sınıfını, hedefini ve bugün nerede takıldığını konuşuyoruz. Satın alma zorunluluğu yok.",
  },
];

/* ---------------- Footer ---------------- */

/**
 * Footer kolonları — onaylı tasarım (Site Footer.dc.html): ÜRÜNLER / REHBERLER / DESTEK.
 *
 * Tasarımdaki "Yardım merkezi" için depoda bir route YOK; uydurma bağlantı
 * yerine mevcut gerçek destek sayfalarına bağlanır (§11 — yasal/destek route
 * uydurulmaz, çalışan bağlantı kaldırılmaz). LGS/YKS ve ders seçenekleri
 * bağlantıları SEO değeri taşıdığı için rehber sütununda korunur.
 */
export const footerColumns = [
  {
    title: "Ürünler",
    links: [
      ...publicProducts.map(({ name, href }) => ({ label: name, href })),
      { label: "Paketini Oluştur", href: "/paketler" },
    ],
  },
  {
    title: "Rehberler",
    links: [
      { label: "LGS canlı ders", href: "/lgs" },
      { label: "YKS canlı ders", href: "/yks" },
      { label: "Ders seçenekleri", href: "/ders-paketleri" },
      { label: "Matematik", href: "/matematik" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "Sıkça sorulan sorular", href: "/sss" },
      { label: "Ücretsiz görüşme", href: "/iletisim" },
      { label: "Öğrenci girişi", href: "/giris" },
      { label: sharedIntelligenceLayer.name, href: sharedIntelligenceLayer.href },
    ],
  },
] as const;

/** Alt şerit — yalnızca depoda gerçekten var olan yasal sayfalar. */
export const footerLegalLinks = [
  { label: "Gizlilik", href: "/gizlilik" },
  { label: "KVKK", href: "/kvkk" },
  { label: "İade", href: "/iade" },
] as const;

export const footerTagline =
  "LGS ve YKS öğrencileri için canlı ders, koçluk ve deneme analizi. Üçünü ayrı ayrı da alabilirsin, birlikte de.";
