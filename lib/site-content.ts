/**
 * PUBLIC MARKETING SITE — içerik kaynağı.
 *
 * Bu dosya yeni public sitenin (Home / Ders Paketleri / Kamplar / Hakkımızda /
 * Giriş) metin ve liste verilerini tek yerde tutar.
 *
 * ÖNEMLİ: Fiyat/ürün kimliği burada DEĞİLDİR. Ödeme-kritik fiyat kaynağı
 * `lib/content.ts` → `subjectPackageGroups`'tur. Buradaki her şey pazarlama
 * metnidir; abartılı/kanıtlanmamış başarı vaadi içermez.
 */
import { contact } from "@/lib/content";

export const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;
export const telHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;

/* ---------------- Navigasyon ---------------- */

export const primaryNav = [
  { label: "Ders Paketleri", href: "/ders-paketleri/" },
  { label: "Kamplar", href: "/kamplar/" },
  { label: "Hakkımızda", href: "/hakkimizda/" },
] as const;

/** Sağ üst birincil CTA — lead / satış odaklı (self-register yok). */
export const navCta = { label: "Ücretsiz görüşme", href: "/iletisim/" } as const;
export const navLogin = { label: "Giriş yap", href: "/giris/" } as const;

/* ---------------- Hero ---------------- */

export const hero = {
  pill: "LGS ve YKS için en fazla 4 kişilik canlı matematik",
  title: ["Matematikte eksik nerede,", "çalışma oradan başlar."],
  subtitle:
    "LGS ve YKS öğrencileri için küçük grup canlı ders, öğretmen geri bildirimi ve ders sonunda net çalışma yönü.",
  primary: { label: "Ders Paketlerini İncele", href: "/ders-paketleri/" },
  secondary: { label: "Ücretsiz görüşme", href: "/iletisim/" },
  floatingCards: [
    { title: "En fazla 4 öğrenci", sub: "Öğretmen her çözümü görebilir" },
    { title: "İki paket", sub: "LGS · YKS" },
    { title: "Ders sonrası yön", sub: "Ödev, tekrar ve sıradaki adım" },
  ],
} as const;

/* ---------------- Sosyal kanıt (üniversite barı) ---------------- */

export const socialProof = {
  text: "İki paket, aynı butik ders disiplini: canlı matematik, küçük grup ve takip.",
  badges: ["LGS", "YKS", "Matematik", "Küçük grup", "Canlı ders", "Ders sonrası takip", "PayTR güvenli ödeme"],
} as const;

/* ---------------- Ana değer önerisi (iki büyük kart) ---------------- */

export const valueProps = {
  eyebrow: "Neden Online Dershanem",
  title: "Ders bitince süreç bitmiyor.",
  subtitle:
    "Öğrencinin derste nerede takıldığını görür, ders sonrasında hangi çalışmayla devam edeceğini sade biçimde netleştiririz.",
} as const;

/* ---------------- İlk 30 gün ---------------- */

export const first30 = {
  title: ["İlk 30 günde matematikte", "ne değişir?"],
  timeline: ["Bugün", "7. Gün", "30. Gün"],
  columns: [
    {
      title: "Seviyeyi görelim",
      items: [
        "Öğrencinin sınıfı ve sınav hedefi alınır",
        "Matematikte tıkandığı başlıklar konuşulur",
        "LGS veya YKS paketine göre grup planlanır",
      ],
    },
    {
      title: "Ders düzeni otursun",
      items: [
        "Canlı derslere düzenli katılır",
        "Derste soru sorar ve çözümünü gösterir",
        "Ders sonrası ne çalışacağı yazılı olarak netleşir",
      ],
    },
    {
      title: "Takip anlam kazansın",
      items: [
        "Konu eksikleri görünür hale gelir",
        "Çalışma düzeni oturur",
        "Deneme ve ödev takibi aynı plana bağlanır",
      ],
    },
  ],
  cta: { label: "Ücretsiz görüşme", href: "/iletisim/" },
} as const;

/* ---------------- Başarı hikayeleri (fake foto YOK) ---------------- */

export type Story = {
  tag: string;
  quote: string;
  name: string;
  detail: string;
};

