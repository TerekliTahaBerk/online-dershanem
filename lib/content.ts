export const siteUrl = "https://onlinedershanem.com";

export const navLinks = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Misyonumuz", href: "/misyonumuz/" },
  { label: "İletişim", href: "/iletisim/" }
];

/**
 * Matematik paket kataloğu — sitenin TEK fiyat/ürün kaynağı.
 *
 * ÖNEMLİ (ödeme kritik): `category` + `subject` çifti sepet kimliği ve
 * checkout fiyat doğrulamasının anahtarıdır (`getPackagePriceCents`). Bu
 * çiftleri değiştirmeden önce `lib/od/checkout.ts` ve cart akışını gözden geçir.
 * `discountedPrice` Türkçe formatı `parsePriceToCents` ile kuruşa çevrilir.
 *
 * Ürün modeli: tek public satış ürünü — Matematik Ders Paketi.
 * Mevcut OD sepeti → /paketler/satin-al → dinamik PayTR iframe akışından
 * satılır; ayrı PayTR linki gerekmez.
 */
export const subjectPackageGroups = [
  {
    key: "Matematik",
    title: "Matematik Ders Paketi",
    subtitle:
      "En fazla dört öğrenci. Aynı öğretmen, aynı tempo, ders sonrası net çalışma yönü.",
    packages: [
      {
        id: "matematik-ders-paketi",
        name: "Matematik Ders Paketi",
        accent: "live",
        subject: "Ders Paketi",
        category: "Matematik",
        badge: "",
        tagline: "Küçük grupta, öğretmenin öğrenciyi gerçekten duyduğu canlı matematik dersi.",
        audience:
          "Derste soru sorabilmeye, çözümünü gösterebilmeye ve hafta sonunda ne çalışacağını bilmeye ihtiyaç duyan öğrenciler için.",
        quota: "En fazla 4 öğrenci",
        oldPrice: "₺5.000/ay",
        discountLabel: "İNDİRİMLİ",
        discountedPrice: "₺3.000/ay",
        priceCents: 300000,
        perLessonPrice: "",
        features: [
          "Canlı matematik dersi",
          "En fazla 4 öğrencilik grup",
          "Derste soru-cevap ve birlikte çözüm",
          "Ders sonrası çalışma yönü",
          "Ödevlendirme ve öğretmen notu",
          "Veliye sade gelişim özeti",
          "Ödeme sonrası öğrenci hesabı ekibimiz tarafından hazırlanır"
        ],
        cta: "Sepete Ekle"
      }
    ]
  }
] as const;

/**
 * Eski per-branş PayTR direct-link haritası kaldırıldı. Yeni matematik
 * paketleri dinamik PayTR iframe akışından satıldığı için statik link
 * gerekmez. Fonksiyon geriye dönük uyumluluk için korunur; her zaman null
 * döner ve çağıranlar sepet/checkout akışına yönlenir.
 */
export const packagePaymentLinks = {} as Record<string, string>;

export function getPackagePaymentLink(_category: string, _subject: string): string | null {
  return null;
}

