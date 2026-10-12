/** Hazır not şablonları (öğretmenin kişisel şablonlarından önce gelir). */
export const BUILT_IN_TEMPLATES: Array<{ id: string; title: string; note: string; nextGoal: string; homework: string }> = [
  {
    id: "dengeli",
    title: "Dengeli ders şablonu",
    note: "Grup konuyu genel olarak kavradı; temel kazanımlar pekişiyor.",
    nextGoal: "Yeni nesil sorularda doğru stratejiyi seçmek.",
    homework: "Konu tarama çalışmasını tamamla ve yanlışlarını işaretle.",
  },
  {
    id: "destek",
    title: "Destek şablonu",
    note: "Temel adımlarda desteğe ihtiyaç var; birlikte örnek çözümü sürdüreceğiz.",
    nextGoal: "Temel işlem basamaklarını hatasız uygulamak.",
    homework: "Kolay düzey 15 soru çöz; takıldığın soruları işaretle.",
  },
  {
    id: "ileri",
    title: "İleri seviye",
    note: "Kazanımlar güçlü; hız ve farklı çözüm yollarına odaklanabiliriz.",
    nextGoal: "Zorlayıcı sorularda süreyi kontrollü kullanmak.",
    homework: "Orta-zor düzey 20 soru ve süre analizi.",
  },
];