export const stories: Story[] = [
  {
    tag: "YKS öğrencisi",
    quote: "Ders sonrası ne çalışacağını bilmek haftayı daha planlı götürmesini sağladı.",
    name: "YKS öğrencisi",
    detail: "Matematik çalışma düzeni",
  },
  {
    tag: "8. sınıf velisi",
    quote: "Kalabalık sınıfta soru soramıyordu; küçük grupta daha aktif ilerlemeye başladı.",
    name: "8. sınıf velisi",
    detail: "Küçük grup canlı ders",
  },
  {
    tag: "LGS velisi",
    quote: "Veli olarak süreci daha net takip edebildik.",
    name: "LGS velisi",
    detail: "Düzenli takip",
  },
  {
    tag: "YKS öğrencisi",
    quote: "Soru çözümünü gösterince nerede hata yaptığını daha hızlı fark etmeye başladı.",
    name: "YKS öğrencisi",
    detail: "En fazla 4 kişi",
  },
];

/* ---------------- Sıkça sorulan sorular ---------------- */

export type Faq = { q: string; a: string };

export const homeFaqs: Faq[] = [
  {
    q: "Dersler kaç kişilik?",
    a: "Canlı matematik dersleri en fazla 4 öğrencilik küçük gruplarda yapılır.",
  },
  {
    q: "Öğrenci derste soru sorabiliyor mu?",
    a: "Evet. Küçük grup düzeni öğrencinin soru sorması, çözümünü göstermesi ve öğretmenden doğrudan geri bildirim alması için kurulmuştur.",
  },
  {
    q: "Ödeme sonrası ne olacak?",
    a: "Ekibimiz sizinle iletişime geçer, öğrencinin seviyesini ve hedefini konuşur, uygun küçük grubu belirler ve ilk dersi planlar.",
  },
  {
    q: "Hesap oluşturmak gerekiyor mu?",
    a: "Hayır. Paketi satın almak ve ilk ders planlamasını yapmak için hesap oluşturmanız gerekmez.",
  },
  {
    q: "Ders başlamadan önce görüşebilir miyiz?",
    a: "Evet. Ücretsiz ön görüşmede öğrencinin sınıfını, matematik seviyesini ve sınav hedefini konuşabiliriz.",
  },
  {
    q: "Çocuğum matematikte çok gerideyse uygun mu?",
    a: "Ön görüşmede seviyeyi birlikte değerlendiririz. Uygun küçük grup varsa ders, öğrencinin ihtiyaç duyduğu noktadan planlanır.",
  },
  {
    q: "LGS ve YKS için uygun mu?",
    a: "Evet. İki paket vardır: LGS Matematik Ders Paketi ve YKS Matematik Ders Paketi. Ders içeriği ve grup düzeni öğrencinin sınav hedefine göre belirlenir.",
  },
  {
    q: "İstediğim zaman iptal edebilir miyim?",
    a: "Paket aylık ilerler ve taahhüt içermez. Bir sonraki ay devam etmemeyi tercih edebilirsiniz.",
  },
];

/* ---------------- Footer ---------------- */

export const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Ders Paketleri", href: "/ders-paketleri/" },
      { label: "Kamplar", href: "/kamplar/" },
      { label: "Matematik Ders Paketleri", href: "/matematik-ders-paketi/" },
      { label: "SSS", href: "/sss/" },
    ],
  },
  {
    title: "Kurumsal",
    links: [
      { label: "Hakkımızda", href: "/hakkimizda/" },
      { label: "İletişim", href: "/iletisim/" },
      { label: "Blog", href: "/blog/" },
      { label: "Ön görüşme", href: "/iletisim/" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "Sıkça Sorulanlar", href: "/sss/" },
      { label: "Gizlilik", href: "/gizlilik/" },
      { label: "KVKK", href: "/kvkk/" },
      { label: "Kullanım koşulları", href: "/gizlilik/" },
      { label: "İade Politikası", href: "/iade/" },
      { label: "PayTR Güvenli Ödeme", href: "/ders-paketleri/" },
    ],
  },
] as const;

export const footerTagline =
  "LGS ve YKS için en fazla 4 kişilik canlı matematik dersleri, ders sonrası çalışma yönü ve güvenli ödeme.";