export const blogPosts = [
  {
    slug: "online-dershane-nedir",
    category: "Online Dershane",
    title: "Online Dershane Nedir? LGS ve YKS İçin Doğru Seçim Rehberi",
    seoTitle: "Online Dershane Nedir? LGS-YKS İçin Seçim Rehberi",
    metaDescription:
      "Online dershane nedir, hangi kriterlere göre seçilir? LGS ve YKS öğrencileri için sınıf mevcudu, takip sistemi ve ders bazlı modeli karşılaştıran rehber.",
    excerpt:
      "Online dershane seçerken yapılan en yaygın hata sadece fiyat karşılaştırmak. Bu rehberde küçük grup, ders bazlı seçim ve düzenli takip kriterlerini gerçek bir karar çerçevesine oturtuyoruz.",
    cardSnippet: "Kalabalık sınıf mı, küçük grup mu? Online dershane seçimi için pratik rehber.",
    featured: true,
    sections: [
      {
        h2: "Online dershane seçerken neden yanlış karar veriliyor?",
        paragraphs: [
          "Birçok öğrenci ve veli online dershane seçiminde önce paket fiyatına bakıyor. Oysa öğrencinin gerçekten ilerleyip ilerlemediğini belirleyen ana etken fiyat değil; ders içi etkileşim ve düzenli takip.",
          "Sınıf 20-30 kişiye çıktığında öğrenci derste görünmez kalır. Özellikle TYT ve LGS gibi süreçlerde bu durum, düzenli çalışan bir öğrencinin bile performansını düşürebilir."
        ],
        bullets: [
          "Kalabalık sınıfta bireysel geri bildirim azalır",
          "Ders sonrası analiz yapılmadığında aynı hatalar tekrar eder",
          "Takip yoksa çalışma disiplini kısa sürede dağılır"
        ]
      },
      {
        h2: "Net üreten online dershane modelinin üç temel kriteri",
        paragraphs: [
          "Bir online dershane modelinin gerçekten işe yarayıp yaramadığını üç pratik soruyla anlayabilirsin."
        ],
        bullets: [
          "Küçük grup: Soru sorabilmek ve bireysel dönüş alabilmek için en fazla 4 kişilik gruplar.",
          "Ders bazlı seçim: Sadece ihtiyaç duyulan derse yatırım yaparak verimi artırmak için.",
          "Haftalık takip: Deneme analizi, ödev kontrolü ve hedef takibinin düzenli işlemesi için."
        ]
      },
      {
        h2: "Online dershane mi, online özel ders mi? Karar nasıl verilir?",
        paragraphs: [
          "Öğrenci tüm derslerde temel bir problem yaşıyorsa yapılandırılmış bir online dershane modeli daha sağlıklı sonuç verir. Sadece belirli bir derste tıkanma varsa online özel ders daha hızlı çözüm olabilir.",
          "Çoğu durumda en sürdürülebilir yol, dershane düzenine ihtiyaç olduğunda ders bazlı özel destekle birleşmiş bir model oluyor."
        ],
        links: [
          { label: "Online özel ders modeli nasıl çalışıyor?", href: "/online-ozel-ders/" },
          { label: "Ders bazlı küçük grup sistemini incele", href: "/online-dershane/" }
        ]
      }
    ],
    cta: {
      title: "Sana uygun butik grup paketini birlikte belirleyelim",
      text: "Tek başına çalışırken nerede takıldığını görmek zordur. Hangi dersten başlaman gerektiğini ekibimizle birlikte netleştirelim.",
      buttonLabel: "Paketleri İncele"
    },
    relatedSlugs: ["online-ozel-ders-mi-dershane-mi", "yks-online-ders-calisma-plani", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "online-ozel-ders-mi-dershane-mi",
    category: "Online Özel Ders",
    title: "Online Dershane mi Özel Ders mi? Hangisi Sana Uygun?",
    seoTitle: "Online Dershane mi Özel Ders mi? Karşılaştırma Rehberi",
    metaDescription:
      "Online dershane mi özel ders mi daha verimli? Maliyet, sürdürülebilirlik ve sonuç açısından küçük grup modeliyle karşılaştırmalı değerlendirme.",
    excerpt:
      "En sık sorulan sorulardan biri: online dershane mi alayım, özel ders mi? Cevap öğrencinin ihtiyacına göre değişiyor; bu yazıda karar çerçevesini birlikte kuruyoruz.",
    cardSnippet: "Online dershane ve özel ders karşılaştırması: hangisi sana uygun?",
    featured: true,
    sections: [
      {
        h2: "Özel dersin güçlü tarafı",
        bullets: ["Birebir ilgi", "Hızlı ilerleme", "Esnek ders planı"],
        paragraphs: [
          "Doğru öğretmenle yapılan özel ders kısa sürede ciddi sonuç verebilir.",
          "Ancak çoğu öğrenci için maliyet, uzun sınav dönemlerinde sürdürülebilir olmuyor."
        ]
      },
      {
        h2: "Online dershanenin güçlü tarafı",
        bullets: ["Sistemli ilerleme", "Daha uygun maliyet", "Düzenli takip"],
        paragraphs: [
          "Online dershane modelinde haftalık plan, deneme analizi ve takip aynı sistemde yürütülür.",
          "Özellikle uzun sınav süreçlerinde bu düzen, motivasyonu korumayı kolaylaştırır."
        ]
      },
      {
        h2: "Çoğu öğrenci için en dengeli model: küçük grup",
        bullets: ["4 kişilik gruplar", "Birebir gibi ilgi", "Dershane gibi düzen"],
        paragraphs: [
          "Küçük grup modelinde öğrenci ne kalabalıkta kaybolur ne de maliyet yükü altına girer.",
          "Bu yapı hem verimli hem de uzun süreçte sürdürülebilir bir ilerleme sunar."
        ],
        links: [{ label: "Online dershane sistemini incele", href: "/online-dershane/" }]
      }
    ],
    cta: {
      title: "Küçük grup modelini yakından incele",
      text: "Öğrencinin seviyesine göre en uygun modeli birlikte belirleyelim.",
      buttonLabel: "Online Dershane Sistemini İncele"
    },
    relatedSlugs: ["online-dershane-nedir", "yks-online-ders-calisma-plani", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "yks-online-ders-calisma-plani",
    category: "YKS",
    title: "TYT ve AYT Aynı Anda Nasıl Çalışılır?",
    seoTitle: "TYT ve AYT Aynı Anda Nasıl Çalışılır? Net Üreten Sistem",
    metaDescription:
      "TYT ve AYT'yi birlikte yürütürken zaman yönetimi, deneme analizi ve haftalık plan nasıl kurulur? Uygulanabilir bir çalışma sistemi.",
    excerpt:
      "YKS sürecinde en sık karşılaşılan sorun TYT ile AYT arasında dengeyi kuramamak. Yanlış denge sıralamayı doğrudan etkiliyor; bu yazıda işleyen bir haftalık plan kuruyoruz.",
    cardSnippet: "TYT + AYT dengesini kurup net üreten haftalık çalışma sistemi.",
    featured: false,
    sections: [
      {
        h2: "TYT ve AYT arasındaki temel fark",
        bullets: ["TYT: hız ve süre yönetimi", "AYT: derinlik ve analiz", "İki alan farklı çalışma mantığı ister"],
        paragraphs: [
          "TYT ve AYT aynı yöntemle çalışıldığında önce süre yönetimi bozuluyor.",
          "Doğru yaklaşım, iki alanı aynı hafta içinde dengeli ama farklı yoğunluklarla yürütmektir."
        ]
      },
      {
        h2: "Haftalık plan nasıl kurulmalı?",
        bullets: [
          "TYT için kısa ve hızlı bloklar",
          "AYT için uzun ve derin odak blokları",
          "Her blok sonunda kısa bir mini test"
        ],
        paragraphs: [
          "Mini test olmayan çalışma ölçülmez. Ölçülmeyen plan da bir hafta sonra kendiliğinden dağılır."
        ]
      },
      {
        h2: "Deneme analizi nasıl yapılır?",
        paragraphs: [
          "Her deneme sonrası kendine sorulması gereken ilk soru şudur: \"Nerede süre kaybettim?\"",
          "Bu soruya net cevap verilmeyen analizlerde ilerleme görünmez kalır."
        ],
        bullets: ["Süre kaybedilen branşları ayır", "Yanlışları tipine göre sınıflandır", "Bir sonraki haftayı analize göre kur"]
      },
      {
        h2: "Sınava yaklaştıkça ne yapılmalı?",
        bullets: ["TYT tekrarını sıklaştır", "AYT'de zayıf konulara odaklan", "Deneme ritmini bozma"]
      },
      {
        h2: "En sık karşılaşılan sorun: takipsizlik",
        paragraphs: [
          "Öğrencilerin çoğu plan yapmayı biliyor ama planı uygulamakta zorlanıyor. Düzenli takip olmadığında program kısa sürede dağılıyor."
        ],
        links: [{ label: "Online özel ders sistemimizi incele", href: "/online-ozel-ders/" }]
      }
    ],
    cta: {
      title: "TYT + AYT dengesini birlikte kuralım",
      text: "Tek başına denge kurmak zorlanıyorsan sana uygun butik grup paketinde haftalık planı birlikte hazırlayalım.",
      buttonLabel: "Online Özel Ders Sistemini İncele"
    },
    relatedSlugs: ["online-dershane-nedir", "online-ozel-ders-mi-dershane-mi", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "lgs-online-ders-net-artirma",
    category: "LGS",
    title: "LGS Net Nasıl Artırılır? 8 Haftalık Uygulanabilir Plan",
    seoTitle: "LGS Net Nasıl Artırılır? 8 Haftalık Uygulanabilir Plan",
    metaDescription:
      "LGS netlerini artırmak için 8 haftalık uygulanabilir bir plan: düzenli çalışma, deneme analizi ve doğru ölçme sistemiyle ilerleme.",
    excerpt:
      "LGS'de net artırmak istiyorsan en büyük engel plansız ve dağınık çalışmak. Bu yazıda 8 haftalık net çalışma planını adım adım anlatıyoruz.",
    cardSnippet: "LGS net artırmak için 8 haftalık uygulanabilir plan ve analiz sistemi.",
    featured: false,
    sections: [
      {
        h2: "LGS'de net artmamasının üç yaygın sebebi",
        paragraphs: [
          "LGS hazırlığında çoğu öğrenci çok çalışmasına rağmen ilerleyemiyor. Bunun temel nedenleri plansız çalışma, deneme sonrası analiz yapılmaması ve çok sayıda kaynak arasında dağılmak.",
          "Net artışının formülü aslında oldukça net: ölçüm, analiz ve hedefli tekrar."
        ],
        bullets: ["Plansız çalışma", "Deneme analizinin atlanması", "Çok kaynak, az tekrar"]
      },
      {
        h2: "1-2. hafta: Mevcut seviyeyi netleştirme",
        paragraphs: [
          "İlk iki haftada öğrencinin mevcut seviyesini ölçmek gerekiyor. Bir seviye belirleme denemesi yapıp özellikle Türkçe paragraf ve matematik problem sürelerini ölçmek kritik.",
          "Bu aşamada öncelik hız değil, doğru çözüm alışkanlığını kurmak."
        ]
      },
      {
        h2: "3-5. hafta: Deneme rutinini oturtma",
        paragraphs: [
          "Bu dönemde haftada en az bir deneme zorunlu olmalı. Deneme sonrası analiz yapılmadan yeni konuya geçmek verimi düşürür.",
          "Analizde şu ayrım net biçimde yapılmalı: bilgi eksikliği mi, dikkat hatası mı? Bu ayrım sonraki haftanın planını belirler."
        ],
        bullets: ["Haftada en az 1 deneme", "Her deneme sonrası analiz", "Bilgi eksiği – dikkat hatası ayrımı"]
      },
      {
        h2: "6-8. hafta: Sınav simülasyonu",
        paragraphs: [
          "Son aşamada süre baskısı altında çözüm pratiği ve doğru soru seçme stratejisi öne çıkıyor.",
          "Net artışı genellikle bu dönemde görünür hale gelir; çünkü önceki haftalarda kurulan sistem sonuç üretmeye başlar."
        ],
        bullets: ["Süre baskısı altında çözüm", "Doğru soru seçme stratejisi", "İstikrarlı net çıktısı"]
      },
      {
        h2: "Tek başına çalışmak neden bu kadar zor?",
        paragraphs: [
          "Planı bilmek tek başına yetmez. Asıl zorluk, planı haftalar boyunca aynı disiplinle uygulayabilmek.",
          "Düzenli takip ve dış kontrol olmadığında sistem genellikle ilk haftalardan sonra dağılıyor."
        ],
        bullets: ["Disiplin eksikliği", "Takip eksikliği", "Geri bildirim eksikliği"]
      },
      {
        h2: "Daha hızlı net artışı için sistemli model",
        paragraphs: [
          "Bu yüzden öğrencilerin önemli bir kısmı küçük grup online ders modeline geçiyor. Bu yapıda haftalık takip, deneme analizi ve seviyeye göre plan birlikte yürütülüyor.",
          "Yani öğrenci yalnızca çalışmıyor; süreç de profesyonel olarak yönetiliyor."
        ],
        links: [
          { label: "Online dershane sistemini incele", href: "/online-dershane/" },
          { label: "Online özel ders modelini incele", href: "/online-ozel-ders/" }
        ]
      }
    ],
    cta: {
      title: "Net artış planını birlikte çıkaralım",
      text: "Bu sistemi tek başına uygulamak zor geliyorsa öğrencinin seviyesine göre haftalık planı birlikte hazırlayalım.",
      buttonLabel: "Paketleri İncele"
    },
    relatedSlugs: ["online-dershane-nedir", "online-ozel-ders-mi-dershane-mi", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "online-dershane-fiyatlari-2026",
    category: "Online Dershane",
    title: "Online Dershane Fiyatları 2026",
    seoTitle: "Online Dershane Fiyatları 2026: Ne Kadar Ödemelisin?",
    metaDescription:
      "Online dershane fiyatları 2026 yılında neye göre değişiyor? Grup ders ücretleri, değer analizi ve net artıran sistem seçimi rehberi.",
    excerpt:
      "Online dershane fiyatları çok değişken. Peki gerçek değer ne? Bu yazıda fiyatı değil sonucu nasıl ölçmen gerektiğini anlatıyoruz.",
    cardSnippet: "Online dershane fiyatları 2026: ucuz mu, değerli mi?",
    featured: false,
    sections: [
      {
        h2: "Ortalama Fiyatlar",
        bullets: ["Grup ders: 1000–2500 TL", "Özel ders: çok daha yüksek"],
        paragraphs: [
          "Fiyat aralığı geniş olabilir. Bu yüzden karar verirken sadece rakama değil sistemin gücüne bakmak gerekir."
        ]
      },
      {
        h2: "Fiyatı Belirleyen Faktörler",
        bullets: ["Sınıf mevcudu", "Öğretmen kalitesi", "Takip sistemi"],
        paragraphs: [
          "Küçük grup ve haftalık takip maliyeti etkiler ama sonuç üretme ihtimalini de yükseltir."
        ]
      },
      {
        h2: "Ucuz mu, Değerli mi?",
        bullets: ["Ucuz ≠ iyi", "Önemli olan net artışı + sistem"],
        paragraphs: [
          "En doğru tercih, öğrencinin düzenli ilerlemesini ve ölçülebilir net artışını sağlayan modeldir."
        ],
        links: [{ label: "Online dershane sistemimizi incele", href: "/online-dershane/" }]
      }
    ],
    cta: {
      title: "Küçük grup + takip sistemli modeli dene",
      text: "Öğrencinin seviyesine göre ders planını birlikte çıkaralım, doğru başlangıcı yapın.",
      buttonLabel: "Hemen Paketleri İncele"
    },
    relatedSlugs: ["online-dershane-nedir", "online-ozel-ders-mi-dershane-mi", "yks-online-ders-calisma-plani"]
  },
  {
    slug: "e-dershane-nedir",
    category: "e Dershane",
    title: "e Dershane Nedir? Kimler İçin Gerçekten Verimli?",
    seoTitle: "e Dershane Nedir? LGS ve YKS İçin Kılavuz",
    metaDescription:
      "e dershane nedir, online dershaneden farkı var mı? LGS-YKS öğrencileri için verimli e dershane seçme rehberi.",
    excerpt:
      "e dershane arayan öğrenciler için en kritik konu sistemli ilerleme. Hangi model gerçekten işe yarıyor bu yazıda netleşiyor.",
    cardSnippet: "e dershane seçerken bakman gereken 3 kritik kriter.",
    featured: false,
    sections: [
      {
        h2: "e dershane ile online dershane aynı mı?",
        paragraphs: [
          "Piyasada e dershane ve online dershane terimleri çoğu zaman aynı anlamda kullanılıyor.",
          "Asıl fark isimde değil, öğrencinin haftalık olarak takip edilip edilmediğinde ortaya çıkıyor."
        ]
      },
      {
        h2: "Verimli e dershane modelinde olmazsa olmazlar",
        bullets: ["Küçük grup dersi", "Haftalık deneme analizi", "Ders bazlı seçim esnekliği"],
        paragraphs: [
          "Bu üç yapı yoksa e dershane sadece video arşivine dönüşür ve öğrenci kısa sürede kopar."
        ]
      },
      {
        h2: "Kimler e dershane modelinden daha hızlı sonuç alır?",
        bullets: ["Takip ile çalışan öğrenciler", "Planı tek başına sürdüremeyenler", "Ders bazlı destek isteyenler"],
        links: [{ label: "Online dershane sistemini detaylı incele", href: "/online-dershane/" }]
      }
    ],
    cta: {
      title: "e dershane modelini yakından incele",
      text: "Öğrencinin seviyesine göre hangi dersten başlaman gerektiğini birlikte belirleyelim.",
      buttonLabel: "Paketleri İncele"
    },
    relatedSlugs: ["online-dershane-nedir", "online-ozel-ders-mi-dershane-mi", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "online-ders-calisma-programi",
    category: "Online Ders",
    title: "Online Ders Çalışma Programı Nasıl Hazırlanır?",
    seoTitle: "Online Ders Çalışma Programı: Uygulanabilir Plan",
    metaDescription:
      "Online ders sürecinde dağılmadan çalışmak için haftalık program nasıl hazırlanır? Uygulanabilir plan ve takip modeli burada.",
    excerpt:
      "Online ders alırken asıl sorun planı sürdürmek. Bu yazıda uygulanabilir haftalık programı adım adım kuruyoruz.",
    cardSnippet: "Online ders programı nasıl sürdürülebilir hale getirilir?",
    featured: false,
    sections: [
      {
        h2: "Program neden ilk haftadan bozuluyor?",
        bullets: ["Gerçekçi olmayan hedefler", "Ölçümsüz çalışma", "Tekrar bloğu olmaması"]
      },
      {
        h2: "Haftalık online ders planı şablonu",
        bullets: [
          "2 gün konu + kısa test",
          "2 gün soru çözüm ve hız",
          "1 gün deneme + analiz",
          "1 gün eksik kapatma"
        ],
        paragraphs: ["Plan mutlaka her hafta deneme sonucuna göre güncellenmelidir."]
      },
      {
        h2: "Programın sürdürülebilir olması için takip sistemi",
        paragraphs: ["Öğrenci planı yazmakta zorlanmaz, uygulamada zorlanır. Bu noktada öğretmen ve koçluk takibi kritik fark yaratır."],
        links: [{ label: "Online özel ders sistemiyle planını netleştir", href: "/online-ozel-ders/" }]
      }
    ],
    cta: {
      title: "Kişisel online ders programını birlikte oluşturalım",
      text: "İhtiyacına en uygun butik grup paketinde haftalık planını seviyene göre kuralım.",
      buttonLabel: "Programımı Oluştur"
    },
    relatedSlugs: ["yks-online-ders-calisma-plani", "online-dershane-nedir", "lgs-online-ders-net-artirma"]
  },
  {
    slug: "ozel-ders-mi-kucuk-grup-mu",
    category: "Özel Ders",
    title: "Özel Ders mi Küçük Grup mu? Hangi Seçim Daha Mantıklı?",
    seoTitle: "Özel Ders mi Küçük Grup mu? Karar Rehberi",
    metaDescription:
      "Özel ders ve küçük grup online ders modeli arasında karar veremiyor musun? Maliyet, verim ve sürdürülebilirlik karşılaştırması.",
    excerpt:
      "Özel ders her zaman en iyi seçenek değildir. Küçük grup modeli bazı öğrenciler için daha verimli ve sürdürülebilir olabilir.",
    cardSnippet: "Özel ders vs küçük grup: maliyet ve sonuç kıyası.",
    featured: false,
    sections: [
      {
        h2: "Özel dersin güçlü tarafı",
        bullets: ["Birebir tempo", "Anlık geri bildirim", "Kısa vadede hızlı toparlama"]
      },
      {
        h2: "Küçük grubun güçlü tarafı",
        bullets: ["Daha sürdürülebilir maliyet", "Sistemli haftalık takip", "Akran motivasyonu"],
        paragraphs: ["Uzun sınav dönemlerinde sürdürülebilirlik, kısa vadeli hızdan daha belirleyici olur."]
      },
      {
        h2: "Hangi durumda hangi model seçilmeli?",
        bullets: ["Tek ders krizi varsa: özel ders", "Genel dağınıklık varsa: küçük grup + takip"],
        links: [{ label: "Küçük grup online dershaneyi incele", href: "/online-dershane/" }]
      }
    ],
    cta: {
      title: "Doğru modeli birlikte belirleyelim",
      text: "Öğrencinin seviyesine göre özel ders mi küçük grup mu daha verimli, ön görüşmede netleştirelim.",
      buttonLabel: "Modelimi Belirle"
    },
    relatedSlugs: ["online-ozel-ders-mi-dershane-mi", "online-dershane-nedir", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "yks-matematik-net-artirma",
    category: "YKS",
    title: "YKS Matematik Neti Nasıl Artar? Uygulanabilir Yol Haritası",
    seoTitle: "YKS Matematik Net Artırma Rehberi",
    metaDescription:
      "YKS matematik neti artırmak için soru analizi, süre yönetimi ve haftalık çalışma planı nasıl kurulmalı? Adım adım öğren.",
    excerpt:
      "YKS matematikte net artırmak için çok soru çözmek tek başına yetmez. Doğru analiz ve doğru sıra gerekir.",
    cardSnippet: "YKS matematikte net artıran sistemli çalışma adımları.",
    featured: false,
    sections: [
      {
        h2: "Neden net artmıyor?",
        bullets: ["Soru tipi analizi yapılmıyor", "Süre yönetimi ihmal ediliyor", "Tekrar planı zayıf kalıyor"]
      },
      {
        h2: "Haftalık matematik planı",
        bullets: ["2 gün konu tekrar", "2 gün yeni nesil soru", "1 gün zamanlı deneme", "1 gün yanlış dönüşü"],
        paragraphs: ["Yanlış dönüşü yapılmayan programda net artışı kısa sürede durur."]
      },
      {
        h2: "Süre yönetimi nasıl geliştirilir?",
        paragraphs: ["Soru başına eşik süre belirlemek ve takılma süresini sınırlamak, toplam neti doğrudan etkiler."],
        links: [{ label: "YKS için online özel ders desteğini incele", href: "/online-ozel-ders/" }]
      }
    ],
    cta: {
      title: "Matematik netini birlikte yükseltelim",
      text: "Mevcut matematik seviyeni analiz edip butik grupta ilk 4 haftalık planını birlikte çıkaralım.",
      buttonLabel: "YKS Matematik Paketini İncele"
    },
    relatedSlugs: ["yks-online-ders-calisma-plani", "online-dershane-nedir", "online-dershane-fiyatlari-2026"]
  },
  {
    slug: "lgs-matematikte-zorlananlar-icin",
    category: "LGS",
    title: "LGS Matematikte Zorlananlar İçin Kurtarma Planı",
    seoTitle: "LGS Matematikte Net Artırma Planı",
    metaDescription:
      "LGS matematikte zorlanan öğrenciler için adım adım net artırma planı. Problem çözme, deneme analizi ve haftalık tekrar sistemi.",
    excerpt:
      "LGS matematikte zorlanıyorsan konu bilmek yetmez; soru refleksi ve analiz disiplini kurman gerekir.",
    cardSnippet: "LGS matematikte tıkanmayı kıran haftalık plan.",
    featured: false,
    sections: [
      {
        h2: "En yaygın matematik hataları",
        bullets: ["Soruyu eksik okumak", "Uzun soruda panik", "Yanlıştan ders çıkarmamak"]
      },
      {
        h2: "4 haftalık toparlama planı",
        bullets: ["Temel konu tekrar", "Günlük problem seti", "Haftalık mini deneme", "Yanlış defteri takibi"]
      },
      {
        h2: "Küçük grup desteği ne kazandırır?",
        paragraphs: ["En fazla 4 öğrencilik sınıfta öğretmen öğrencinin işlem hatasını hızlı fark eder ve anında müdahale eder."],
        links: [{ label: "LGS için online dershane modelini gör", href: "/online-dershane/" }]
      }
    ],
    cta: {
      title: "LGS matematik paketini incele",
      text: "Öğrencinin matematik seviyesini ölçüp hangi konudan başlaman gerektiğini belirleyelim.",
      buttonLabel: "LGS Matematik Paketini İncele"
    },
    relatedSlugs: ["lgs-online-ders-net-artirma", "online-dershane-nedir", "online-ozel-ders-mi-dershane-mi"]
  },
  {
    slug: "deneme-analizi-nasil-yapilir",
    category: "Sınav Stratejisi",
    title: "Deneme Analizi Nasıl Yapılır? Net Artıran Yöntem",
    seoTitle: "Deneme Analizi Nasıl Yapılır? Net Artışı İçin Rehber",
    metaDescription:
      "Deneme analizi nasıl yapılır? Yanlışları doğru sınıflandırıp bir sonraki haftaya plan çıkarmanın net artıran sistemini öğren.",
    excerpt:
      "Deneme çözmek tek başına yeterli değil. Net artışı, deneme sonrası yapılan doğru analizle başlar.",
    cardSnippet: "Net artırmak isteyenler için deneme analiz sistemi.",
    featured: false,
    sections: [
      {
        h2: "Deneme sonrası ilk 3 soru",
        bullets: [
          "Nerede süre kaybettim?",
          "Yanlışın nedeni bilgi mi dikkat mi?",
          "Hangi konudan tekrar çıkmalı?"
        ]
      },
      {
        h2: "Yanlış sınıflandırma şablonu",
        bullets: ["Bilgi eksiği", "Dikkat hatası", "Süre baskısı", "Yanlış soru seçimi"],
        paragraphs: ["Bu ayrım yapılmadan deneme çözmek, aynı hataların tekrarıyla sonuçlanır."]
      },
      {
        h2: "Analizden plana geçiş",
        paragraphs: ["Analiz sonuçları bir sonraki haftanın konu ve soru dağılımını belirlemeli."],
        links: [{ label: "Haftalık takipli online dershane modeli", href: "/online-dershane/" }]
      }
    ],
    cta: {
      title: "Deneme analizini profesyonel takip ile yap",
      text: "Süreç başlamadan öğrencinin analiz raporunu birlikte çıkaralım.",
      buttonLabel: "Deneme Analizi Al"
    },
    relatedSlugs: ["yks-online-ders-calisma-plani", "lgs-online-ders-net-artirma", "online-dershane-nedir"]
  },
  {
    slug: "online-dershane-secim-rehberi-2026",
    category: "Online Dershane",
    title: "Online Dershane Seçim Rehberi 2026",
    seoTitle: "Online Dershane Seçim Rehberi 2026",
    metaDescription:
      "2026'da online dershane seçerken dikkat edilmesi gereken kriterler: sınıf mevcudu, takip sistemi, ders bazlı model ve öğretmen kalitesi.",
    excerpt:
      "Online dershane seçerken reklama değil, ölçülebilir kriterlere bakarak karar vermek uzun vadede çok daha sağlıklı sonuç veriyor.",
    cardSnippet: "2026 için online dershane seçim kontrol listesi.",
    featured: false,
    sections: [
      {
        h2: "Kayıt öncesi kontrol listesi",
        bullets: ["Sınıf mevcudu kaç?", "Haftalık takip var mı?", "Deneme analizi düzenli mi?", "Ders bazlı seçim var mı?"]
      },
      {
        h2: "Öğretmen ve sistem dengesi",
        paragraphs: [
          "İyi öğretmen tek başına yeterli değildir; doğru sistem olmadan öğrenci ilerlemesi sürdürülebilir olmaz."
        ]
      },
      {
        h2: "Yanlış seçim maliyeti nasıl artar?",
        paragraphs: [
          "Yanlış modelde geçen aylar hem zaman hem motivasyon kaybettirir. Bu yüzden başlangıç seçimi kritik bir yatırım kararıdır."
        ],
        links: [{ label: "Online dershane modelimizi detaylı incele", href: "/online-dershane/" }]
      }
    ],
    cta: {
      title: "Doğru online dershane seçimi için bizimle iletişime geç",
      text: "Öğrencinin seviyesine göre en doğru başlangıç modelini birlikte belirleyelim.",
      buttonLabel: "Ön Görüşme Talep Et"
    },
    relatedSlugs: ["online-dershane-nedir", "online-dershane-fiyatlari-2026", "online-ozel-ders-mi-dershane-mi"]
  },
  {
    slug: "online-ders-disiplini-nasil-kurulur",
    category: "Online Ders",
    title: "Online Ders Disiplini Nasıl Kurulur?",
    seoTitle: "Online Ders Disiplini Kurma Rehberi",
    metaDescription:
      "Online ders sürecinde disiplin nasıl kurulur? Ertelemeyi azaltan, sürdürülebilir çalışma alışkanlığı oluşturan pratik sistem.",
    excerpt:
      "Online dersin en kritik noktası süreklilik. Disiplin kurulamayan programlarda sonuç almak zorlaşır.",
    cardSnippet: "Online derslerde istikrar sağlayan disiplin modeli.",
    featured: false,
    sections: [
      {
        h2: "Disiplin neden bozulur?",
        bullets: ["Belirsiz hedefler", "Takip mekanizması olmaması", "Aşırı yoğun program denemeleri"]
      },
      {
        h2: "Sürdürülebilir sistem nasıl kurulur?",
        bullets: ["Kısa günlük bloklar", "Haftalık sabit deneme saati", "Geri bildirim döngüsü"],
        paragraphs: ["Az ama düzenli çalışma, yoğun ama dağınık çalışmadan daha hızlı sonuç üretir."]
      },
      {
        h2: "Takip sistemiyle disiplin kalıcı hale gelir",
        paragraphs: ["Öğrenci tek başına kaldığında planı esnetir; dış takip disiplini korumanın en etkili yoludur."],
        links: [{ label: "Haftalık takipli online ders modelini incele", href: "/online-dershane/" }]
      }
    ],
    cta: {
      title: "Online ders disiplinini birlikte kuralım",
      text: "Butik grup paketinde öğrencinin haftalık çalışma düzenini seviyesine göre tasarlayalım.",
      buttonLabel: "Disiplin Planımı Oluştur"
    },
    relatedSlugs: ["online-ders-calisma-programi", "deneme-analizi-nasil-yapilir", "online-dershane-nedir"]
  }
];

export const faq = [
  {
    q: "Online Dershanem sadece matematik mi?",
    a: "Evet. Public tarafta tek odağımız matematik. Dersi, ödevi ve veli bilgilendirmesini aynı çizgide tutuyoruz."
  },
  {
    q: "Gruplar kaç kişilik?",
    a: "Her matematik grubunda en fazla 4 öğrenci olur. Öğretmen öğrenciyi adıyla tanır; soru sormaya, çözümü göstermeye ve derste geri dönüş almaya zaman kalır."
  },
  {
    q: "Seviyeye göre gruplandırma yapılıyor mu?",
    a: "Evet. Kısa bir matematik değerlendirmesiyle seninle aynı seviyedeki ve benzer hedeflere sahip öğrencilerle eşleşirsin. Tempo ne çok yavaş ne de çok hızlı kalır."
  },
  {
    q: "Satışta hangi paket var?",
    a: "Şu anda public satışta yalnızca Matematik Ders Paketi var. Paket aylık ₺3.000 ve en fazla 4 öğrencilik canlı matematik dersi üzerine kurulu."
  },
  {
    q: "Dersler sınav odaklı mı ilerliyor?",
    a: "Evet. TYT, AYT ve LGS hedefleri dikkate alınır. Derste konu anlatımı ve soru çözümü birlikte ilerler; ders sonunda öğrencinin ne çalışacağı netleşir."
  },
  {
    q: "Veli olarak süreci takip edebilir miyim?",
    a: "Evet. Veli sadece sonuç görmez; çocuğunun hangi konuda zorlandığını anlayacak kadar sade bir özet alır."
  },
  {
    q: "Paket seçiminde kararsızsam ne yapmalıyım?",
    a: "Kısa bir ön görüşmeyle birlikte değerlendirebiliriz. Öğrencinin matematik seviyesini, sınıfını ve hedefini konuşur, doğru küçük grup başlangıcını netleştiririz."
  }
];

// Kategori bazlı SSS — /sss sayfası ve FAQPage JSON-LD bu listeyi kullanır.
// Operasyonel cevaplar (ders süresi 60 dk, haftada 1 ders, telafi yerine ders
// kaydı paylaşımı) ekip tarafından onaylanan rakamlarla yazılmıştır.
export const faqCategories = [
  {
    category: "Ders modeli",
    items: [
      {
        q: "Online Dershanem sadece matematik mi?",
        a: "Evet. Public tarafta tek odağımız matematik. Dersi, ödevi ve veli bilgilendirmesini aynı çizgide tutuyoruz.",
      },
      {
        q: "Dersler LGS, TYT ve AYT odaklı mı?",
        a: "Evet. Öğrencinin sınıfına ve hedefine göre LGS, TYT veya AYT matematiği üzerine kurgulanır. Konu anlatımı ve soru çözümü birlikte ilerler.",
      },
      {
        q: "Dersler canlı mı yoksa kayıt mı?",
        a: "Dersler Google Meet üzerinden gerçek zamanlı ve canlıdır. Hazır video izlemezsiniz; öğrenci soru sorar, çözümünü gösterir ve aynı derste geri dönüş alır.",
      },
      {
        q: "Öğrenci derste soru sorabilir mi?",
        a: "Evet. Soru sormak dersin doğal parçasıdır. En fazla 4 öğrencilik grupta her öğrencinin soru sormaya ve çözümünü göstermeye zamanı olur.",
      },
      {
        q: "Dersler birebir mi yoksa grup hâlinde mi?",
        a: "Dersler en fazla 4 öğrencilik küçük grup hâlinde işlenir. Birebir özel ders değildir; amaç birebir maliyetine çıkmadan, kalabalık sınıfta kaybolmadan yakın takip sağlamaktır.",
      },
      {
        q: "Dersler kaç dakika ve haftada kaç ders var?",
        a: "Her matematik dersi 60 dakikadır. Aylık ₺3.000 paket haftada 1 canlı ders içerir; ders günü ve saati, öğrencinin yerleştiği küçük grubun programına göre belirlenir.",
      },
      {
        q: "Ödev veriliyor ve kontrol ediliyor mu?",
        a: "Evet. Her dersin sonunda seviyeye uygun ödev verilir ve takip edilir; öğrenci bir sonraki derse ne çalışacağını bilerek gelir.",
      },
    ],
  },
  {
    category: "Seviye ve grup yerleşimi",
    items: [
      {
        q: "Gruplar kaç kişilik?",
        a: "Her matematik grubunda en fazla 4 öğrenci olur. Öğretmen öğrenciyi adıyla tanır; kalabalık sınıfta kaybolma olmaz.",
      },
      {
        q: "Seviyeye göre gruplandırma yapılıyor mu?",
        a: "Evet. Kısa bir matematik değerlendirmesiyle öğrenci benzer seviye ve hedefteki öğrencilerle eşleşir. Tempo ne çok yavaş ne de çok hızlı kalır.",
      },
      {
        q: "Öğretmenler nasıl seçiliyor?",
        a: "Dersler, alanında deneyimli matematik öğretmenleriyle yürütülür. Öğretmen-grup eşleşmesinde öğrencinin seviyesi ve hedefi gözetilir.",
      },
    ],
  },
  {
    category: "Ödeme ve iade",
    items: [
      {
        q: "Ödeme sonrası ne olur?",
        a: "Ödeme tamamlandıktan sonra ekibimiz sizinle iletişime geçer, öğrenci hesabını hazırlar ve giriş bilgilerini sizinle paylaşır. Satın almak için önceden hesap oluşturmanız gerekmez.",
      },
      {
        q: "Hesap bilgileri nasıl veriliyor?",
        a: "Giriş bilgilerini ekibimiz hazırlayıp güvenli şekilde size iletir. İlk girişte şifrenizi kendiniz belirlersiniz.",
      },
      {
        q: "Ödeme sonrası beni kim arar ve ilk ders ne zaman başlar?",
        a: "Ödeme sonrası ekibimiz sizinle iletişime geçer, kısa bir seviye değerlendirmesi yapar ve uygun gruba göre ilk dersin başlangıcını birlikte planlar.",
      },
      {
        q: "İptal ve iade koşulları nedir?",
        a: "İade koşullarının tamamı İade Politikası sayfamızda yer alır. Sorularınız için ödeme öncesi bizimle iletişime geçebilirsiniz.",
      },
    ],
  },
  {
    category: "Veli takibi",
    items: [
      {
        q: "Veli süreçten nasıl haberdar olur?",
        a: "Veli yalnızca sonuç görmez; çocuğunun hangi konuda zorlandığını anlayacak kadar sade bir gelişim özeti alır.",
      },
      {
        q: "Veli gelişim özeti ne zaman gönderilir?",
        a: "Gelişim özeti ders sürecine bağlı olarak düzenli paylaşılır; içeriğinde işlenen konu, öğrencinin zorlandığı yer, verilen ödev ve sonraki hedef yer alır.",
      },
      {
        q: "Ders sonrası takip nasıl işliyor?",
        a: "Her dersin sonunda konu, ödev ve tekrar yönü netleşir. Öğrenci ne çalışacağını bilir; veli de sürecin nereye gittiğini kolayca takip eder.",
      },
      {
        q: "Telafi dersi var mı?",
        a: "Ayrı bir telafi dersi yapılmaz. Bunun yerine, öğrenci bir derse katılamadığında o dersin kaydını ve ders sonu özetini paylaşırız; öğrenci işlenen konuyu ve verilen ödevi bu şekilde takip eder. Düzenli devamsızlık durumunda ekibimiz sizinle iletişime geçer.",
      },
    ],
  },
  {
    category: "Teknik gereksinimler",
    items: [
      {
        q: "Hangi teknik ekipman gerekiyor?",
        a: "İnternet bağlantısı olan bir bilgisayar veya tablet, çalışan bir mikrofon ve Google Meet yeterlidir. Kamera tavsiye edilir ama zorunlu değildir.",
      },
      {
        q: "Derse nereden bağlanılıyor?",
        a: "Dersler Google Meet bağlantısı üzerinden yapılır. Bağlantı ve ders saatleri ekibimiz tarafından önceden paylaşılır.",
      },
    ],
  },
  {
    category: "Uygunluk",
    items: [
      {
        q: "Öğrenci matematikte çok gerideyse uygun mu?",
        a: "Uygundur. Önce eksiğin nerede başladığını görürüz ve dersi tam o noktadan kurarız; tempo öğrenciye göre ayarlanır.",
      },
      {
        q: "Paket seçiminde kararsızsam ne yapmalıyım?",
        a: "Kısa bir ön görüşmeyle birlikte değerlendirebiliriz. Öğrencinin matematik seviyesini, sınıfını ve hedefini konuşur, doğru başlangıcı netleştiririz.",
      },
    ],
  },
];

export const contact = {
  phone: "+90 537 795 44 34",
  email: "iletisim@onlinedershanem.com",
  whatsapp: "+90 537 795 44 34",
  address: "Yıldız Teknik Üniversitesi Davutpaşa Kampüsü"
};

export const seoKeywords = [
  "online dershanem",
  "online matematik dershanesi",
  "online matematik dersi",
  "matematik özel ders",
  "canlı matematik dersi",
  "butik matematik dersi",
  "tyt matematik",
  "ayt matematik",
  "lgs matematik",
  "matematik net artırma",
  "küçük grup matematik dersi",
  "google meet matematik dersi",
  "matematik eksik konu",
  "veliye gelişim takibi",
  "matematik ders paketi"
];

/**
 * Türkçe formattaki fiyat string'ini kuruşa çevirir.
 * Örnek: "₺1.500,00 / Ay" → 150000
 *        "1.500,00₺"     → 150000
 *        "3.290 TL"      → 329000
 */
export function parsePriceToCents(priceLabel: string | null | undefined): number {
  if (!priceLabel) return 0;
  // Sadece rakam, nokta (binlik) ve virgül (ondalık) bırak
  const cleaned = priceLabel.replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;

  // Türkçe format: "1.500,00" — nokta=binlik, virgül=ondalık
  let normalised = cleaned;
  if (cleaned.includes(",")) {
    // Türkçe formatlı: noktayı sil, virgülü noktaya çevir
    normalised = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Sadece nokta var — binlik ayraç olarak yorumla (örn "3.290")
    normalised = cleaned.replace(/\./g, "");
  }

  const tl = parseFloat(normalised);
  if (!isFinite(tl) || tl <= 0) return 0;
  return Math.round(tl * 100);
}

/**
 * Static katalogdaki paket fiyatını kuruş olarak döner. Bulamazsa 0.
 */
export function getPackagePriceCents(
  category: string,
  subject: string,
): number {
  for (const group of subjectPackageGroups) {
    for (const pkg of group.packages) {
      if (pkg.category === category && pkg.subject === subject) {
        // Açık priceCents tercih edilir; yoksa Türkçe etiketten parse edilir.
        return pkg.priceCents > 0
          ? pkg.priceCents
          : parsePriceToCents(pkg.discountedPrice);
      }
    }
  }
  return 0;
}
